@echo off
echo ========================================
echo Restarting Services with MongoDB Atlas
echo ========================================
echo.

echo Stopping all existing services...
taskkill /f /im node.exe 2>nul
taskkill /f /im cmd.exe 2>nul

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting services with MongoDB Atlas connection...
echo.

start "Auth Service" cmd /k "cd auth-service && npm start"
start "Encryption Service" cmd /k "cd encryption-service && npm start"
start "Security Audit" cmd /k "cd security-audit && npm start"
start "Sensor API" cmd /k "node sensor-api-server.js"
start "Decision Engine" cmd /k "cd decision-engine-service && npm start"
start "Data Processing" cmd /k "cd data-processing-service && npm start"
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo All services started with MongoDB Atlas connection!
echo.
echo Service URLs:
echo - Frontend: http://localhost:3000
echo - Auth Service: http://localhost:3001
echo - Encryption Service: http://localhost:3002
echo - Security Audit: http://localhost:3003
echo - Sensor API: http://localhost:3004
echo - Decision Engine: http://localhost:3005
echo - Data Processing: http://localhost:3006
echo.
echo Wait 10 seconds for services to connect to MongoDB Atlas...
echo Then check the service logs to confirm database connection.
echo.
pause
