# Architecture Guide

## Application Architecture

This eCommerce application follows a modern **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Frontend)                     │
│                                                                   │
│  React + TypeScript + React Router (Vite)                        │
│  - Product Browsing                                              │
│  - Shopping Cart Management                                      │
│  - User Authentication UI                                        │
│  - Checkout & Order History                                      │
└─────────────────────────────────────────┬───────────────────────┘
                                          │ HTTP/HTTPS
                                          │ REST API
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Backend)                   │
│                                                                   │
│  Express.js + Node.js (TypeScript)                               │
│  - API Route Handlers                                            │
│  - Business Logic                                                │
│  - Authentication (JWT)                                          │
│  - Request Validation                                            │
│  - Error Handling                                                │
└─────────────────────────────────────────┬───────────────────────┘
                                          │ MongoDB
                                          │ Driver
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (Database)                       │
│                                                                   │
│  MongoDB + Mongoose                                              │
│  - Products Collection                                           │
│  - Users Collection                                              │
│  - Orders Collection                                             │
│  - Indexes & Queries                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── ProductCard.tsx       # Individual product display
│   │   ├── Cart.tsx              # Shopping cart view
│   │   ├── Navbar.tsx            # Navigation bar
│   │   ├── Login.tsx             # Login form
│   │   ├── Register.tsx          # Registration form
│   │   └── Checkout.tsx          # Checkout form
│   ├── App.tsx              # Main app component with routing
│   ├── App.css              # Global styles
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript configuration
```

### Backend Structure

```
backend/
├── src/
│   ├── server.ts            # Express app setup
│   ├── config/
│   │   └── database.ts           # MongoDB connection
│   ├── models/              # Mongoose schemas
│   │   ├── Product.ts            # Product model
│   │   ├── User.ts               # User model
│   │   └── Order.ts              # Order model
│   ├── routes/              # API endpoints
│   │   ├── products.ts           # /api/products
│   │   ├── users.ts              # /api/users
│   │   ├── orders.ts             # /api/orders
│   │   └── cart.ts               # /api/cart
│   └── seed.ts              # Database seeding
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
└── .env                     # Environment variables
```

## Data Models

### Product Model
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  image: String,
  category: String,
  stock: Number,
  rating: Number,
  reviews: Number,
  createdAt: Date
}
```

### User Model
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  createdAt: Date
}
```

### Order Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  items: [{
    productId: ObjectId,
    name: String,
    price: Number,
    quantity: Number
  }],
  total: Number,
  status: String (pending|processing|shipped|delivered),
  shippingAddress: {
    name: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  createdAt: Date
}
```

## API Routes

### Products API
```
GET     /api/products              - Get all products (with filters)
GET     /api/products/:id          - Get product details
POST    /api/products              - Create product (admin)
PUT     /api/products/:id          - Update product (admin)
DELETE  /api/products/:id          - Delete product (admin)
```

### Users API
```
POST    /api/users/register        - Register new user
POST    /api/users/login           - Login user (returns JWT)
GET     /api/users/:id             - Get user profile
PUT     /api/users/:id             - Update user profile
```

### Orders API
```
POST    /api/orders                - Create new order
GET     /api/orders/:id            - Get order details
GET     /api/orders/user/:userId   - Get user's orders
PUT     /api/orders/:id            - Update order status (admin)
```

### Cart API
```
GET     /api/cart/:userId          - Get user's cart
POST    /api/cart/:userId          - Add item to cart
PUT     /api/cart/:userId/:productId - Update cart item quantity
DELETE  /api/cart/:userId/:productId - Remove item from cart
DELETE  /api/cart/:userId          - Clear entire cart
```

## Authentication Flow

