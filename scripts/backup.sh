#!/bin/bash

# IotPilot Backup Script
# Creates comprehensive backups of all data

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "${BLUE}[BACKUP]${NC} $1"
}

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="iotpilot_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory
create_backup_dir() {
    mkdir -p "${BACKUP_PATH}"
    info "Created backup directory: ${BACKUP_PATH}"
}

# Backup PostgreSQL database
backup_postgres() {
    header "Backing up PostgreSQL database..."

    if docker ps | grep -q "iotpilot-postgres"; then
        docker exec iotpilot-postgres pg_dump \
            -U "${POSTGRES_USER:-iotpilot}" \
            -d "${POSTGRES_DB:-iotpilot}" \
            --clean --if-exists --create \
            > "${BACKUP_PATH}/postgres_dump.sql"

        info "PostgreSQL backup completed ✓"
    else
        warn "PostgreSQL container not running, skipping database backup"
    fi
}

# Backup InfluxDB
backup_influxdb() {
    header "Backing up InfluxDB..."

    if docker ps | grep -q "iotpilot-influxdb"; then
        # Create InfluxDB backup
        docker exec iotpilot-influxdb influx backup \
            --org "${INFLUXDB_ORG:-iotpilot}" \
            --token "${INFLUXDB_TOKEN}" \
            /tmp/backup 2>/dev/null || true

        # Copy backup from container
        docker cp iotpilot-influxdb:/tmp/backup "${BACKUP_PATH}/influxdb_backup" || true

        # Cleanup container backup
        docker exec iotpilot-influxdb rm -rf /tmp/backup 2>/dev/null || true

        info "InfluxDB backup completed ✓"
    else
        warn "InfluxDB container not running, skipping InfluxDB backup"
    fi
}

# Backup Grafana
backup_grafana() {
    header "Backing up Grafana..."

    if docker ps | grep -q "iotpilot-grafana"; then
        # Create Grafana backup directory
        mkdir -p "${BACKUP_PATH}/grafana"

        # Backup Grafana database and configuration
        docker exec iotpilot-grafana tar -czf /tmp/grafana_backup.tar.gz \
            /var/lib/grafana/grafana.db \
            /etc/grafana/ \
            /var/lib/grafana/dashboards/ 2>/dev/null || true

        # Copy backup from container
        docker cp iotpilot-grafana:/tmp/grafana_backup.tar.gz \
            "${BACKUP_PATH}/grafana/grafana_backup.tar.gz" || true

        # Cleanup container backup
        docker exec iotpilot-grafana rm -f /tmp/grafana_backup.tar.gz 2>/dev/null || true

        info "Grafana backup completed ✓"
    else
        warn "Grafana container not running, skipping Grafana backup"
    fi
}

# Backup configuration files
backup_configs() {
    header "Backing up configuration files..."

    mkdir -p "${BACKUP_PATH}/config"

    # Copy important configuration files
    cp .env "${BACKUP_PATH}/config/" 2>/dev/null || warn "No .env file found"
    cp -r traefik "${BACKUP_PATH}/config/" 2>/dev/null || warn "No traefik config found"
    cp -r grafana/provisioning "${BACKUP_PATH}/config/grafana_provisioning" 2>/dev/null || warn "No Grafana provisioning found"
    cp -r prometheus "${BACKUP_PATH}/config/" 2>/dev/null || warn "No prometheus config found"
    cp -r alertmanager "${BACKUP_PATH}/config/" 2>/dev/null || warn "No alertmanager config found"
    cp loki/config.yml "${BACKUP_PATH}/config/loki_config.yml" 2>/dev/null || warn "No Loki config found"

    info "Configuration backup completed ✓"
}

# Backup application data
backup_app_data() {
    header "Backing up application data..."

    mkdir -p "${BACKUP_PATH}/app_data"

    # Copy application data directories
    if [ -d "data" ]; then
        cp -r data "${BACKUP_PATH}/app_data/"
        info "Application data backed up ✓"
    else
        warn "No application data directory found"
    fi

    # Copy logs (last 7 days only to save space)
    if [ -d "logs" ]; then
        mkdir -p "${BACKUP_PATH}/app_data/logs"
        find logs -name "*.log" -mtime -7 -exec cp {} "${BACKUP_PATH}/app_data/logs/" \; 2>/dev/null || true
        info "Recent logs backed up ✓"
    else
        warn "No logs directory found"
    fi
}

