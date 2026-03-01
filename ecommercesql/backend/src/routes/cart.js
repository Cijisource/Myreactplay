const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');

// Validation helpers
const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return 'Invalid session ID';
  }
  if (sessionId.length > 100) {
    return 'Session ID too long (max 100 chars)';
  }
  return null;
};

const validateProductId = (productId) => {
  const id = parseInt(productId, 10);
  if (isNaN(id) || id <= 0) {
    return 'Invalid product ID (must be positive integer)';
  }
  return null;
};

const validateQuantity = (quantity) => {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return 'Invalid quantity (must be positive integer)';
  }
  if (qty > 999) {
    return 'Quantity too high (max 999)';
  }
  return null;
};

const validateCartItemId = (cartItemId) => {
  const id = parseInt(cartItemId, 10);
  if (isNaN(id) || id <= 0) {
    return 'Invalid cart item ID';
  }
  return null;
};

// Get cart items for a session
router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  const error = validateSessionId(sessionId);
  if (error) {
    return res.status(400).json({ error });
  }
  
  db.all(`
    SELECT 
      ci.id,
      ci.product_id,
      ci.quantity,
      p.name,
      p.price,
      p.stock,
      (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image_url
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_session_id = ?
    ORDER BY ci.added_at DESC
  `, [sessionId], (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({
      items,
      total: parseFloat(total.toFixed(2)),
      count: items.length
    });
  });
});

// Add item to cart
router.post('/add', (req, res) => {
  const { sessionId, productId, quantity = 1 } = req.body;
  
  // Validate inputs
  const sessionError = validateSessionId(sessionId);
  if (sessionError) {
    return res.status(400).json({ error: sessionError });
  }
  
  const productError = validateProductId(productId);
  if (productError) {
    return res.status(400).json({ error: productError });
  }
  
  const quantityError = validateQuantity(quantity);
  if (quantityError) {
    return res.status(400).json({ error: quantityError });
  }
  
  const parsedProductId = parseInt(productId, 10);
  const parsedQuantity = parseInt(quantity, 10);
  
  // Check if product exists and has stock
  db.get('SELECT stock FROM products WHERE id = ?', [parsedProductId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.stock < parsedQuantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Insert or replace cart item
    db.run(`
      INSERT OR REPLACE INTO cart_items (cart_session_id, product_id, quantity)
      VALUES (?, ?, COALESCE((SELECT quantity FROM cart_items WHERE cart_session_id = ? AND product_id = ?), 0) + ?)
    `, [sessionId, parsedProductId, sessionId, parsedProductId, parsedQuantity], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Item added to cart' });
    });
  });
});

// Update cart item quantity
router.put('/item/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;
  const { quantity } = req.body;
  
  const cartItemError = validateCartItemId(cartItemId);
  if (cartItemError) {
    return res.status(400).json({ error: cartItemError });
  }
  
  if (quantity === undefined) {
    return res.status(400).json({ error: 'Quantity is required' });
  }
  
  const parsedQuantity = parseInt(quantity, 10);
  if (isNaN(parsedQuantity) || parsedQuantity < 0) {
    return res.status(400).json({ error: 'Invalid quantity (must be non-negative integer)' });
  }
  
  if (parsedQuantity > 999) {
    return res.status(400).json({ error: 'Quantity too high (max 999)' });
  }
  
  const parsedCartItemId = parseInt(cartItemId, 10);
  
  if (parsedQuantity === 0) {
    // Delete item if quantity is 0
    db.run('DELETE FROM cart_items WHERE id = ?', [parsedCartItemId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Item removed from cart' });
    });
  } else {
    db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [parsedQuantity, parsedCartItemId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Cart item updated' });
    });
  }
});

// Remove item from cart
router.delete('/item/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;
  
  const error = validateCartItemId(cartItemId);
  if (error) {
    return res.status(400).json({ error });
  }
  
  const parsedCartItemId = parseInt(cartItemId, 10);
  db.run('DELETE FROM cart_items WHERE id = ?', [parsedCartItemId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Item removed from cart' });
  });
});

// Clear entire cart
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  const error = validateSessionId(sessionId);
  if (error) {
    return res.status(400).json({ error });
  }
  
  db.run('DELETE FROM cart_items WHERE cart_session_id = ?', [sessionId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Cart cleared' });
  });
});

module.exports = router;
