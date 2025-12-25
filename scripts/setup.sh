#!/bin/bash

# NullStack Local Development Setup Script
# This script automates the setup of the NullStack development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_info "Starting NullStack development environment setup..."

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 20.x or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version must be 20.x or higher. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) is installed"

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm $(npm -v) is installed"

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker."
    exit 1
fi
print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) is installed"

if ! command_exists docker-compose; then
    if ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi
print_success "Docker Compose is installed"

# Check if Git is installed
if ! command_exists git; then
    print_error "Git is not installed. Please install Git."
    exit 1
fi
print_success "Git is installed"

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

print_info "Project root: $PROJECT_ROOT"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    print_success ".env file created"
else
    print_info ".env file already exists"
fi

# Install dependencies
print_info "Installing npm dependencies..."
npm install
print_success "Dependencies installed"

# Start Docker containers
print_info "Starting Docker containers for databases and infrastructure..."
$DOCKER_COMPOSE_CMD up -d postgres mongodb redis rabbitmq

# Wait for databases to be ready
print_info "Waiting for databases to be ready..."

# Wait for PostgreSQL
print_info "Waiting for PostgreSQL..."
until docker exec nullstack-postgres pg_isready -U nullstack >/dev/null 2>&1; do
    sleep 1
done
print_success "PostgreSQL is ready"

# Wait for MongoDB
print_info "Waiting for MongoDB..."
until docker exec nullstack-mongo mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
    sleep 1
done
print_success "MongoDB is ready"

# Wait for Redis
print_info "Waiting for Redis..."
until docker exec nullstack-redis redis-cli ping >/dev/null 2>&1; do
    sleep 1
done
print_success "Redis is ready"

# Wait for RabbitMQ
print_info "Waiting for RabbitMQ..."
until docker exec nullstack-rabbitmq rabbitmq-diagnostics ping >/dev/null 2>&1; do
    sleep 1
done
print_success "RabbitMQ is ready"

# Run database migrations
print_info "Running database migrations..."
npm run migrate
print_success "Database migrations completed"

# Build packages
print_info "Building shared packages..."
npm run build
print_success "Packages built"

print_success "Setup completed successfully!"

echo ""
print_info "Next steps:"
echo "1. Review and update .env file with your configuration"
echo "2. Start development servers with: npm run dev"
echo "3. Access the Developer Portal at: http://localhost:3100"
echo "4. Access the API Gateway at: http://localhost:3000"
echo "5. View RabbitMQ Management UI at: http://localhost:15672 (user: nullstack, pass: nullstack_dev_password)"
echo ""
print_info "Useful commands:"
echo "  npm run dev              - Start all services in development mode"
echo "  npm run build            - Build all services"
echo "  npm run test             - Run tests"
echo "  npm run docker:up        - Start all Docker containers"
echo "  npm run docker:down      - Stop all Docker containers"
echo "  npm run migrate          - Run database migrations"
echo ""
print_success "Happy coding!"
