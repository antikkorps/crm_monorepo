#!/bin/bash

# ============================================
# OPEx_CRM - Deployment Helper Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed"
}

# Load environment variables
load_env() {
    if [ -f .env.production ]; then
        log_info "Loading environment variables..."
        export $(cat .env.production | grep -v '^#' | xargs)
        log_success "Environment variables loaded"
    else
        log_warning ".env.production not found. Using defaults."
    fi
}

# Show help
show_help() {
    cat << EOF
OPEx_CRM - Deployment Helper

Usage: ./deploy.sh [COMMAND]

Commands:
  build         Build Docker images
  start         Start all services
  stop          Stop all services
  restart       Restart all services
  logs          Show logs (follow mode)
  status        Show services status
  migrate       Run database migrations
  backup        Trigger manual backup
  clean         Clean up old images and volumes
  update        Pull latest images and restart
  shell-backend Open shell in backend container
  shell-db      Open PostgreSQL shell
  health        Check services health
  help          Show this help message

Examples:
  ./deploy.sh build
  ./deploy.sh start
  ./deploy.sh logs backend
  ./deploy.sh migrate

EOF
}

# Build images
build_images() {
    log_info "Building Docker images..."
    docker compose -f docker-compose.prod.yml build
    log_success "Images built successfully"
}

# Start services
start_services() {
    log_info "Starting services..."
    docker compose -f docker-compose.prod.yml up -d
    log_success "Services started"

    log_info "Waiting for services to be healthy..."
    sleep 10
    docker compose -f docker-compose.prod.yml ps
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    docker compose -f docker-compose.prod.yml down
    log_success "Services stopped"
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    docker compose -f docker-compose.prod.yml restart
    log_success "Services restarted"
}

# Show logs
show_logs() {
    if [ -n "$1" ]; then
        log_info "Showing logs for $1..."
        docker compose -f docker-compose.prod.yml logs -f "$1"
    else
        log_info "Showing logs for all services..."
        docker compose -f docker-compose.prod.yml logs -f
    fi
}

# Show status
show_status() {
    log_info "Services status:"
    docker compose -f docker-compose.prod.yml ps
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    docker compose -f docker-compose.prod.yml exec backend npm run db:migrate
    log_success "Migrations completed"
}

# Manual backup
manual_backup() {
    log_info "Triggering manual backup..."
    docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh
    log_success "Backup completed"
}

# Clean up
cleanup() {
    log_warning "This will remove unused images and volumes. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Cleaning up..."
        docker image prune -a -f
        docker volume prune -f
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# Update services
update_services() {
    log_info "Pulling latest images..."
    docker compose -f docker-compose.prod.yml pull

    log_info "Restarting services with new images..."
    docker compose -f docker-compose.prod.yml up -d

    log_success "Update completed"
}

# Backend shell
shell_backend() {
    log_info "Opening shell in backend container..."
    docker compose -f docker-compose.prod.yml exec backend sh
}

# Database shell
shell_db() {
    log_info "Opening PostgreSQL shell..."
    docker compose -f docker-compose.prod.yml exec postgres psql -U ${POSTGRES_USER:-medical_crm_user} -d ${POSTGRES_DB:-medical_crm}
}

# Health check
health_check() {
    log_info "Checking services health..."

    echo ""
    log_info "Docker containers:"
    docker compose -f docker-compose.prod.yml ps

    echo ""
    log_info "Testing endpoints..."

    # Check backend
    if curl -f -s http://localhost:3000/health > /dev/null; then
        log_success "Backend: healthy"
    else
        log_error "Backend: unhealthy"
    fi

    # Check if DOMAIN is set
    if [ -n "$FRONTEND_DOMAIN" ]; then
        if curl -f -s -k https://$FRONTEND_DOMAIN > /dev/null; then
            log_success "Frontend: healthy"
        else
            log_warning "Frontend: cannot reach https://$FRONTEND_DOMAIN"
        fi

        if curl -f -s -k https://api.$DOMAIN/health > /dev/null; then
            log_success "Backend API (public): healthy"
        else
            log_warning "Backend API: cannot reach https://api.$DOMAIN"
        fi
    fi
}

# Main script
main() {
    check_docker
    load_env

    case "${1:-help}" in
        build)
            build_images
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs "$2"
            ;;
        status)
            show_status
            ;;
        migrate)
            run_migrations
            ;;
        backup)
            manual_backup
            ;;
        clean)
            cleanup
            ;;
        update)
            update_services
            ;;
        shell-backend)
            shell_backend
            ;;
        shell-db)
            shell_db
            ;;
        health)
            health_check
            ;;
        help|*)
            show_help
            ;;
    esac
}

main "$@"
