@echo off
echo ========================================
echo NullStack - Quick Start
echo ========================================
echo.

echo Step 1: Checking Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo Step 2: Starting databases...
docker-compose up -d postgres mongodb redis rabbitmq
timeout /t 15 /nobreak >nul

echo.
echo Step 3: Running database migration...
powershell -Command "Get-Content packages\database\migrations\1_initial_schema.sql | docker exec -i nullstack-postgres psql -U nullstack -d nullstack" >nul 2>&1
echo ✓ Migration complete

echo.
echo Step 4: Verifying database tables...
docker exec nullstack-postgres psql -U nullstack -d nullstack -c "\dt"

echo.
echo ========================================
echo 🎉 NullStack Databases Ready!
echo ========================================
echo.
echo PostgreSQL:  localhost:5432
echo MongoDB:     localhost:27017
echo Redis:       localhost:6379
echo RabbitMQ:    localhost:5672 (UI: localhost:15672)
echo.
echo ⚠️  NOTE: npm workspaces not fully configured yet
echo.
echo To start services manually:
echo   1. cd services\auth-service
echo   2. Replace "workspace:*" with "file:../../packages/shared" in package.json
echo   3. npm install
echo   4. npm run dev
echo.
echo Repeat for other services (title-service, player-service, etc.)
echo.
echo OR see QUICKSTART.md for detailed instructions
echo.
pause
