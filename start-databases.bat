@echo off
echo ========================================
echo NullStack - Starting Databases
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo Docker is running!
echo.

echo Starting PostgreSQL, MongoDB, Redis, and RabbitMQ...
docker-compose up -d postgres mongodb redis rabbitmq

echo.
echo Waiting for databases to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo Checking container status...
docker-compose ps

echo.
echo ========================================
echo Databases started successfully!
echo ========================================
echo.
echo PostgreSQL:  localhost:5432
echo MongoDB:     localhost:27017
echo Redis:       localhost:6379
echo RabbitMQ:    localhost:5672 (Management: localhost:15672)
echo.
echo Next steps:
echo 1. Run migrations: docker cp packages\database\migrations\1_initial_schema.sql nullstack-postgres:/tmp/ ^&^& docker exec nullstack-postgres psql -U nullstack -d nullstack -f /tmp/1_initial_schema.sql
echo 2. Install deps: npm install --legacy-peer-deps
echo 3. Start services individually (see QUICKSTART.md)
echo.
pause
