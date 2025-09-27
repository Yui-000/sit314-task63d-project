@echo off
echo Starting Smart Agriculture IoT System (Complete)...
echo.

echo Starting Authentication Service on port 3001...
start "Auth Service" cmd /k "cd auth-service && npm start"

echo Starting Encryption Service on port 3002...
start "Encryption Service" cmd /k "cd encryption-service && npm start"

echo Starting Security Audit Service on port 3003...
start "Security Audit" cmd /k "cd security-audit && npm start"

echo Starting Sensor API Server on port 3004...
start "Sensor API" cmd /k "node sensor-api-server.js"

echo Starting Decision Engine Service on port 3005...
start "Decision Engine" cmd /k "cd decision-engine-service && npm start"

echo Starting Data Processing Service on port 3006...
start "Data Processing" cmd /k "cd data-processing-service && npm start"

echo.
echo Starting Frontend on port 3000...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo All services starting...
echo - Authentication: http://localhost:3001
echo - Encryption: http://localhost:3002
echo - Security Audit: http://localhost:3003
echo - Sensor API: http://localhost:3004
echo - Decision Engine: http://localhost:3005
echo - Data Processing: http://localhost:3006
echo - Frontend: http://localhost:3000
echo.
echo Press any key to stop all services...
pause

echo Stopping services...
taskkill /f /im node.exe
taskkill /f /im cmd.exe
