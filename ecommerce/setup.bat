@echo off
echo.
echo 🚀 E-Commerce Application Setup for Windows
echo ===========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

echo ✓ Node.js version: 
node --version

REM Check if Docker is installed (optional)
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Docker is installed: 
    docker --version
) else (
    echo ⚠️  Docker is not installed (optional, needed for containerized deployment)
)

echo.
echo Installing dependencies...
echo.

REM Install root dependencies
call npm install

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ✓ All dependencies installed successfully!
echo.
echo Next steps:
echo 1. Configure environment variables:
echo    - Backend: backend\.env
echo    - Frontend: frontend\.env (optional)
echo.
echo 2. Start MongoDB (if not using Docker):
echo    docker run -d -p 27017:27017 mongo
echo.
echo 3. Start the application:
echo    npm run dev          (Local development)
echo    docker-compose up    (Docker deployment)
echo.
echo Happy coding! 🎉