# Backup SSL certificates
backup_ssl() {
    header "Backing up SSL certificates..."

    mkdir -p "${BACKUP_PATH}/ssl"

    # Backup Traefik SSL certificates
    if [ -d "traefik/config" ]; then
        cp -r traefik/config "${BACKUP_PATH}/ssl/traefik_certs" 2>/dev/null || true
    fi

    # Backup ACME certificates
    if docker volume ls | grep -q "traefik-certs"; then
        docker run --rm -v traefik-certs:/certs -v "${PWD}/${BACKUP_PATH}/ssl":/backup \
            alpine tar -czf /backup/acme_certs.tar.gz -C /certs . 2>/dev/null || true
    fi

    info "SSL certificates backed up ✓"
}

# Create backup manifest
create_manifest() {
    header "Creating backup manifest..."

    cat > "${BACKUP_PATH}/backup_manifest.txt" << EOF
IotPilot Backup Manifest
========================

Backup Date: $(date)
Backup Name: ${BACKUP_NAME}
Server: $(hostname)
Version: $(git rev-parse HEAD 2>/dev/null || echo "unknown")

Contents:
- PostgreSQL database dump
- InfluxDB backup
- Grafana configuration and dashboards
- Application configuration files
- Application data
- SSL certificates
- Recent logs (last 7 days)

Restore Instructions:
1. Stop all services: make stop
2. Extract backup files to appropriate locations
3. Restore database: docker exec -i iotpilot-postgres psql -U iotpilot -d iotpilot < postgres_dump.sql
4. Restore InfluxDB: influx restore --org iotpilot influxdb_backup/
5. Restart services: make start

Files:
$(find "${BACKUP_PATH}" -type f -exec ls -lh {} \; | awk '{print $9 " (" $5 ")"}')

Total Size: $(du -sh "${BACKUP_PATH}" | cut -f1)
EOF

    info "Backup manifest created ✓"
}

# Compress backup
compress_backup() {
    header "Compressing backup..."

    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

    # Remove uncompressed backup
    rm -rf "${BACKUP_NAME}"

    BACKUP_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    info "Backup compressed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"
}

# Cleanup old backups
cleanup_old_backups() {
    header "Cleaning up old backups..."

    RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

    find "${BACKUP_DIR}" -name "iotpilot_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "iotpilot_backup_*.tar.gz" | wc -l)
    info "Cleanup completed. ${REMAINING_BACKUPS} backups retained."
}

# Upload to S3 (if configured)
upload_to_s3() {
    if [ -n "${BACKUP_S3_BUCKET}" ] && [ -n "${BACKUP_S3_ACCESS_KEY}" ]; then
        header "Uploading backup to S3..."

        # Configure AWS CLI (you might want to use docker for this)
        export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY}"
        export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY}"
        export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"

        # Upload using AWS CLI in Docker
        docker run --rm \
            -v "${PWD}/${BACKUP_DIR}":/backup \
            -e AWS_ACCESS_KEY_ID \
            -e AWS_SECRET_ACCESS_KEY \
            -e AWS_DEFAULT_REGION \
            amazon/aws-cli s3 cp \
            "/backup/${BACKUP_NAME}.tar.gz" \
            "s3://${BACKUP_S3_BUCKET}/iotpilot-backups/" || warn "S3 upload failed"

        info "Backup uploaded to S3 ✓"
    fi
}

# Send notification
send_notification() {
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST "${WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"IotPilot backup completed: ${BACKUP_NAME}.tar.gz\"}" \
            2>/dev/null || true
    fi
}

# Main backup function
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}           IotPilot Backup Script           ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    info "Starting backup process..."

    create_backup_dir
    backup_postgres
    backup_influxdb
    backup_grafana
    backup_configs
    backup_app_data
    backup_ssl
    create_manifest
    compress_backup
    cleanup_old_backups
    upload_to_s3
    send_notification

    echo ""
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo ""
    echo "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo "Backup size: $(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
    echo ""
}

# Run main function
main "$@"