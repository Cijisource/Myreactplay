# API Testing Guide

## Using cURL (Command Line)

### Test Health Check
```bash
curl http://localhost:5000/api/health
```

### Products

#### Get All Products
```bash
curl http://localhost:5000/api/products
```

#### Get All Products with Filtering
```bash
# Filter by category
curl "http://localhost:5000/api/products?category=Electronics"

# Search by name
curl "http://localhost:5000/api/products?search=headphones"

# Sort by price
curl "http://localhost:5000/api/products?sort=price-asc"
curl "http://localhost:5000/api/products?sort=price-desc"

# Combine filters
curl "http://localhost:5000/api/products?category=Electronics&sort=price-asc"
```

#### Get Single Product
```bash
curl http://localhost:5000/api/products/{PRODUCT_ID}
```

### Users

#### Register New User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Get User Profile
```bash
curl http://localhost:5000/api/users/{USER_ID}
```

#### Update User Profile
```bash
curl -X PUT http://localhost:5000/api/users/{USER_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "555-1234",
    "address": {
      "street": "123 Main St",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101",
      "country": "USA"
    }
  }'
```

### Cart

#### Get User Cart
```bash
curl http://localhost:5000/api/cart/{USER_ID}
```

#### Add Item to Cart
```bash
curl -X POST http://localhost:5000/api/cart/{USER_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product_id",
    "name": "Wireless Headphones",
    "price": 129.99,
    "quantity": 1,
    "image": "https://..."
  }'
```

#### Update Cart Item Quantity
```bash
curl -X PUT http://localhost:5000/api/cart/{USER_ID}/{PRODUCT_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2
  }'
```

#### Remove Item from Cart
```bash
curl -X DELETE http://localhost:5000/api/cart/{USER_ID}/{PRODUCT_ID}
```

#### Clear Entire Cart
```bash
curl -X DELETE http://localhost:5000/api/cart/{USER_ID}
```

### Orders

#### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "items": [
      {
        "productId": "product_id",
        "name": "Wireless Headphones",
        "price": 129.99,
        "quantity": 1
      }
    ],
    "total": 129.99,
    "shippingAddress": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "street": "123 Main St",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101"
    }
  }'
```

#### Get Order Details
```bash
curl http://localhost:5000/api/orders/{ORDER_ID}
```

#### Get User Orders
```bash
curl http://localhost:5000/api/orders/user/{USER_ID}
```

#### Update Order Status (Admin)
```bash
curl -X PUT http://localhost:5000/api/orders/{ORDER_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped"
  }'
```

## Using Postman

### Setup

1. **Download Postman** from https://www.postman.com/downloads/
2. **Create Collection** - File → New → Collection
3. **Create Requests** - Follow examples below

### Environment Variables

Create a Postman environment:
```json
{
  "baseUrl": "http://localhost:5000",
  "token": "",
  "userId": "",
  "productId": ""
}
```

### Example Requests

#### 1. Health Check
- **Method:** GET
- **URL:** `{{baseUrl}}/api/health`

#### 2. Register User
- **Method:** POST
- **URL:** `{{baseUrl}}/api/users/register`
- **Body (raw JSON):**
```json
{
  "email": "testuser@example.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "User"
}
```

#### 3. Login User
- **Method:** POST
- **URL:** `{{baseUrl}}/api/users/login`
- **Body:**
```json
{
  "email": "testuser@example.com",
  "password": "Test123!"
}
```
- **Tests (save response values):**
```javascript
if (pm.response.code === 200) {
  var jsonData = pm.response.json();
  pm.environment.set("token", jsonData.token);
  pm.environment.set("userId", jsonData.user.id);
}
```

#### 4. Get All Products
- **Method:** GET
- **URL:** `{{baseUrl}}/api/products`

#### 5. Add to Cart
- **Method:** POST
- **URL:** `{{baseUrl}}/api/cart/{{userId}}`
- **Body:**
```json
{
  "productId": "PRODUCT_ID_HERE",
  "name": "Product Name",
  "price": 99.99,
  "quantity": 1
}
```

#### 6. Create Order
- **Method:** POST
- **URL:** `{{baseUrl}}/api/orders`
- **Body:**
```json
{
  "userId": "{{userId}}",
  "items": [
    {
      "productId": "PRODUCT_ID",
      "name": "Product Name",
      "price": 99.99,
      "quantity": 1
    }
  ],
  "total": 99.99,
  "shippingAddress": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "street": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zipCode": "02101"
  }
}
```

## Using VS Code REST Client Extension

### Setup

1. **Install Extension:** REST Client
2. **Create file:** `requests.http`
3. **Write requests:**

```http
### Health Check
GET http://localhost:5000/api/health

### Get Products
GET http://localhost:5000/api/products

### Register User
POST http://localhost:5000/api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

### Login
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
POST http://localhost:5000/api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

### Add to Cart
POST http://localhost:5000/api/cart/USER_ID
Content-Type: application/json

{
  "productId": "PRODUCT_ID",
  "name": "Wireless Headphones",
  "price": 129.99,
  "quantity": 1
}
```

Click "Send Request" to test!

## Testing Workflow

### Complete User Journey

1. **Register**
   ```bash
   # Save the response user ID
   ```

2. **Login**
   ```bash
   # Save the token
   ```

3. **Browse Products**
   ```bash
   # Get all products, note a product ID
   ```

4. **Add to Cart**
   ```bash
   # Use User ID and Product ID from steps 1 & 3
   ```

5. **View Cart**
   ```bash
   # Verify items are in cart
   ```

6. **Create Order**
   ```bash
   # Use cart items and user info
   ```

7. **View Orders**
   ```bash
   # Confirm order was created
   ```

## Docker MongoDB Connection

If using Docker, connect to MongoDB:

```bash
# Open MongoDB shell in container
docker-compose exec mongodb mongosh

# List products
use ecommerce
db.products.find().pretty()

# Check users
db.users.find().pretty()

# Check orders
db.orders.find().pretty()
```

## Performance Testing (Apache Bench)

```bash
# Get product list (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:5000/api/products

# POST request (register)
ab -n 50 -c 5 -p payload.json \
  -T application/json \
  http://localhost:5000/api/users/register
```

## Common Issues

### CORS Errors
Check backend `.env`:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Invalid Token
Ensure token format is correct in Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Database Connection
Verify MongoDB is running:
```bash
docker ps | grep mongodb
# or
mongosh
```

### Port Conflicts
Check if ports are in use:
```bash
lsof -i :5000   # Backend
lsof -i :3000   # Frontend (Docker)
lsof -i :5173   # Frontend (Dev)
lsof -i :27017  # MongoDB
```

---

Happy Testing! 🧪
