# Quick Start Guide

Get the E-Commerce app running in minutes!

## Option 1: Docker Compose (Easiest)

```bash
# Make sure Docker and Docker Compose are installed
cd ecommercesql
docker-compose up --build
```

✅ Open http://localhost:3000 in your browser!

**First run will:**
- Build images
- Create containers
- Initialize SQLite database
- Load sample products

## Option 2: Local Development

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start
# Backend runs at http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm install
npm start
# Frontend runs at http://localhost:3000
```

## What You Can Do

### 👀 Browse Products
- Home page shows all products
- Filter by category on the left
- Click product for details and larger images

### 🔍 Search
- Use search bar in navigation
- Filter by price range
- Search across product names and descriptions

### 📸 Upload Photos
- Click "Upload Photos" in navigation
- Select a product
- Upload product images (JPEG, PNG, GIF, WebP)
- Delete images you don't want

### 🛒 Shopping Cart
- Add products from product details
- View cart by clicking cart icon
- Adjust quantities
- Remove items
- Click "Checkout" to place order

### 💳 Checkout
- Enter your info (name, email, address)
- Review order summary
- Click "Complete Purchase"
- Get order confirmation!

## Accessing the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Sample Products**: Already loaded in database

## Resetting Everything

```bash
# Stop all containers
docker-compose down

# Remove database (if using Docker)
docker volume rm ecommercesql_ecommerce-db

# Restart
docker-compose up
```

Or for local development:
```bash
# Delete the database file
rm backend/data/ecommerce.db

# Restart backend
cd backend && npm start
```

## Sample Products Available

These load automatically:
- Wireless Headphones ($99.99)
- USB-C Cable ($12.99)
- Cotton T-Shirt ($19.99)
- Denim Jeans ($49.99)
- LED Desk Lamp ($34.99)
- Yoga Mat ($29.99)
- Running Shoes ($79.99)
- React Guide ($39.99)
- JavaScript Patterns ($44.99)
- Phone Case ($14.99)

## Common Issues

**Port already in use?**
```bash
# Change port in backend/.env
PORT=5001

# Or kill process using port 5000
# Linux/Mac: lsof -ti:5000 | xargs kill -9
# Windows: netstat -ano | findstr :5000
```

**Database error?**
```bash
# Delete and recreate database
rm backend/data/ecommerce.db

# Restart backend
cd backend && npm start
```

**Can't upload images?**
```bash
# Ensure uploads directory exists
mkdir -p backend/uploads

# Check folder permissions
```

## Next Steps

1. ✅ App is running
2. 📦 Browse products
3. 🔍 Search and filter
4. 📸 Try uploading images
5. 🛒 Add items to cart
6. 💳 Complete checkout

Enjoy! 🎉
