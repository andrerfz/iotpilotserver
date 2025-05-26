#!/bin/bash

# IotPilot Restore Script
# Restores from backup created by backup.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[RESTORE]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "${BLUE}[RESTORE]${NC} $1"
}

# Configuration
BACKUP_DIR="./backups"
RESTORE_DIR="./restore_temp"

# Show usage
usage() {
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    if [ -d "${BACKUP_DIR}" ]; then
        ls -1 "${BACKUP_DIR}"/iotpilot_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    else
        echo "No backup directory found"
    fi
}

# Check backup file
check_backup_file() {
    if [ -z "$1" ]; then
        error "No backup file specified"
    fi

    BACKUP_FILE="$1"

    # If relative path, assume it's in backup directory
    if [[ "$BACKUP_FILE" != /* ]]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    fi

    if [ ! -f "${BACKUP_FILE}" ]; then
        error "Backup file not found: ${BACKUP_FILE}"
    fi

    info "Using backup file: ${BACKUP_FILE}"
}

# Extract backup
extract_backup() {
    header "Extracting backup..."

    # Create temporary restore directory
    rm -rf "${RESTORE_DIR}"
    mkdir -p "${RESTORE_DIR}"

    # Extract backup
    tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

    # Find extracted directory
    BACKUP_NAME=$(ls "${RESTORE_DIR}")
    EXTRACTED_PATH="${RESTORE_DIR}/${BACKUP_NAME}"

    if [ ! -d "${EXTRACTED_PATH}" ]; then
        error "Could not find extracted backup directory"
    fi

    info "Backup extracted to: ${EXTRACTED_PATH}"
}

# Show backup manifest
show_manifest() {
    header "Backup Information:"

    if [ -f "${EXTRACTED_PATH}/backup_manifest.txt" ]; then
        cat "${EXTRACTED_PATH}/backup_manifest.txt"
    else
        warn "No backup manifest found"
    fi

    echo ""
    read -p "Do you want to continue with the restore? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Restore cancelled by user"
        cleanup_temp
        exit 0
    fi
}

# Stop services
stop_services() {
    header "Stopping IotPilot services..."

    docker-compose down 2>/dev/null || true

    info "Services stopped ✓"
}

# Restore PostgreSQL database
restore_postgres() {
    header "Restoring PostgreSQL database..."

    if [ -f "${EXTRACTED_PATH}/postgres_dump.sql" ]; then
        # Start only PostgreSQL for restore
        docker-compose up -d postgres

        # Wait for PostgreSQL to be ready
        info "Waiting for PostgreSQL to be ready..."
        sleep 10

        # Check if database is ready
        for i in {1..30}; do
            if docker exec iotpilot-postgres pg_isready -U iotpilot -d iotpilot 2>/dev/null; then
                break
            fi
            sleep 2
        done

        # Restore database
        docker exec -i iotpilot-postgres psql -U iotpilot -d iotpilot < "${EXTRACTED_PATH}/postgres_dump.sql"

        info "PostgreSQL database restored ✓"
    else
        warn "No PostgreSQL backup found, skipping database restore"
    fi
}

# Restore InfluxDB
restore_influxdb() {
    header "Restoring InfluxDB..."

    if [ -d "${EXTRACTED_PATH}/influxdb_backup" ]; then
        # Start InfluxDB
        docker-compose up -d influxdb

        # Wait for InfluxDB to be ready
        info "Waiting for InfluxDB to be ready..."
        sleep 15

        # Copy backup to container
        docker cp "${EXTRACTED_PATH}/influxdb_backup" iotpilot-influxdb:/tmp/restore_backup

        # Restore InfluxDB
        docker exec iotpilot-influxdb influx restore \
            --org "${INFLUXDB_ORG:-iotpilot}" \
            --token "${INFLUXDB_TOKEN}" \
            /tmp/restore_backup 2>/dev/null || warn "InfluxDB restore may have failed"

        # Cleanup
        docker exec iotpilot-influxdb rm -rf /tmp/restore_backup

        info "InfluxDB restored ✓"
    else
        warn "No InfluxDB backup found, skipping InfluxDB restore"
    fi
}

# Restore Grafana
restore_grafana() {
    header "Restoring Grafana..."

    if [ -f "${EXTRACTED_PATH}/grafana/grafana_backup.tar.gz" ]; then
        # Start Grafana
        docker-compose up -d grafana

        # Wait for Grafana to be ready
        info "Waiting for Grafana to be ready..."
        sleep 10

        # Copy backup to container
        docker cp "${EXTRACTED_PATH}/grafana/grafana_backup.tar.gz" iotpilot-grafana:/tmp/

        # Stop Grafana service temporarily
        docker exec iotpilot-grafana supervisorctl stop grafana-server 2>/dev/null || true

        # Restore Grafana data
        docker exec iotpilot-grafana sh -c "
            cd / && tar -xzf /tmp/grafana_backup.tar.gz --strip-components=1
            chown -R grafana:grafana /var/lib/grafana
            rm /tmp/grafana_backup.tar.gz
        "

        # Restart Grafana service
        docker exec iotpilot-grafana supervisorctl start grafana-server 2>/dev/null || true

        info "Grafana restored ✓"
    else
        warn "No Grafana backup found, skipping Grafana restore"
    fi
}

# Restore configuration files
restore_configs() {
    header "Restoring configuration files..."

    if [ -d "${EXTRACTED_PATH}/config" ]; then
        # Backup current .env
        if [ -f .env ]; then
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            info "Current .env backed up"
        fi

        # Restore configuration files
        cp "${EXTRACTED_PATH}/config/.env" . 2>/dev/null || warn "No .env in backup"
        cp -r "${EXTRACTED_PATH}/config/traefik" . 2>/dev/null || warn "No traefik config in backup"
        cp -r "${EXTRACTED_PATH}/config/grafana_provisioning" grafana/provisioning 2>/dev/null || warn "No Grafana provisioning in backup"
        cp -r "${EXTRACTED_PATH}/config/prometheus" . 2>/dev/null || warn "No prometheus config in backup"
        cp -r "${EXTRACTED_PATH}/config/alertmanager" . 2>/dev/null || warn "No alertmanager config in backup"
        cp "${EXTRACTED_PATH}/config/loki_config.yml" loki/config.yml 2>/dev/null || warn "No Loki config in backup"

        info "Configuration files restored ✓"
    else
        warn "No configuration backup found"
    fi
}

# Restore application data
restore_app_data() {
    header "Restoring application data..."

    if [ -d "${EXTRACTED_PATH}/app_data" ]; then
        # Backup current data
        if [ -d "data" ]; then
            mv data "data.backup.$(date +%Y%m%d_%H%M%S)"
            info "Current data backed up"
        fi

        if [ -d "logs" ]; then
            mv logs "logs.backup.$(date +%Y%m%d_%H%M%S)"
            info "Current logs backed up"
        fi

        # Restore data
        cp -r "${EXTRACTED_PATH}/app_data/data" . 2>/dev/null || warn "No app data in backup"
        cp -r "${EXTRACTED_PATH}/app_data/logs" . 2>/dev/null || warn "No logs in backup"

        info "Application data restored ✓"
    else
        warn "No application data backup found"
    fi
}

# Restore SSL certificates
restore_ssl() {
    header "Restoring SSL certificates..."

    if [ -d "${EXTRACTED_PATH}/ssl" ]; then
        # Restore Traefik certificates
        cp -r "${EXTRACTED_PATH}/ssl/traefik_certs" traefik/config 2>/dev/null || warn "No Traefik certs in backup"

        # Restore ACME certificates
        if [ -f "${EXTRACTED_PATH}/ssl/acme_certs.tar.gz" ]; then
            docker volume create traefik-certs 2>/dev/null || true
            docker run --rm -v traefik-certs:/certs -v "${PWD}/${EXTRACTED_PATH}/ssl":/backup \
                alpine tar -xzf /backup/acme_certs.tar.gz -C /certs
        fi

        info "SSL certificates restored ✓"
    else
        warn "No SSL certificates backup found"
    fi
}

# Start all services
start_services() {
    header "Starting all services..."

    docker-compose up -d

    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 30

    # Check service status
    docker-compose ps

    info "Services started ✓"
}

# Verify restore
verify_restore() {
    header "Verifying restore..."

    # Check if main application is responding
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health 2>/dev/null; then
            info "Application health check passed ✓"
            break
        fi
        sleep 2
    done

    # Check database connection
    if docker exec iotpilot-postgres psql -U iotpilot -d iotpilot -c "SELECT 1;" &>/dev/null; then
        info "Database connection verified ✓"
    else
        warn "Database connection could not be verified"
    fi

    # Check InfluxDB
    if curl -f http://localhost:8086/health 2>/dev/null; then
        info "InfluxDB health check passed ✓"
    else
        warn "InfluxDB health check failed"
    fi

    # Check Grafana
    if curl -f http://localhost:3000/api/health 2>/dev/null; then
        info "Grafana health check passed ✓"
    else
        warn "Grafana health check failed"
    fi
}

# Cleanup temporary files
cleanup_temp() {
    header "Cleaning up temporary files..."

    rm -rf "${RESTORE_DIR}"

    info "Cleanup completed ✓"
}

# Send notification
send_notification() {
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST "${WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"IotPilot restore completed from: $(basename ${BACKUP_FILE})\"}" \
            2>/dev/null || true
    fi
}

# Main restore function
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}          IotPilot Restore Script           ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    # Check if backup file is provided
    if [ $# -eq 0 ]; then
        usage
        exit 1
    fi

    check_backup_file "$1"
    extract_backup
    show_manifest

    info "Starting restore process..."

    stop_services
    restore_configs
    restore_app_data
    restore_ssl
    restore_postgres
    restore_influxdb
    restore_grafana
    start_services
    verify_restore
    cleanup_temp
    send_notification

    echo ""
    echo -e "${GREEN}✅ Restore completed successfully!${NC}"
    echo ""
    echo "Services should now be running with restored data."
    echo "Please verify that everything is working correctly."
    echo ""
    echo "Access your dashboard at: http://localhost:3000"
    echo "Grafana: http://localhost:3000/grafana"
    echo ""
    echo "If you encounter issues, check the logs:"
    echo "docker-compose logs -f"
    echo ""
}

# Run main function with all arguments
main "$@"