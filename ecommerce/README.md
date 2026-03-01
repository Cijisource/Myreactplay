# E-Commerce Application

A full-stack Amazon-like e-commerce application built with React, Node.js, Express, MongoDB, and Docker.

## Features

✨ **Product Catalog**
- Browse products with search and filtering
- Product details modal
- Category-based browsing
- Product ratings and reviews

🛒 **Shopping Cart**
- Add/remove items from cart
- Adjust quantities
- Real-time cart updates
- Persistent cart state

👤 **User Authentication**
- User registration
- Login/logout
- JWT token-based authentication
- User profile management

💳 **Checkout & Orders**
- Secure checkout process
- Order tracking
- Shipping information
- Order history

📦 **Admin Features**
- Add/edit/delete products
- Manage inventory
- View orders
- Update order status

## Project Structure

```
ecommerce/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # MongoDB schemas
│   │   ├── config/          # Configuration
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile.frontend       # Frontend Docker image
├── Dockerfile.backend        # Backend Docker image
└── README.md

```

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite (build tool)
- React Router v6
- CSS3

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose ODM
- TypeScript
- JWT Authentication
- bcryptjs (password hashing)

### DevOps
- Docker
- Docker Compose
- MongoDB (containerized)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (optional)
- MongoDB (or use Docker)

### Installation

#### Option 1: Local Development

1. **Clone the repository**
```bash
cd ecommerce
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Set up environment variables**

Backend:
```bash
cd backend
cp .env.example .env
# Edit .env and add your configuration
```

4. **Start MongoDB**
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 mongo
```

5. **Start the application**
```bash
npm run dev
```

This will start both backend (port 5000) and frontend (port 5173) in development mode.

#### Option 2: Docker Compose

1. **Start all services**
```bash
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

2. **Stop all services**
```bash
docker-compose down
```

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/user/:userId` - Get user orders
- `PUT /api/orders/:id` - Update order status (admin)

### Cart
- `GET /api/cart/:userId` - Get user cart
- `POST /api/cart/:userId` - Add item to cart
- `PUT /api/cart/:userId/:productId` - Update cart item
- `DELETE /api/cart/:userId/:productId` - Remove from cart
- `DELETE /api/cart/:userId` - Clear cart

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend (Vite)
Create `.env.local` in frontend folder:
```
VITE_API_URL=http://localhost:5000
```

## Development

### Frontend Development
```bash
cd frontend
npm run dev
```

### Backend Development
```bash
cd backend
npm run dev
```

### Building for Production
```bash
npm run build
```

## Database Seeding

To seed the database with sample products, you can use the MongoDB shell:

```javascript
db.products.insertMany([
  {
    name: "Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 129.99,
    category: "Electronics",
    stock: 50,
    rating: 4.5,
    reviews: 234
  },
  {
    name: "USB-C Cable",
    description: "3m USB-C charging and data cable",
    price: 19.99,
    category: "Accessories",
    stock: 200,
    rating: 4,
    reviews: 512
  }
  // Add more products...
])
```

## Docker Compose Services

### MongoDB
- Container: `ecommerce-mongodb`
- Port: 27017
- Username: admin
- Password: password

### Backend API
- Container: `ecommerce-backend`
- Port: 5000
- API: http://localhost:5000

### Frontend
- Container: `ecommerce-frontend`
- Port: 3000
- App: http://localhost:3000

## Troubleshooting

### Port already in use
```bash
# Kill process on port 5000 (backend)
lsof -ti :5000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti :3000 | xargs kill -9
```

### MongoDB connection error
Ensure MongoDB is running and connection string is correct in `.env`

### Frontend API connection error
Verify backend is running on http://localhost:5000 and CORS is properly configured

## Production Deployment

1. **Build Docker images**
```bash
docker-compose build
```

2. **Push to registry** (e.g., Docker Hub)
```bash
docker tag ecommerce-frontend:latest your-repo/ecommerce-frontend:latest
docker push your-repo/ecommerce-frontend:latest
```

3. **Deploy to cloud** (AWS ECS, GCP Cloud Run, etc.)

## Security Considerations

- ⚠️ Change default MongoDB credentials in docker-compose.yml
- ⚠️ Change JWT_SECRET to a secure random string
- ⚠️ Use HTTPS in production
- ⚠️ Implement rate limiting
- ⚠️ Add input validation and sanitization
- ⚠️ Use environment variables for sensitive data

## Future Enhancements

- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] Advanced search with Elasticsearch
- [ ] Product recommendations
- [ ] User reviews and ratings system
- [ ] Wishlist feature
- [ ] Multi-language support
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Real-time notifications
- [ ] Product images upload
- [ ] Inventory management system

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

## License

MIT License

## Support

For issues and questions, please open an issue on the GitHub repository.

---

**Happy Shopping! 🛍️**
