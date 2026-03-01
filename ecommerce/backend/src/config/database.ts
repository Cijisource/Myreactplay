import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_FILE_PATH || './data/ecommerce.db',
  entities: [User, Product, Order],
  synchronize: true, // Auto-create tables
  logging: false
});

export const connectDB = async () => {
  try {
    await AppDataSource.initialize();
    console.log('SQL Server Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};
