# API Documentation

Complete reference for all E-Commerce API endpoints.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, the API does not require authentication. Consider adding JWT tokens for production.

## Response Format

All responses return JSON with standard format:

**Success Response (2xx)**
```json
{
  "data": {},
  "message": "Operation successful"
}
```

**Error Response (4xx, 5xx)**
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Endpoints

### Health Check

#### GET /health
Check if API is running.

**Response:**
```json
{
  "status": "ok",
  "message": "E-commerce API is running"
}
```

---

## Products

### GET /products
Get all products with pagination and filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 12 | Items per page |
| category | number | - | Filter by category ID |
| sortBy | string | created_at | Sort field |
| order | string | DESC | ASC or DESC |

**Example:**
```bash
GET /products?page=1&limit=12&category=1&sortBy=price&order=ASC
```

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "description": "High-quality wireless headphones",
      "category_id": 1,
      "category_name": "Electronics",
      "price": 99.99,
      "stock": 50,
      "sku": "WH-001",
      "images": ["/uploads/product-001.jpg"]
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 12,
  "pages": 9
}
```

### GET /products/:id
Get product details with all images.

**Parameters:**
- `id` (required): Product ID

**Response:**
```json
{
  "id": 1,
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones",
  "category_id": 1,
  "category_name": "Electronics",
  "price": 99.99,
  "stock": 50,
  "sku": "WH-001",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "images": [
    {
      "id": 1,
      "product_id": 1,
      "image_url": "/uploads/product-001.jpg",
      "filename": "product-001.jpg",
      "thumbnail_url": null
    }
  ]
}
```

### GET /products/categories/list
Get all product categories.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "description": "Electronic devices and gadgets"
  },
  {
    "id": 2,
    "name": "Clothing",
    "description": "Apparel and fashion items"
  }
]
```

### POST /products
Create a new product (admin only).

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "category_id": 1,
  "price": 49.99,
  "stock": 100,
  "sku": "NEWPROD-001"
}
```

**Response:**
```json
{
  "id": 11,
  "message": "Product created"
}
```

### PUT /products/:id
Update product information.

**Parameters:**
- `id` (required): Product ID

**Request Body (any fields):**
```json
{
  "name": "Updated Name",
  "price": 59.99,
  "stock": 75
}
```

**Response:**
```json
{
  "message": "Product updated"
}
```

### DELETE /products/:id
Delete a product.

**Parameters:**
- `id` (required): Product ID

**Response:**
```json
{
  "message": "Product deleted"
}
```

---

## Search

### GET /search
Search products with filtering.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| category | number | No | Filter by category ID |
| minPrice | number | No | Minimum price |
| maxPrice | number | No | Maximum price |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 12) |

**Example:**
```bash
GET /search?q=headphones&category=1&minPrice=50&maxPrice=150&page=1
```

**Response:**
```json
{
  "query": "headphones",
  "products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "price": 99.99,
      "images": ["/uploads/product-001.jpg"]
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 12,
  "pages": 1
}
```

### GET /search/trends/popular
Get popular search terms.

**Response:**
```json
[
  {
    "search_query": "headphones",
    "count": 45
  },
  {
    "search_query": "shirt",
    "count": 32
  }
]
```

---

## Cart

### GET /cart/:sessionId
Get cart items for a session.

**Parameters:**
- `sessionId` (required): Cart session identifier

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 2,
      "name": "Wireless Headphones",
      "price": 99.99,
      "stock": 50,
      "image_url": "/uploads/product-001.jpg"
    }
  ],
  "total": 199.98,
  "count": 1
}
```

### POST /cart/add
Add item to cart.

**Request Body:**
```json
{
  "sessionId": "session-uuid-123",
  "productId": 1,
  "quantity": 2
}
```

**Response:**
```json
{
  "message": "Item added to cart"
}
```

### PUT /cart/item/:cartItemId
Update cart item quantity.

