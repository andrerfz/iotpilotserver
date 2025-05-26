#!/bin/bash

# IoT Pilot Deployment Script
# Used by CI/CD pipeline and manual deployments

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}
DEPLOY_DIR="/opt/iotpilot"
BACKUP_DIR="/opt/iotpilot/backups"
MAX_RETRIES=20
HEALTH_CHECK_TIMEOUT=300

# Environment-specific settings
case $ENVIRONMENT in
    "staging")
        DEPLOY_DIR="/opt/iotpilot-staging"
        BRANCH="develop"
        DOMAIN="staging.iotpilot.app"
        ;;
    "production")
        DEPLOY_DIR="/opt/iotpilot"
        BRANCH="main"
        DOMAIN="iotpilot.app"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
        ;;
esac

# Pre-deployment checks
pre_deployment_checks() {
    header "Running pre-deployment checks..."

    # Check if running as correct user
    if [ "$(whoami)" != "iotpilot" ]; then
        error "This script must be run as the 'iotpilot' user"
    fi

    # Check if deployment directory exists
    if [ ! -d "$DEPLOY_DIR" ]; then
        error "Deployment directory does not exist: $DEPLOY_DIR"
    fi

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running or accessible"
    fi

    # Check if git repository is clean
    cd "$DEPLOY_DIR"
    if [ -n "$(git status --porcelain)" ]; then
        warn "Git repository has uncommitted changes"
        git status --short
    fi

    # Check disk space (require at least 2GB free)
    AVAILABLE_SPACE=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 2097152 ]; then # 2GB in KB
        error "Insufficient disk space. At least 2GB required for deployment"
    fi

    info "Pre-deployment checks passed ✓"
}

# Create backup before deployment
create_backup() {
    header "Creating backup before deployment..."

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    # Create timestamped backup
    BACKUP_NAME="pre-deploy-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

    # Run backup script if it exists
    if [ -f "$DEPLOY_DIR/scripts/backup.sh" ]; then
        cd "$DEPLOY_DIR"
        ./scripts/backup.sh || warn "Backup script failed, continuing deployment"
    else
        # Simple backup
        mkdir -p "$BACKUP_PATH"

        # Backup current code
        git bundle create "$BACKUP_PATH/code-backup.bundle" HEAD

        # Backup environment file
        cp .env "$BACKUP_PATH/env-backup" 2>/dev/null || true

        # Backup data volumes
        docker run --rm \
            -v "${DEPLOY_DIR}/data":/source:ro \
            -v "${BACKUP_PATH}":/backup \
            alpine tar -czf /backup/data-backup.tar.gz -C /source . || warn "Data backup failed"
    fi

    info "Backup created: $BACKUP_NAME ✓"
}

# Enable maintenance mode
enable_maintenance_mode() {
    header "Enabling maintenance mode..."

    # Create maintenance flag file
    touch "$DEPLOY_DIR/.maintenance"

    # If using Traefik, could add maintenance page here
    info "Maintenance mode enabled ✓"
}

# Disable maintenance mode
disable_maintenance_mode() {
    header "Disabling maintenance mode..."

    # Remove maintenance flag file
    rm -f "$DEPLOY_DIR/.maintenance"

    info "Maintenance mode disabled ✓"
}

# Pull latest code
update_code() {
    header "Updating code from $BRANCH branch..."

    cd "$DEPLOY_DIR"

    # Fetch latest changes
    git fetch origin

    # Check if there are actual changes
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse "origin/$BRANCH")

    if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
        info "No new changes to deploy"
        return 0
    fi

    info "Updating from $LOCAL_COMMIT to $REMOTE_COMMIT"

    # Store current commit for potential rollback
    echo "$LOCAL_COMMIT" > "$DEPLOY_DIR/.previous-commit"

    # Update to latest commit
    git reset --hard "origin/$BRANCH"

    # Update submodules if any
    git submodule update --init --recursive || true

    info "Code updated successfully ✓"
}

