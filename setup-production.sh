#!/bin/bash

# Production Environment Setup Script
# This script sets up the production environment for the Tempo AI Platform

set -e

echo "🚀 Setting up Tempo AI Platform Production Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }
    command -v docker >/dev/null 2>&1 || { print_error "Docker is required but not installed. Aborting."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { print_error "Docker Compose is required but not installed. Aborting."; exit 1; }
    
    print_success "All dependencies are installed"
}

# Create production environment file
create_env_file() {
    print_status "Creating production environment file..."
    
    if [ ! -f .env.production ]; then
        cp .env.production.example .env.production
        print_warning "Created .env.production from example. Please update with your actual values."
    else
        print_warning ".env.production already exists. Skipping creation."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    npm ci --production=false
    
    print_status "Installing backend dependencies..."
    cd backend
    npm ci --production=false
    cd ..
    
    print_success "Dependencies installed"
}

# Build the application
build_application() {
    print_status "Building frontend application..."
    npm run build
    
    print_status "Building backend application..."
    cd backend
    npm run build
    cd ..
    
    print_success "Application built successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Start database services
    docker-compose -f backend/docker-compose.yml up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    print_status "Running database migrations..."
    cd backend
    npm run migration:run
    cd ..
    
    print_success "Database setup completed"
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring services..."
    
    # Start monitoring services
    docker-compose -f backend/docker-compose.yml up -d prometheus grafana elasticsearch logstash kibana
    
    print_success "Monitoring services started"
}

# Generate SSL certificates (for production)
generate_ssl_certificates() {
    if [ "$1" = "--ssl" ]; then
        print_status "Generating SSL certificates..."
        
        # Create certificates directory
        mkdir -p ssl
        
        # Generate self-signed certificate (replace with proper SSL in production)
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/private.key \
            -out ssl/certificate.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        print_success "SSL certificates generated"
    fi
}

# Start production services
start_services() {
    print_status "Starting production services..."
    
    # Start all services
    docker-compose -f backend/docker-compose.yml up -d
    
    # Start frontend (in production, this would be served by nginx)
    print_status "Starting frontend server..."
    npm start &
    
    print_success "All services started"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for services to start
    sleep 15
    
    # Check backend health
    if curl -f http://localhost:3001/api/v1/health >/dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    # Check database
    if docker-compose -f backend/docker-compose.yml exec -T postgres pg_isready >/dev/null 2>&1; then
        print_success "Database is healthy"
    else
        print_error "Database health check failed"
        return 1
    fi
    
    print_success "All health checks passed"
}

# Display service URLs
display_urls() {
    echo ""
    echo "🎉 Tempo AI Platform is now running!"
    echo ""
    echo "📱 Frontend Application: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001"
    echo "📊 Grafana Dashboard: http://localhost:3002 (admin/admin)"
    echo "🔍 Kibana Logs: http://localhost:5601"
    echo "📈 Prometheus Metrics: http://localhost:9090"
    echo ""
    echo "📚 API Documentation: http://localhost:3001/api/docs"
    echo "🔧 Admin Panel: http://localhost:3000/admin"
    echo ""
    echo "🔐 Default Admin Credentials:"
    echo "   Email: admin@system.local"
    echo "   Password: admin123"
    echo ""
    echo "⚠️  Remember to:"
    echo "   1. Update .env.production with your actual API keys"
    echo "   2. Change default passwords"
    echo "   3. Configure SSL certificates for production"
    echo "   4. Set up proper backup procedures"
    echo ""
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker-compose -f backend/docker-compose.yml down
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "🤖 Tempo AI Platform Production Setup"
    echo "====================================="
    echo ""
    
    # Parse command line arguments
    SSL_ENABLED=false
    SKIP_BUILD=false
    SKIP_DB=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --ssl)
                SSL_ENABLED=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --ssl         Generate SSL certificates"
                echo "  --skip-build  Skip building the application"
                echo "  --skip-db     Skip database setup"
                echo "  --help        Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    # Execute setup steps
    check_dependencies
    create_env_file
    
    if [ "$SKIP_BUILD" = false ]; then
        install_dependencies
        build_application
    fi
    
    if [ "$SKIP_DB" = false ]; then
        setup_database
    fi
    
    setup_monitoring
    
    if [ "$SSL_ENABLED" = true ]; then
        generate_ssl_certificates --ssl
    fi
    
    start_services
    health_check
    display_urls
    
    # Keep script running
    print_status "Setup completed. Press Ctrl+C to stop all services."
    wait
}

# Run main function
main "$@"