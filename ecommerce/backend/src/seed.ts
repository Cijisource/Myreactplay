import 'reflect-metadata';
import { Product } from './models/Product.js';
import { AppDataSource } from './config/database.js';

const sampleProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
    price: 129.99,
    image: 'https://via.placeholder.com/300?text=Headphones',
    category: 'Electronics',
    stock: 45,
    rating: 4.5,
    reviews: 342
  },
  {
    name: 'USB-C Cable (3 Pack)',
    description: 'Fast charging USB-C cables, 6ft length, compatible with all USB-C devices.',
    price: 16.99,
    image: 'https://via.placeholder.com/300?text=USB-C+Cable',
    category: 'Accessories',
    stock: 156,
    rating: 4.2,
    reviews: 892
  },
  {
    name: 'Portable Phone Charger',
    description: '20000mAh portable power bank with dual USB ports and LED display.',
    price: 24.99,
    image: 'https://via.placeholder.com/300?text=Power+Bank',
    category: 'Electronics',
    stock: 78,
    rating: 4.4,
    reviews: 567
  },
  {
    name: 'Phone Screen Protector',
    description: 'Tempered glass screen protector for universal phone models.',
    price: 9.99,
    image: 'https://via.placeholder.com/300?text=Screen+Protector',
    category: 'Accessories',
    stock: 234,
    rating: 4.1,
    reviews: 421
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precision tracking and long battery life.',
    price: 19.99,
    image: 'https://via.placeholder.com/300?text=Wireless+Mouse',
    category: 'Computer Peripherals',
    stock: 89,
    rating: 4.3,
    reviews: 678
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical gaming keyboard with customizable switches.',
    price: 89.99,
    image: 'https://via.placeholder.com/300?text=Mechanical+Keyboard',
    category: 'Computer Peripherals',
    stock: 34,
    rating: 4.6,
    reviews: 234
  },
  {
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand for better ergonomics.',
    price: 34.99,
    image: 'https://via.placeholder.com/300?text=Laptop+Stand',
    category: 'Accessories',
    stock: 67,
    rating: 4.4,
    reviews: 312
  },
  {
    name: 'Webcam HD 1080p',
    description: 'Crystal clear 1080p HD webcam with built-in microphone.',
    price: 44.99,
    image: 'https://via.placeholder.com/300?text=Webcam',
    category: 'Computer Peripherals',
    stock: 56,
    rating: 4.2,
    reviews: 445
  },
  {
    name: 'USB Hub 7 Port',
    description: 'Multi-port USB hub with fast charging capability.',
    price: 29.99,
    image: 'https://via.placeholder.com/300?text=USB+Hub',
    category: 'Accessories',
    stock: 112,
    rating: 4.3,
    reviews: 234
  },
  {
    name: 'Desktop Monitor 27 inch',
    description: 'Full HD 27 inch monitor with IPS panel and slim bezels.',
    price: 199.99,
    image: 'https://via.placeholder.com/300?text=Monitor',
    category: 'Computer Peripherals',
    stock: 23,
    rating: 4.5,
    reviews: 156
  }
];

const seedDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
    
    const productRepository = AppDataSource.getRepository(Product);
    
    // Clear existing products
    await productRepository.query('DELETE FROM "product"');
    console.log('Cleared existing products');
    
    // Insert sample products
    const products = productRepository.create(sampleProducts);
    const result = await productRepository.save(products);
    console.log(`✓ Seeded ${result.length} products into database`);
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