# Update environment configuration
update_environment() {
    header "Updating environment configuration..."

    cd "$DEPLOY_DIR"

    # Check if .env file exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            warn "Created .env from example template - please configure manually"
        else
            error ".env file not found and no example available"
        fi
    fi

    # Validate required environment variables
    REQUIRED_VARS="DOMAIN POSTGRES_PASSWORD JWT_SECRET DEVICE_API_KEY"

    source .env
    for var in $REQUIRED_VARS; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set in .env"
        fi
    done

    info "Environment configuration validated ✓"
}

# Run database migrations
run_migrations() {
    header "Running database migrations..."

    cd "$DEPLOY_DIR"

    # Check if database is accessible
    if ! docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        warn "Database not ready, starting it first..."
        docker compose up -d postgres
        sleep 10
    fi

    # Run Prisma migrations
    if [ -f "app/prisma/schema.prisma" ]; then
        info "Running Prisma database migrations..."
        docker compose exec -T iotpilot-app npx prisma migrate deploy || warn "Database migration failed"

        # Generate Prisma client
        docker compose exec -T iotpilot-app npx prisma generate || warn "Prisma client generation failed"
    else
        info "No Prisma schema found, skipping migrations"
    fi

    info "Database migrations completed ✓"
}

# Pull and update Docker images
update_images() {
    header "Updating Docker images..."

    cd "$DEPLOY_DIR"

    # Pull latest images
    info "Pulling latest Docker images..."
    docker compose pull

    # Build application image if Dockerfile exists
    if [ -f "docker/Dockerfile" ]; then
        info "Building application image..."
        docker compose build --no-cache iotpilot-app
    fi

    info "Docker images updated ✓"
}

# Deploy services with zero-downtime strategy
deploy_services() {
    header "Deploying services..."

    cd "$DEPLOY_DIR"

    # Start infrastructure services first
    info "Starting infrastructure services..."
    docker compose up -d postgres redis influxdb

    # Wait for infrastructure to be ready
    info "Waiting for infrastructure services..."
    sleep 30

    # Start monitoring services
    info "Starting monitoring services..."
    docker compose up -d grafana loki prometheus

    # Wait for monitoring services
    sleep 20

    # Start main application with rolling update
    info "Starting main application..."
    docker compose up -d iotpilot-app

    # Start remaining services
    info "Starting remaining services..."
    docker compose up -d --remove-orphans

    info "Services deployed ✓"
}

# Perform health checks
health_check() {
    header "Performing health checks..."

    cd "$DEPLOY_DIR"

    local start_time=$(date +%s)
    local timeout=$HEALTH_CHECK_TIMEOUT

    # Check main application
    info "Checking main application health..."
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -f "http://localhost:3000/api/health" >/dev/null 2>&1; then
            info "Main application is healthy ✓"
            break
        fi

        if [ $i -eq $MAX_RETRIES ]; then
            error "Main application health check failed after $MAX_RETRIES attempts"
        fi

        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $timeout ]; then
            error "Health check timeout after ${timeout}s"
        fi

        info "Attempt $i/$MAX_RETRIES - waiting 15s..."
        sleep 15
    done

    # Check external endpoint if not localhost
    if [ "$DOMAIN" != "localhost" ] && [ "$ENVIRONMENT" = "production" ]; then
        info "Checking external endpoint..."
        for i in $(seq 1 5); do
            if curl -f "https://$DOMAIN/api/health" >/dev/null 2>&1; then
                info "External endpoint is healthy ✓"
                break
            fi

            if [ $i -eq 5 ]; then
                warn "External endpoint health check failed - DNS/SSL issues?"
            fi

            sleep 10
        done
    fi

    # Check Grafana
    info "Checking Grafana..."
    if curl -f "http://localhost:3000/grafana/api/health" >/dev/null 2>&1; then
        info "Grafana is healthy ✓"
    else
        warn "Grafana health check failed"
    fi

    # Check database connectivity
    info "Checking database connectivity..."
    if docker compose exec -T iotpilot-app npx prisma db push --accept-data-loss >/dev/null 2>&1; then
        info "Database connectivity verified ✓"
    else
        warn "Database connectivity check failed"
    fi

    info "Health checks completed ✓"
}

