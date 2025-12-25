@echo off
echo ========================================
echo NullStack - Stopping Databases
echo ========================================
echo.

docker-compose down

echo.
echo Databases stopped!
echo.
echo To remove all data (WARNING - DELETES EVERYTHING):
echo docker-compose down -v
echo.
pause
