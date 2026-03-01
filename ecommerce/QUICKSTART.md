# Quick Start Guide

Get the eCommerce application up and running in just a few minutes!

## For Windows Users

### Using Command Prompt

```batch
# 1. Navigate to project directory
cd ecommerce

# 2. Run setup script
setup.bat

# 3. Configure backend environment
cd backend
copy .env.example .env
# Edit .env with your settings

# 4. Start MongoDB (if not using Docker)
docker run -d -p 27017:27017 mongo

# 5. Start development servers
cd ..
npm run dev
```

### Using PowerShell

```powershell
# Same as above using PowerShell
```

## For macOS/Linux Users

```bash
# 1. Navigate to project directory
cd ecommerce

# 2. Run setup script
chmod +x setup.sh
./setup.sh

# 3. Configure backend environment
cd backend
cp .env.example .env
# Edit .env with your settings
nano .env

# 4. Start MongoDB (if not using Docker)
docker run -d -p 27017:27017 mongo

# 5. Start development servers
cd ..
npm run dev
```

## Using Docker (All Platforms)

The easiest way! Docker handles all dependencies.

```bash
# Navigate to project directory
cd ecommerce

# Start all services
docker-compose up --build

# In another terminal, seed the database (optional but recommended)
docker-compose exec backend npx ts-node src/seed.ts
```

That's it! Your application is ready:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

## First Time Setup Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB installed or Docker available
- [ ] environment file configured (backend/.env)
- [ ] Dependencies installed (`npm run install-all`)
- [ ] Database seeded with sample data
- [ ] Development servers started

## Common Commands

```bash
# View all available commands
make help

# Install dependencies
make install

# Start development
make dev

# Run with Docker
make docker-up

# Seed database
make seed

# Build for production
make build
```

## Environment Variables

### Backend Configuration (backend/.env)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_secret_key_here
STRIPE_SECRET_KEY=your_stripe_key
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Frontend Configuration (optional)

You can set the API URL in frontend/.env.local:
```env
VITE_API_URL=http://localhost:5000
```

## Troubleshooting

### Port Already in Use

**Windows:**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -ti :5000 | xargs kill -9
```

### MongoDB Connection Failed

Ensure MongoDB is running:
```bash
# Using Docker
docker run -d -p 27017:27017 mongo

# Using local installation
mongod
```

### Dependencies Installation Failed

Clear npm cache and retry:
```bash
npm cache clean --force
npm install
```

## Features Ready to Explore

- ✨ Product catalog with search
- 🛒 Shopping cart functionality
- 👤 User authentication
- 💳 Checkout process
- 📦 Order management
- ⭐ Product ratings

## Next Steps

1. **Browse Products** - Visit http://localhost:3000 or 5173
2. **Register Account** - Create a test account
3. **Add to Cart** - Try adding products to cart
4. **Checkout** - Complete a test order
5. **Explore API** - Check http://localhost:5000/api/health

## API Documentation

### Key Endpoints

- `GET /api/products` - Get all products
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `POST /api/orders` - Create order
- `GET /api/cart/:userId` - Get user cart

See [README.md](README.md) for complete API documentation.

## Need Help?

- 📖 Check [README.md](README.md)
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- 🤝 Review [CONTRIBUTING.md](CONTRIBUTING.md)
- 📝 Check backend logs: `docker-compose logs backend`
- 📝 Check frontend logs: Open browser dev tools (F12)

## Tips for Success

1. **Always seed the database** - Get sample products to work with
2. **Check the browser console** - Frontend errors show up there
3. **Use Docker** - Eliminates "works on my machine" problems
4. **Keep `.env` files in git** (they're in .gitignore) - They have sensitive info

---

Happy coding! 🚀
