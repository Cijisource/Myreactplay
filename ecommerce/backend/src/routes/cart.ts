import express from 'express';

const router = express.Router();

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

// In-memory cart storage (in production, use database or session)
const carts: Record<string, CartItem[]> = {};

// Get cart
router.get('/:userId', (req, res) => {
  const cart = carts[req.params.userId] || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ items: cart, total });
});

// Add to cart
router.post('/:userId', (req, res) => {
  try {
    const { productId, name, price, quantity, image } = req.body;
    const userId = req.params.userId;

    if (!carts[userId]) {
      carts[userId] = [];
    }

    const existingItem = carts[userId].find(item => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      carts[userId].push({ productId, name, price, quantity, image });
    }

    res.json({ message: 'Item added to cart' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item
router.put('/:userId/:productId', (req, res) => {
  try {
    const cart = carts[req.params.userId];
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const item = cart.find(item => item.productId === req.params.productId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    item.quantity = req.body.quantity;
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update cart' });
  }
});

// Remove from cart
router.delete('/:userId/:productId', (req, res) => {
  try {
    const cart = carts[req.params.userId];
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const index = cart.findIndex(item => item.productId === req.params.productId);
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    cart.splice(index, 1);
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/:userId', (req, res) => {
  delete carts[req.params.userId];
  res.json({ message: 'Cart cleared' });
});

export default router;
