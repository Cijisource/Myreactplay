@echo off
REM =====================================================
REM SSL Quick Setup Script for Windows
REM =====================================================
REM Purpose: Generate SSL certificates and start Docker containers
REM Usage: Run this script from the project root directory
REM
REM Requirements:
REM   - PowerShell 5.0 or higher
REM   - OpenSSL (from Git Bash, WSL, or system)
REM   - Docker Desktop
REM   - Docker Compose

setlocal enabledelayedexpansion

cls
echo.
echo =====================================================
echo SSL Quick Setup for Property Management Application
echo =====================================================
echo.

REM Check if running from correct directory
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if ssl directory exists
if not exist "ssl" (
    echo Creating ssl directory...
    mkdir ssl
)

echo.
echo Checking prerequisites...
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('docker --version') do echo [OK] %%i
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Compose or use Docker Desktop
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('docker-compose --version') do echo [OK] %%i
)

REM Check OpenSSL
openssl version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] OpenSSL not found in PATH
    echo Will attempt to generate certificates with PowerShell
) else (
    for /f "tokens=*" %%i in ('openssl version') do echo [OK] %%i
)

echo.
echo =====================================================
echo Certificate Generation
echo =====================================================
echo.

REM Check if certificates already exist
if exist "ssl\nginx.crt" (
    echo [FOUND] Existing certificate detected
    echo.
    set /p "choice=Do you want to regenerate certificates? (y/n): "
    if /i not "!choice!"=="y" (
        echo Skipping certificate generation.
        goto docker-start
    )
    echo Removing old certificates...
    del /q ssl\nginx.crt >nul 2>&1
    del /q ssl\nginx.key >nul 2>&1
)

REM Try OpenSSL first
openssl version >nul 2>&1
if errorlevel 0 (
    echo Using OpenSSL to generate certificates...
    openssl req -x509 -newkey rsa:2048 -keyout ssl\nginx.key ^
        -out ssl\nginx.crt -days 365 -nodes -subj "/CN=localhost"
    
    if errorlevel 0 (
        echo [OK] Certificate generated successfully
    ) else (
        echo [ERROR] Failed to generate certificate with OpenSSL
        goto powershell-fallback
    )
) else (
    :powershell-fallback
    echo Using PowerShell to generate certificates...
    powershell -NoProfile -ExecutionPolicy Bypass -File "ssl\generate-certs.ps1"
    
    if errorlevel 1 (
        echo [ERROR] Failed to generate certificates
        echo For manual setup, see SSL_SETUP_GUIDE.md
        pause
        exit /b 1
    )
)

echo.
echo =====================================================
echo Verifying Certificate
echo =====================================================
echo.

if not exist "ssl\nginx.crt" (
    echo [ERROR] Certificate file not found: ssl\nginx.crt
    goto error-exit
)

if not exist "ssl\nginx.key" (
    echo [ERROR] Private key file not found: ssl\nginx.key
    goto error-exit
)

echo [OK] ssl\nginx.crt exists
echo [OK] ssl\nginx.key exists

REM Try to display certificate info
openssl x509 -in ssl\nginx.crt -noout -text >nul 2>&1
if errorlevel 0 (
    echo.
    echo Certificate Details:
    openssl x509 -in ssl\nginx.crt -noout -dates
    for /f "tokens=2" %%i in ('openssl x509 -in ssl\nginx.crt -noout -subject') do echo Subject: %%i
) else (
    echo [OK] Certificate files verified (cannot display details without OpenSSL)
)

:docker-start
echo.
echo =====================================================
echo Docker Container Setup
echo =====================================================
echo.

echo Starting Docker containers...
echo This may take a few minutes on first run...
echo.

docker-compose up -d

if errorlevel 1 (
    echo [ERROR] Failed to start Docker containers
    goto error-exit
)

echo.
echo Waiting for containers to start...
timeout /t 5 /nobreak

cls
echo.
echo =====================================================
echo ✓ SSL/TLS Setup Complete!
echo =====================================================
echo.
echo Your application is now running with HTTPS enabled!
echo.
echo Access URLs:
echo   - Frontend:     https://localhost
echo   - Backend API:  https://localhost/api
echo   - REST Client:  https://localhost
echo.
echo Browser Note:
echo   Since this is a self-signed certificate, your browser will show
echo   a security warning. This is expected. Click "Proceed" to continue.
echo.
echo Verify Containers:
echo   docker ps
echo.
echo View Logs:
echo   docker-compose logs -f
echo.
echo Stop Containers:
echo   docker-compose down
echo.
echo Next Steps:
echo   1. Open https://localhost in your browser
echo   2. Accept the security warning
echo   3. Test login with credentials from database scripts
echo   4. Review SSL_SETUP_GUIDE.md for production deployment
echo.
echo For custom domain (production):
echo   - See SSL_SETUP_GUIDE.md for Let's Encrypt setup
echo.
pause
exit /b 0

:error-exit
echo.
echo =====================================================
echo [ERROR] Setup Failed
echo =====================================================
echo.
echo For manual setup instructions, see: SSL_SETUP_GUIDE.md
echo.
pause
exit /b 1
