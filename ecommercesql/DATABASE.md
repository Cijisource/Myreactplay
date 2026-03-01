# Database Guide

Complete guide to the e-commerce database schema and operations.

## Database Technology

- **Type**: SQLite 3
- **Location**: `backend/data/ecommerce.db`
- **Initialization**: Automatic on first backend start

## Tables Overview

### 1. Categories Table
Stores product categories.

```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Example:**
- Electronics
- Clothing
- Home & Garden
- Sports & Outdoors
- Books

### 2. Products Table
Main product information.

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    sku TEXT UNIQUE,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (category_id) REFERENCES categories(id)
)
```

**Fields:**
- `name`: Product name
- `description`: Product details
- `category_id`: Links to categories
- `price`: Product price
- `stock`: Available quantity
- `sku`: Stock keeping unit (unique identifier)

### 3. Product Images Table
Stores images associated with products.

```sql
CREATE TABLE product_images (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    filename TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products(id)
)
```

**Features:**
- Multiple images per product
- Original filename tracking
- Thumbnail support (future feature)
- Upload timestamp

### 4. Cart Items Table
Shopping cart data (session-based).

```sql
CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY,
    cart_session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(cart_session_id, product_id)
)
```

**Features:**
- Session-based tracking
- Prevents duplicate items per session
- Automatic timestamps

### 5. Orders Table
Customer orders.

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    shipping_address TEXT,
    created_at DATETIME,
    updated_at DATETIME
)
```

**Status Values:**
- `pending` - New order
- `processing` - Being prepared
- `shipped` - In transit
- `delivered` - Received
- `cancelled` - Cancelled order

### 6. Order Items Table
Individual items within an order.

```sql
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
)
```

**Features:**
- Stores product snapshot (name, price at time of order)
- Links to original product
- Allows price history tracking

### 7. Search History Table
Tracks user searches.

```sql
CREATE TABLE search_history (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    search_query TEXT NOT NULL,
    results_count INTEGER,
    searched_at DATETIME
)
```

**Uses:**
- Analytics
- Popular search trends
- User behavior tracking

## Indexes

Indexes optimize query performance:

```sql
CREATE INDEX idx_products_category ON products(category_id)
CREATE INDEX idx_products_name ON products(name)
CREATE INDEX idx_product_images_product ON product_images(product_id)
CREATE INDEX idx_cart_items_session ON cart_items(cart_session_id)
CREATE INDEX idx_orders_customer ON orders(customer_email)
```

## Sample Data

Run these queries to add test data:

```sql
-- Add category
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices');

-- Add product
INSERT INTO products (name, description, category_id, price, stock, sku) VALUES
('Headphones', 'Wireless headphones', 1, 99.99, 50, 'WH-001');

-- Add image
INSERT INTO product_images (product_id, image_url, filename) VALUES
(1, '/uploads/product-001.jpg', 'product-001.jpg');
```

## Common Queries

### Get All Products with Images
```sql
SELECT p.*, c.name as category_name,
       GROUP_CONCAT(pi.image_url) as images
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_images pi ON p.id = pi.product_id
GROUP BY p.id
```

### Get Cart Total
```sql
SELECT SUM(p.price * ci.quantity) as total
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.cart_session_id = 'session-123'
```

### Get Order Details
```sql
SELECT o.*, 
       GROUP_CONCAT(oi.product_name || ' x' || oi.quantity) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = 1
GROUP BY o.id
```

### Search Products
```sql
SELECT * FROM products
WHERE name LIKE '%headphone%'
   OR description LIKE '%headphone%'
ORDER BY price ASC
```

### Popular Searches
```sql
SELECT search_query, COUNT(*) as frequency
FROM search_history
GROUP BY search_query
ORDER BY frequency DESC
LIMIT 10
```

## Data Operations

### Backup Database
```bash
# SQLite file backup
cp backend/data/ecommerce.db backend/data/ecommerce.db.backup

# Or export SQL
sqlite3 backend/data/ecommerce.db .dump > backup.sql
```

### Restore Database
```bash
# From backup file
cp backend/data/ecommerce.db.backup backend/data/ecommerce.db

# From SQL dump
sqlite3 backend/data/ecommerce.db < backup.sql
```

### Reset Database
```bash
# Delete database (will be recreated on next backend start)
rm backend/data/ecommerce.db
```

## Using CLI

Access database directly:
```bash
cd backend
sqlite3 data/ecommerce.db
```

Common commands:
```sql
.tables                    -- List tables
.schema table_name         -- Show table structure
SELECT * FROM products;    -- Query data
.exit                      -- Exit CLI
```

## Constraints & Validation

### Product Constraints
- Product name is required
- SKU must be unique (no duplicates)
- Price must be valid decimal
- Category must exist

### Order Constraints
- Order number must be unique
- Customer email required
- Status must be valid enum

### Image Constraints
- Product must exist
- Image URL required
- One image per file upload

## Performance Tips

1. **Pagination**: Limit results (12-20 per page)
2. **Indexing**: Search queries use indexed columns
3. **Lazy Loading**: Load images on demand
4. **Caching**: Cache category list
5. **Connection Pooling**: Reuse DB connections

## Troubleshooting

### Database Locked
```bash
# Restart backend
npm start
```

### Corrupt Database
```bash
# Delete and reinitialize
rm backend/data/ecommerce.db
npm start
```

### Query Errors
- Check SQL syntax
- Verify table names and columns
- Check data types match

## Advanced Operations

### Add Product Category
```bash
# Via API
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaming",
    "description": "Gaming equipment",
    "category_id": 3,
    "price": 199.99,
    "stock": 25,
    "sku": "GAME-001"
  }'
```

### Update Product Stock
```sql
UPDATE products SET stock = 100 WHERE id = 1
```

### Delete Old Search History
```sql
DELETE FROM search_history 
WHERE searched_at < date('now', '-30 days')
```

For more information, see README.md or API documentation.
