# E-Commerce Shopping Platform

A full-stack e-commerce application built with React, Node.js/Express, and SQLite. Features a complete shopping experience with product catalog, photo upload/viewer, search functionality, shopping cart, and checkout.

## Features

✨ **Product Catalog**
- Browse products by category
- Product detail views with multiple images
- In-stock status and inventory tracking

📸 **Photo Management**
- Upload product images directly
- Image gallery viewer with thumbnails
- Support for JPEG, PNG, GIF, and WebP formats
- Image deletion capability

🔍 **Search & Filtering**
- Full-text search across products
- Filter by category, price range
- Search history tracking
- Popular search trends

🛒 **Shopping Cart**
- Add/remove items
- Adjust quantities
- Cart session persistence
- Cart summary with totals

💳 **Checkout & Orders**
- Customer information collection
- Order creation and confirmation
- Order history tracking
- Order status management

🐳 **Docker Support**
- Docker Compose for easy deployment
- Separate frontend and backend containers
- Persistent volumes for database and uploads
- Production-ready configuration

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Responsive styling

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite3** - Lightweight database
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### DevOps
- **Docker** - Container platform
- **Docker Compose** - Multi-container orchestration

## Project Structure

```
ecommercesql/
├── frontend/                 # React application
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── styles/          # CSS files
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
│
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Data models
│   │   ├── middleware/      # Express middleware
│   │   ├── database/        # Database connection & initialization
│   │   └── server.js        # Express app setup
│   ├── uploads/             # Product image storage
│   ├── Dockerfile
│   ├── .env
│   └── package.json
│
├── database/                # Database scripts
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
│
├── docker-compose.yml       # Multi-container config
├── Dockerfile               # Production image
├── .dockerignore
├── .gitignore
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker & Docker Compose (optional)

### Local Development Setup

#### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd ecommercesql

# Backend setup
cd backend
npm install
cd ..

# Frontend setup
cd frontend
npm install
cd ..
```

#### 2. Configure Environment

Backend `.env` already includes default settings:
```
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

#### 3. Start Backend Server

```bash
cd backend
npm install
npm start
```

The backend will be available at `http://localhost:5000`

#### 4. Start Frontend (in a new terminal)

```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

### Database

The database is automatically initialized on first run:
- Creates all required tables
- Loads sample data (categories and products)
- Database file stored at `backend/data/ecommerce.db`

### Docker Setup

#### Using Docker Compose (Recommended)

```bash
# Build and run all services
docker-compose up --build

# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# API Docs: http://localhost:5000/api/health
```

#### Using Dockerfile

```bash
# Build the image
docker build -t ecommerce-app .

# Run the container
docker run -p 3000:3000 -p 5000:5000 ecommerce-app
```

## API Endpoints

### Products
- `GET /api/products` - Get all products with pagination
- `GET /api/products/:id` - Get product details with images
- `GET /api/products/categories/list` - Get all categories
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Search
- `GET /api/search?q=query` - Search products
- `GET /api/search/trends/popular` - Popular search terms

### Cart
- `GET /api/cart/:sessionId` - Get cart items
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/item/:cartItemId` - Update quantity
- `DELETE /api/cart/item/:cartItemId` - Remove item
- `DELETE /api/cart/:sessionId` - Clear cart

### Orders
- `POST /api/orders` - Create order from cart
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders/customer/:email` - Get customer orders
- `PUT /api/orders/:orderId/status` - Update order status
- `GET /api/orders` - Get all orders (admin)

### Photo Upload
- `POST /api/upload/image/:productId` - Upload product image
- `DELETE /api/upload/image/:imageId` - Delete product image

### Health Check
- `GET /api/health` - API health status

## Key Features Explained

### 1. Product Catalog
Browse all available products with filtering by category. Each product displays:
- Product name and description
- Price and stock status
- Product images (if available)
- Category information

### 2. Photo Management
Upload and manage product photos with:
- Multi-image upload per product
- Image preview
- Thumbnail generation
- Easy deletion
- Support for common image formats

### 3. Full-Text Search
Search products by:
- Product name
- Description
- Category
- Price range filtering
- Search query history tracking

### 4. Shopping Cart
Session-based shopping cart that:
- Persists using browser storage
- Tracks item quantities
- Shows real-time totals
- Validates stock availability

### 5. Checkout & Orders
Complete checkout experience with:
- Customer information collection
- Order confirmation
- Order number generation
- Order history tracking
- Status management

## Database Schema

### Tables
1. **categories** - Product categories
2. **products** - Product information
3. **product_images** - Product photos
4. **cart_items** - Shopping cart items
5. **orders** - Customer orders
6. **order_items** - Items in orders
7. **search_history** - Search queries

See `database/schema.sql` for detailed schema.

## Sample Data

The database includes sample data for testing:
- 5 product categories
- 10 sample products
- Price range: $12.99 - $99.99

Load additional data using SQL scripts in `database/` directory.

## Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Development mode with auto-restart
npm run dev

# Initialize database
npm run init-db
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Development server with hot reload
npm start

# Production build
npm run build
```

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (create .env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Troubleshooting

### Database Issues
- Delete `backend/data/ecommerce.db` to reset
- Check `backend/data/` directory exists
- Verify SQLite3 is properly installed

### Port Conflicts
- Change `PORT` in backend `.env`
- Change port mapping in frontend `package.json`
- Update Docker port mappings if using containers

### Image Upload Issues
- Ensure `backend/uploads/` directory is writable
- Check file size limits (10MB by default)
- Verify image MIME types are supported

### CORS Errors
- Update `CORS_ORIGIN` in backend `.env`
- Ensure frontend URL matches exactly

## Performance Optimization

- Database indexes on frequently searched columns
- Lazy loading of product images
- Pagination (12 items per page)
- Session-based carts to reduce server load
- Compressed responses with gzip

## Security Considerations

- SQL injection protection through parameterized queries
- CORS configuration for cross-origin requests
- Input validation on all API endpoints
- File upload validation (type and size)
- Error handling without exposing stack traces

## Future Enhancements

- User authentication and accounts
- Payment gateway integration
- Email notifications
- Advanced product filtering
- Wishlist feature
- Product reviews and ratings
- Admin dashboard
- Analytics and reporting
- Multi-language support
- Mobile app

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues, questions, or suggestions:
1. Check existing documentation
2. Review the API endpoints section
3. Check database schema for data structure
4. Review error messages in browser console and server logs

---

**Happy Shopping! 🛍️**
