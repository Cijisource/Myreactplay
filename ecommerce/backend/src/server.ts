import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import cartRoutes from './routes/cart.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Routes
    app.use('/api/products', productRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/cart', cartRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'API is running' });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err);
      res.status(err.status || 500).json({ 
        error: err.message || 'Internal server error' 
      });
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