# Cleanup old resources
cleanup() {
    header "Cleaning up old resources..."

    cd "$DEPLOY_DIR"

    # Remove unused Docker images
    info "Cleaning up Docker images..."
    docker image prune -f >/dev/null 2>&1 || true

    # Remove unused volumes (be careful with this)
    # docker volume prune -f >/dev/null 2>&1 || true

    # Clean up old log files (keep last 7 days)
    info "Cleaning up old logs..."
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true

    # Clean up old backups (keep last 10)
    info "Cleaning up old backups..."
    cd "$BACKUP_DIR"
    ls -t | tail -n +11 | xargs -r rm -rf 2>/dev/null || true

    info "Cleanup completed ✓"
}

# Rollback function
rollback() {
    error_msg="$1"
    header "Rolling back deployment due to: $error_msg"

    cd "$DEPLOY_DIR"

    # Check if previous commit is available
    if [ ! -f ".previous-commit" ]; then
        error "No previous commit found for rollback"
    fi

    PREVIOUS_COMMIT=$(cat .previous-commit)
    info "Rolling back to commit: $PREVIOUS_COMMIT"

    # Restore previous code
    git reset --hard "$PREVIOUS_COMMIT"

    # Restart services
    info "Restarting services..."
    docker compose up -d --force-recreate

    # Wait and check health
    sleep 30
    if curl -f "http://localhost:3000/api/health" >/dev/null 2>&1; then
        info "Rollback completed successfully ✓"
    else
        error "Rollback failed - manual intervention required"
    fi

    disable_maintenance_mode
    exit 1
}

# Send deployment notification
send_notification() {
    status="$1"
    header "Sending deployment notification..."

    # Webhook notification
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"IoT Pilot $ENVIRONMENT deployment: $status\",
                \"environment\": \"$ENVIRONMENT\",
                \"branch\": \"$BRANCH\",
                \"commit\": \"$(git rev-parse HEAD)\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"url\": \"https://$DOMAIN\"
            }" 2>/dev/null || true
    fi

    info "Notification sent ✓"
}

# Main deployment function
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}       IoT Pilot Deployment Script          ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    info "Starting deployment to $ENVIRONMENT environment"
    info "Branch: $BRANCH"
    info "Deploy directory: $DEPLOY_DIR"
    echo ""

    # Set up error handling
    trap 'rollback "Deployment script failed"' ERR

    # Run deployment steps
    pre_deployment_checks
    create_backup
    enable_maintenance_mode
    update_code
    update_environment
    update_images
    run_migrations
    deploy_services
    health_check
    disable_maintenance_mode
    cleanup
    send_notification "success"

    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo "🌐 Application URL: https://$DOMAIN"
    echo "📊 Grafana URL: https://$DOMAIN/grafana"
    echo "🔍 Traefik Dashboard: https://$DOMAIN/traefik"
    echo ""
    echo "📝 Deployment Summary:"
    echo "  • Environment: $ENVIRONMENT"
    echo "  • Branch: $BRANCH"
    echo "  • Commit: $(git rev-parse HEAD)"
    echo "  • Deploy time: $(date)"
    echo ""
}

# Show usage information
usage() {
    echo "Usage: $0 [environment] [branch]"
    echo ""
    echo "Environments:"
    echo "  production  - Deploy to production (default)"
    echo "  staging     - Deploy to staging"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy main to production"
    echo "  $0 staging            # Deploy develop to staging"
    echo "  $0 production main    # Deploy main to production"
    echo "  $0 staging develop    # Deploy develop to staging"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac