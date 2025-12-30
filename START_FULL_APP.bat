@echo off
echo ===========================================
echo    AUREOLE - Starting Everything
echo ===========================================

:: 1. Start Backend (on port 3000)
echo [1/3] Starting Backend...
start cmd /k "title Backend Server && cd backend && npm run dev"

:: 2. Start Frontend (on port 3001)
echo [2/3] Starting Frontend...
start cmd /k "title React Frontend && cd frontend && npm start"

:: 3. Start Tunnel Manager (Auto-updates config)
echo [3/3] Starting Tunnel Manager...
start cmd /k "title Tunnel Manager && node tunnel-manager.js"

echo.
echo 🚀 All systems are launching in separate windows!
echo.
echo 📱 Backend: http://localhost:3000
echo 💻 Frontend: http://localhost:3001
echo 📡 Tunnel: Check the Localtunnel window for your public URL
echo.
echo Leave this window open to monitor the startup process.
pause
