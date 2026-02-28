require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { getConnection } = require('./config');

// Import routes
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const productImageRoutes = require('./routes/productImages');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Compression for all responses
app.use(compression());

// CORS with specific options
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cache static files for 24 hours
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '24h',
  etag: false
}));

// Initialize database connection
async function initializeDB() {
  try {
    await getConnection();
    console.log('Database initialized');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-images', productImageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Debug endpoint to check database and data
app.get('/api/debug', async (req, res) => {
  try {
    const pool = await getConnection();
    const { sql: SqlClient } = require('mssql');
    
    // Check if pool is connected
    const connectionStatus = pool.connected ? 'Connected' : 'Not Connected';
    
    // Count records in each table
    const categoryCount = await pool.request().query('SELECT COUNT(*) as count FROM categories');
    const productCount = await pool.request().query('SELECT COUNT(*) as count FROM products');
    const orderCount = await pool.request().query('SELECT COUNT(*) as count FROM orders');
    const cartCount = await pool.request().query('SELECT COUNT(*) as count FROM cart_items');
    
    // Get sample product
    const sampleProduct = await pool.request().query('SELECT TOP 5 id, name, price, stock FROM products');
    
    // Get sample order
    const sampleOrder = await pool.request().query('SELECT TOP 5 id, order_number, total_amount, status FROM orders');
    
    res.json({
      status: 'Success',
      database: {
        connectionStatus,
        dbServer: process.env.DB_SERVER,
        dbName: process.env.DB_NAME,
        dbUser: process.env.DB_USER
      },
      tables: {
        categories: categoryCount.recordset[0].count,
        products: productCount.recordset[0].count,
        orders: orderCount.recordset[0].count,
        cart_items: cartCount.recordset[0].count
      },
      sampleProducts: sampleProduct.recordset,
      sampleOrders: sampleOrder.recordset,
      timestamp: new Date()
    });
  } catch (error) {
    res.json({
      status: 'Error',
      error: error.message,
      details: {
        code: error.code,
        number: error.number,
        originalError: error.originalError?.message
      },
      dbServer: process.env.DB_SERVER,
      dbName: process.env.DB_NAME,
      timestamp: new Date()
    });
  }
});

// Start server
initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down gracefully...');
  const timeout = setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
  timeout.unref();
  process.exit(0);
});
