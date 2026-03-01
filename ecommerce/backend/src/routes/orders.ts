import express from 'express';
import { Order } from '../models/Order.js';
import { AppDataSource } from '../config/database.js';

const router = express.Router();
const orderRepository = AppDataSource.getRepository(Order);

// Create order
router.post('/', async (req, res) => {
  try {
    const { userId, items, total, shippingAddress } = req.body;

    const order = orderRepository.create({
      user: { id: userId },
      items: JSON.stringify(items),
      total,
      shippingName: shippingAddress?.name || '',
      shippingEmail: shippingAddress?.email || '',
      shippingPhone: shippingAddress?.phone || '',
      shippingStreet: shippingAddress?.street || '',
      shippingCity: shippingAddress?.city || '',
      shippingState: shippingAddress?.state || '',
      shippingZipCode: shippingAddress?.zipCode || '',
      status: 'pending'
    });

    const savedOrder = await orderRepository.save(order);
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create order' });
  }
});

// Get user orders
router.get('/user/:userId', async (req, res) => {
  try {
    const orders = await orderRepository.find({ 
      where: { user: { id: req.params.userId } },
      relations: ['user']
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await orderRepository.findOne({ 
      where: { id: req.params.id },
      relations: ['user']
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (admin)
router.put('/:id', async (req, res) => {
  try {
    await orderRepository.update(req.params.id, req.body);
    const order = await orderRepository.findOne({ 
      where: { id: req.params.id },
      relations: ['user']
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update order' });
  }
});

export default router;
