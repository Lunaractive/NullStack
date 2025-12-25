#!/bin/bash

# NullStack Database Migration Runner
# This script runs database migrations for NullStack

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

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env" ]; then
    print_info "Loading environment variables from .env"
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
    print_error ".env file not found. Please create one from .env.example"
    exit 1
fi

# Database connection details
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_DB=${POSTGRES_DB:-nullstack}
POSTGRES_USER=${POSTGRES_USER:-nullstack}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-nullstack_dev_password}

# Migration directory
MIGRATION_DIR="$PROJECT_ROOT/packages/database/migrations"

print_info "Starting database migration..."
print_info "Host: $POSTGRES_HOST:$POSTGRES_PORT"
print_info "Database: $POSTGRES_DB"
print_info "User: $POSTGRES_USER"

# Check if psql is installed
if ! command -v psql >/dev/null 2>&1; then
    print_info "psql not found, attempting to use Docker..."

    # Try to use Docker container
    POSTGRES_CONTAINER="nullstack-postgres"

    if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
        print_error "PostgreSQL container is not running. Please start it with: docker-compose up -d postgres"
        exit 1
    fi

    print_info "Using PostgreSQL container: $POSTGRES_CONTAINER"

    # Run migrations in container
    for migration in "$MIGRATION_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            filename=$(basename "$migration")
            print_info "Running migration: $filename"

            docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$migration"

            print_success "Migration $filename completed"
        fi
    done
else
    # Use local psql
    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Test connection
    print_info "Testing database connection..."
    if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; then
        print_error "Failed to connect to database. Please check your configuration."
        exit 1
    fi
    print_success "Database connection successful"

    # Create migrations table if it doesn't exist
    print_info "Creating migrations tracking table..."
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
    print_success "Migrations table ready"

    # Run migrations
    for migration in "$MIGRATION_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            filename=$(basename "$migration")

            # Check if migration has already been run
            already_run=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE filename = '$filename';" | xargs)

            if [ "$already_run" -gt 0 ]; then
                print_info "Migration $filename already executed, skipping..."
                continue
            fi

            print_info "Running migration: $filename"

            # Run the migration
            psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration"

            # Record the migration
            psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "INSERT INTO schema_migrations (filename) VALUES ('$filename');"

            print_success "Migration $filename completed"
        fi
    done
fi

print_success "All migrations completed successfully!"

# Display migration history
print_info "Migration history:"
if command -v psql >/dev/null 2>&1; then
    export PGPASSWORD="$POSTGRES_PASSWORD"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM schema_migrations ORDER BY executed_at;"
else
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM schema_migrations ORDER BY executed_at;" 2>/dev/null || print_info "Migration history not available"
fi