```
1. User Registration
   ┌─────────────┐
   │   User      │
   │ Registration│ ──POST─→ /api/users/register
   │   Form      │          {email, password, name}
   └─────────────┘
                    ├─→ Hash password (bcryptjs)
                    ├─→ Create User document
                    └─→ Return success message

2. User Login
   ┌─────────────┐
   │   Login     │         ┌──────────────────────┐
   │   Form      │ ──POST─→ /api/users/login     │
   │             │         {email, password}      │
   └─────────────┘         └────────┬─────────────┘
        ▲                           │
        │                      Verify password
        │                           │
        └─────────JWT Token◄────────┘
              Stored in localStorage

3. Protected Requests
   Frontend                    Backend
   ┌──────────────┐          ┌───────────────┐
   │ Send request │ Header:  │ Verify JWT    │
   │ with JWT     │ Auth:... │ token         │
   └──────────────┤          ├───────────────┘
                  │ ────────→ │ Allow/Deny
                  │ ←────────│
                  │ Response │
```

## Request/Response Cycle

### Example: Get Products

```
Frontend (React)                Backend (Express)
    │                                  │
    │  GET /api/products               │
    ├─────────────────────────────────→│
    │                          Query DB │
    │                                  │
    │    ✓ 200 OK                      │
    │    [{products...}]               │
    │←─────────────────────────────────┤
    │                                  │
    Update state                       │
    Re-render UI                       │
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Status Codes
- `200` - OK (Success)
- `201` - Created (Resource created)
- `400` - Bad Request (Invalid input)
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Not authorized)
- `404` - Not Found
- `500` - Server Error

## Security Considerations

### Frontend Security
- JWT tokens stored in localStorage
- CORS enabled for safe cross-origin requests
- Input validation before submission
- XSS prevention through React escaping

### Backend Security
- Password hashing with bcryptjs (10 salt rounds)
- JWT authentication for protected routes
- Input validation and sanitization
- Error messages don't expose sensitive info
- CORS whitelist configuration

### Database Security
- MongoDB user authentication (if configured)
- Indexes on frequently queried fields
- Connection pooling with Mongoose
- Environment variables for sensitive data

## Performance Optimization

### Frontend
- Code splitting with React Router
- Lazy loading of components
- CSS optimization with Vite
- Image optimization with placeholders

### Backend
- Database indexes on:
  - `products.category`
  - `products.name` (text search)
  - `users.email` (unique)
  - `orders.userId`
- Query optimization with Mongoose
- Connection pooling
- Caching strategies

### Deployment
- Docker containerization
- Multi-stage Docker builds (smaller images)
- Docker Compose for orchestration
- Environment-based configuration

## Scaling Strategy

### Horizontal Scaling
1. Deploy multiple backend instances
2. Use load balancer (Nginx, AWS ALB)
3. Separate session store (Redis)
4. Database read replicas

### Vertical Scaling
1. Increase server resources
2. Optimize queries and indexes
3. Implement caching layer (Redis)
4. CDN for static assets

### Database Scaling
1. MongoDB Atlas auto-scaling
2. Database sharding for large data
3. Read replicas for high-traffic reads
4. Archiving old orders

## Deployment Topology

### Development
```
Your Computer
├── Frontend (5173)
├── Backend (5000)
└── MongoDB (27017)
```

### Docker
```
Docker Host
├── Container: Frontend (3000)
├── Container: Backend (5000)
└── Container: MongoDB (27017)
```

### Production (AWS)
```
AWS Region
├── ALB (Load Balancer)
│   ├── EC2: Frontend (x3)
│   └── EC2: Backend (x3)
└── RDS/DocumentDB: MongoDB
```

## Technology Decision Matrix

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + TypeScript | Type safety, component reusability, large ecosystem |
| Routing | React Router v6 | Industry standard, excellent documentation |
| Backend | Express.js | Lightweight, flexible, widely used |
| Language | TypeScript | Type safety, better IDE support, catch errors early |
| Database | MongoDB | Flexible schema, JSON-like documents, good for eCommerce |
| ODM | Mongoose | Schema validation, middleware support, popular |
| Authentication | JWT | Stateless, scalable, works well with microservices |
| Build Tool | Vite | Fast dev server, optimized builds, modern tooling |
| Containerization | Docker | Consistency across environments, easy deployment |
| Orchestration | Docker Compose | Simple local development, multi-container management |

---

For more details, see [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md)
