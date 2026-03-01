import express from 'express';
import { Like } from 'typeorm';
import { Product } from '../models/Product.js';
import { AppDataSource } from '../config/database.js';

const router = express.Router();
const productRepository = AppDataSource.getRepository(Product);

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = productRepository.createQueryBuilder('product');

    if (category) {
      query = query.where('product.category = :category', { category });
    }

    if (search) {
      query = query.where(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (sort === 'price-asc') query = query.orderBy('product.price', 'ASC');
    else if (sort === 'price-desc') query = query.orderBy('product.price', 'DESC');
    else if (sort === 'newest') query = query.orderBy('product.createdAt', 'DESC');

    const products = await query.getMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await productRepository.findOne({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin)
router.post('/', async (req, res) => {
  try {
    const product = productRepository.create(req.body);
    const savedProduct = await productRepository.save(product);
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create product' });
  }
});

// Update product (admin)
router.put('/:id', async (req, res) => {
  try {
    await productRepository.update(req.params.id, req.body);
    const product = await productRepository.findOne({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin)
router.delete('/:id', async (req, res) => {
  try {
    const product = await productRepository.findOne({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await productRepository.remove(product);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