**Parameters:**
- `cartItemId` (required): Cart item ID

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "message": "Cart item updated"
}
```

### DELETE /cart/item/:cartItemId
Remove item from cart.

**Parameters:**
- `cartItemId` (required): Cart item ID

**Response:**
```json
{
  "message": "Item removed from cart"
}
```

### DELETE /cart/:sessionId
Clear entire cart.

**Parameters:**
- `sessionId` (required): Cart session ID

**Response:**
```json
{
  "message": "Cart cleared"
}
```

---

## Orders

### POST /orders
Create new order from cart.

**Request Body:**
```json
{
  "cartSessionId": "session-uuid-123",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "shippingAddress": "123 Main St, City, State 12345"
}
```

**Response:**
```json
{
  "orderId": 1,
  "orderNumber": "ORD-1705324800000",
  "totalAmount": 299.97,
  "itemCount": 2
}
```

### GET /orders/:orderId
Get order details.

**Parameters:**
- `orderId` (required): Order ID

**Response:**
```json
{
  "id": 1,
  "order_number": "ORD-1705324800000",
  "total_amount": 299.97,
  "status": "pending",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "shipping_address": "123 Main St, City, State 12345",
  "created_at": "2024-01-15T10:00:00Z",
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Wireless Headphones",
      "quantity": 2,
      "unit_price": 99.99
    }
  ]
}
```

### GET /orders/customer/:email
Get all orders for a customer.

**Parameters:**
- `email` (required): Customer email

**Response:**
```json
[
  {
    "id": 1,
    "order_number": "ORD-1705324800000",
    "total_amount": 299.97,
    "status": "pending",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

### PUT /orders/:orderId/status
Update order status.

**Parameters:**
- `orderId` (required): Order ID

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Statuses:**
- pending
- processing
- shipped
- delivered
- cancelled

**Response:**
```json
{
  "message": "Order status updated"
}
```

### GET /orders
Get all orders (admin).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| status | string | - | Filter by status |

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "order_number": "ORD-1705324800000",
      "total_amount": 299.97,
      "status": "pending",
      "customer_name": "John Doe",
      "customer_email": "john@example.com"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```

---

## Photo Upload

### POST /upload/image/:productId
Upload product image.

**Parameters:**
- `productId` (required): Product ID

**Content-Type:** multipart/form-data

**Form Data:**
- `file` (required): Image file (JPEG, PNG, GIF, WebP max 10MB)

**Response:**
```json
{
  "id": 1,
  "imageUrl": "/uploads/product-1234567890-123.jpg",
  "filename": "product-1234567890-123.jpg",
  "message": "Image uploaded successfully"
}
```

### DELETE /upload/image/:imageId
Delete product image.

**Parameters:**
- `imageId` (required): Image ID

**Response:**
```json
{
  "message": "Image deleted"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Server Error |

### Common Errors

**Product not found:**
```json
{
  "error": "Product not found"
}
```

**Insufficient stock:**
```json
{
  "error": "Insufficient stock"
}
```

**Missing fields:**
```json
{
  "error": "Missing required fields"
}
```

**Invalid file:**
```json
{
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production.

## CORS Headers

API supports CORS from configured origin (default: http://localhost:3000).

## Security Headers

Implemented:
- Helmet.js security headers
- CORS validation
- Input validation on all endpoints
- SQL injection protection via parameterized queries

---

## Examples

### Complete Shopping Flow

```bash
# 1. Get products
curl http://localhost:5000/api/products?limit=20

# 2. Add to cart
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-session-123",
    "productId": 1,
    "quantity": 2
  }'

# 3. Get cart
curl http://localhost:5000/api/cart/my-session-123

# 4. Create order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "cartSessionId": "my-session-123",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "shippingAddress": "123 Main St, City, State 12345"
  }'

# 5. Get order details
curl http://localhost:5000/api/orders/1
```

---

## WebSocket Support

Not currently implemented. Consider adding for real-time notifications.

For more information, see README.md and source code comments.
