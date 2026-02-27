#!/bin/bash
# =====================================================
# SSL Quick Setup Script for Linux/WSL/Git Bash
# =====================================================
# Purpose: Generate SSL certificates and start Docker containers
# Usage: chmod +x setup-ssl.sh && ./setup-ssl.sh
#
# Requirements:
#   - Docker and Docker Compose
#   - OpenSSL
#   - Bash/Linux/WSL

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_file() {
    if [ ! -f "$1" ]; then
        print_error "$1 not found!"
        print_error "Please run this script from the project root directory."
        exit 1
    fi
}

# Main script
clear
print_header "SSL Quick Setup for Property Management Application"

# Check we're in the right directory
check_file "docker-compose.yml"

# Create ssl directory
if [ ! -d "ssl" ]; then
    echo "Creating ssl directory..."
    mkdir -p ssl
fi

print_header "Checking Prerequisites"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    echo "Install Docker: https://docs.docker.com/engine/install/"
    exit 1
fi
print_ok "$(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    echo "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
print_ok "$(docker-compose --version)"

# Check OpenSSL
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL is not installed"
    echo "Install OpenSSL: sudo apt-get install openssl (Ubuntu/Debian) or brew install openssl (macOS)"
    exit 1
fi
print_ok "$(openssl version)"

print_header "Certificate Generation"

# Check if certificates already exist
if [ -f "ssl/nginx.crt" ] && [ -f "ssl/nginx.key" ]; then
    print_warning "Existing certificate detected"
    read -p "Regenerate certificates? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping certificate generation."
        goto_docker_start=true
    fi
    echo "Removing old certificates..."
    rm -f ssl/nginx.crt ssl/nginx.key
fi

if [ "$goto_docker_start" != true ]; then
    echo "Generating self-signed certificate..."
    echo "Subject: CN=localhost"
    echo "Valid for: 365 days"
    echo "Algorithm: RSA 2048-bit"
    echo ""
    
    openssl req -x509 \
        -newkey rsa:2048 \
        -keyout ssl/nginx.key \
        -out ssl/nginx.crt \
        -days 365 \
        -nodes \
        -subj "/CN=localhost"
    
    if [ $? -eq 0 ]; then
        print_ok "Certificate generated successfully"
    else
        print_error "Failed to generate certificate"
        exit 1
    fi
    
    # Set permissions
    chmod 600 ssl/nginx.key
    chmod 644 ssl/nginx.crt
    print_ok "Permissions set correctly"
fi

print_header "Verifying Certificate"

if [ ! -f "ssl/nginx.crt" ]; then
    print_error "Certificate file not found: ssl/nginx.crt"
    exit 1
fi

if [ ! -f "ssl/nginx.key" ]; then
    print_error "Private key file not found: ssl/nginx.key"
    exit 1
fi

print_ok "ssl/nginx.crt exists"
print_ok "ssl/nginx.key exists"

echo ""
echo "Certificate Details:"
openssl x509 -in ssl/nginx.crt -noout -dates
openssl x509 -in ssl/nginx.crt -noout -subject

print_header "Docker Container Setup"

echo "Starting Docker containers..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose up -d

if [ $? -ne 0 ]; then
    print_error "Failed to start Docker containers"
    exit 1
fi

echo ""
echo "Waiting for containers to start..."
sleep 5

clear
print_header "✓ SSL/TLS Setup Complete!"

echo -e "Your application is now running with HTTPS enabled!\n"

echo -e "${YELLOW}Access URLs:${NC}"
echo "  - Frontend:     https://localhost"
echo "  - Backend API:  https://localhost/api"
echo "  - REST Client:  https://localhost"
echo ""

echo -e "${YELLOW}Browser Note:${NC}"
echo "  Since this is a self-signed certificate, your browser will show"
echo "  a security warning. This is expected. Click \"Proceed\" to continue."
echo ""

echo -e "${YELLOW}Verify Containers:${NC}"
echo "  docker ps"
echo ""

echo -e "${YELLOW}View Logs:${NC}"
echo "  docker-compose logs -f"
echo ""

echo -e "${YELLOW}Stop Containers:${NC}"
echo "  docker-compose down"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open https://localhost in your browser"
echo "  2. Accept the security warning"
echo "  3. Test login with credentials from database scripts"
echo "  4. Review SSL_SETUP_GUIDE.md for production deployment"
echo ""

echo -e "${YELLOW}For Custom Domain (Production):${NC}"
echo "  See SSL_SETUP_GUIDE.md for Let's Encrypt setup"
echo ""
