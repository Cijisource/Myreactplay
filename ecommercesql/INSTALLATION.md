# Complete Installation Guide

Comprehensive setup instructions for the E-Commerce Platform.

## Prerequisites

### System Requirements
- Windows 10+, macOS 10.14+, or Linux (Ubuntu 20.04+)
- Minimum 2GB RAM
- 500MB free disk space
- Internet connection for downloading dependencies

### Required Software

#### Option 1: Using Docker (Recommended)
- Docker Desktop 4.0+
- Docker Compose 2.0+

**Installation:**
- **Windows/Mac**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow [official Docker docs](https://docs.docker.com/engine/install/)

Verify installation:
```bash
docker --version
docker-compose --version
```

#### Option 2: Local Development
- Node.js 18.0+
- npm 8.0+

**Installation:**
- Download from [Node.js website](https://nodejs.org/)
- Choose LTS version (18.x or higher)

Verify installation:
```bash
node --version
npm --version
```

---

## Installation Method 1: Docker (Easiest)

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/ecommercesql.git
cd ecommercesql
```

Or if you already have the code:
```bash
cd path/to/ecommercesql
```

### Step 2: Build and Start Services
```bash
# Build all images and start containers
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Step 3: Verify Setup
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Test backend health
curl http://localhost:5000/api/health
```

### Step 4: Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/health

## Installation Method 2: Local Development

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/ecommercesql.git
cd ecommercesql
```

### Step 2: Setup Backend

#### 2a. Navigate to Backend
```bash
cd backend
```

#### 2b. Install Dependencies
```bash
npm install
```

#### 2c. Configure Environment
```bash
# The .env file is already configured with defaults
# You can customize if needed:
# - PORT (default: 5000)
# - CORS_ORIGIN (default: http://localhost:3000)
# - NODE_ENV (default: development)
```

#### 2d. Initialize Database
```bash
# Database initializes automatically on first start
# Or manually initialize:
npm run init-db
```

#### 2e. Start Backend Server
```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev
```

Expected output:
```
Connected to SQLite database
Database schema initialized successfully
Sample data added successfully
E-commerce API running on port 5000
Health check: http://localhost:5000/api/health
```

### Step 3: Setup Frontend

#### 3a. Open New Terminal/Tab and Navigate to Frontend
```bash
cd frontend
```

#### 3b. Install Dependencies
```bash
npm install
```

#### 3c. Configure Environment (Optional)
```bash
# Create .env file if needed
echo REACT_APP_API_URL=http://localhost:5000/api > .env
```

#### 3d: Start Frontend Development Server
```bash
npm start
```

Expected output:
```
Compiled successfully!
Local: http://localhost:3000
```

### Step 4: Verify Setup
- Open http://localhost:3000 in browser
- Should see product catalog with sample data
- Open http://localhost:5000/api/health to verify backend

---

## Post-Installation Configuration

### 1. Database

#### Verify Database Created
```bash
# Check if database file exists
ls -la backend/data/ecommerce.db
```

#### Access Database CLI
```bash
cd backend
sqlite3 data/ecommerce.db

# Inside SQLite CLI:
.tables                    # List tables
SELECT * FROM products;    # View products
.exit                      # Exit
```

### 2. File Uploads

#### Create Uploads Directory
```bash
# Linux/Mac
mkdir -p backend/uploads

# Windows (PowerShell)
New-Item -ItemType Directory -Path .\backend\uploads -Force
```

#### Set Permissions (Linux/Mac)
```bash
chmod 755 backend/uploads
chmod 755 backend/data
```

### 3. Environment Variables

#### Production Setup
```bash
# Backend production config
cp backend/.env backend/.env.production
# Edit backend/.env.production with production values

# Frontend production config
cp frontend/.env.example frontend/.env.production
# Edit with production API URL
```

#### Development Setup
```bash
# Already configured, but you can customize:
# backend/.env
# frontend/.env (if created)
```

---

## Troubleshooting Installation

### Issue: "Port Already in Use"

**Symptom:** Error like "EADDRINUSE: address already in use :::5000"

**Solution:**

Linux/Mac:
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
# Change PORT in backend/.env to 5001
```

Windows (PowerShell):
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F

# Or use different port in .env
```

### Issue: "Database Locked"

**Symptom:** "database is locked" error

**Solution:**
```bash
# Ensure only one backend instance is running
# Check for stuck processes:
ps aux | grep node

# Kill any extra processes:
kill <PID>

# Delete and restart (will reinitialize):
rm backend/data/ecommerce.db
npm start
```

### Issue: "Module Not Found"

**Symptom:** "Cannot find module 'express'" or similar

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or in backend/frontend directories
cd backend && npm install
cd ../frontend && npm install
```

### Issue: "Cannot Upload Images"

**Symptom:** Image upload fails

**Solution:**
```bash
# Create uploads directory
mkdir -p backend/uploads

# Fix permissions (Linux/Mac)
chmod 777 backend/uploads

# Restart backend
npm start
```

### Issue: "Cannot Connect to API"

**Symptom:** Frontend can't reach backend API

**Solution:**
```bash
# Verify backend is running
curl http://localhost:5000/api/health

# Check CORS_ORIGIN in backend/.env
# Should be: CORS_ORIGIN=http://localhost:3000

# Check API URL in frontend
# Should be: http://localhost:5000/api
```

### Issue: "Database Schema Error"

**Symptom:** SQL errors when query

**Solution:**
```bash
# Delete database and recreate
rm backend/data/ecommerce.db

# Restart backend
npm start

# Verify database initialized:
# Should see "Database schema initialized" in logs
```

---

## Verification Checklist

After installation, verify everything works:

### Backend
- [ ] Backend starts without errors
- [ ] Health check returns 200: `curl http://localhost:5000/api/health`
- [ ] Database initialized: `ls backend/data/ecommerce.db`
- [ ] Sample products loaded: `curl http://localhost:5000/api/products`

### Frontend
- [ ] Frontend starts: `npm start` in frontend folder
- [ ] Homepage loads at http://localhost:3000
- [ ] Products display on page
- [ ] Search bar works
- [ ] Navigation menu visible

### Integration
- [ ] Can add product to cart
- [ ] Can view product details
- [ ] Can search products
- [ ] Can upload images

---

## Getting Help

### Check Logs
```bash
# Backend logs
docker-compose logs backend

# Frontend errors in browser console
# Press F12 to open Developer Tools

# Local development
# Terminal output shows errors
```

### Verify Configuration
```bash
# Backend .env
cat backend/.env

# Check Node version
node --version

# Check npm version
npm --version
```

### Check System
```bash
# Available ports
# Linux/Mac: lsof -i -P
# Windows: netstat -ano

# Disk space
df -h

# Process list for Node
ps aux | grep node
```

---

## Next Steps

After successful installation:

1. **Explore the App**
   - Browse products
   - View product details
   - Try search function

2. **Test Features**
   - Add items to cart
   - Upload product images
   - Complete a mock checkout

3. **Review Code**
   - Check [README.md](README.md)
   - Review [API.md](API.md)
   - Check [DATABASE.md](DATABASE.md)

4. **Customize**
   - Add more products
   - Modify styling
   - Add features

5. **Deploy**
   - Set up production environment
   - Configure database
   - Deploy to cloud platform

---

## Uninstallation

### Docker
```bash
# Stop containers
docker-compose down

# Remove volumes
docker-compose down -v

# Remove images (optional)
docker rmi ecommercesql-frontend ecommercesql-backend
```

### Local Installation
```bash
# Delete project directory
rm -rf ecommercesql

# Clean npm cache (optional)
npm cache clean --force
```

---

## Support Resources

- [README.md](README.md) - Project overview
- [QUICK_START.md](QUICK_START.md) - Quick setup guide
- [API.md](API.md) - API documentation
- [DATABASE.md](DATABASE.md) - Database guide
- [docker-compose.yml](docker-compose.yml) - Docker configuration

---

## System Specifications

### Minimum (Production)
- RAM: 2GB
- CPU: 2 cores
- Storage: 500MB
- Bandwidth: Basic (5Mbps+)

### Recommended (Development)
- RAM: 4GB+
- CPU: 4+ cores
- Storage: 2GB+
- Bandwidth: 10Mbps+

### Performance (Optimal)
- RAM: 8GB+
- CPU: 8 cores
- Storage: 10GB+ SSD
- Bandwidth: 100Mbps+

---

Congratulations! Your e-commerce platform is ready to use. 🎉
