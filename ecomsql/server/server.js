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
