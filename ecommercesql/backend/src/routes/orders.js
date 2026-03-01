const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    return 'Invalid email address';
  }
  if (email.length > 255) {
    return 'Email too long (max 255 chars)';
  }
  return null;
};

const validateCustomerName = (name) => {
  if (!name || typeof name !== 'string') {
    return 'Customer name is required and must be a string';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'Customer name must be 2-100 characters';
  }
  // Only allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return 'Customer name contains invalid characters';
  }
  return null;
};

const validateShippingAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return 'Shipping address is required';
  }
  const trimmed = address.trim();
  if (trimmed.length < 10 || trimmed.length > 500) {
    return 'Shipping address must be 10-500 characters';
  }
  return null;
};

const validateOrderId = (orderId) => {
  const id = parseInt(orderId, 10);
  if (isNaN(id) || id <= 0) {
    return 'Invalid order ID (must be positive integer)';
  }
  return null;
};

const validateCartSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return 'Invalid cart session ID';
  }
  if (sessionId.length > 100) {
    return 'Session ID too long (max 100 chars)';
  }
  return null;
};

// Create order from cart
router.post('/', (req, res) => {
  const { cartSessionId, customerName, customerEmail, shippingAddress } = req.body;
  
  // Validate inputs
  const sessionError = validateCartSessionId(cartSessionId);
  if (sessionError) {
    return res.status(400).json({ error: sessionError });
  }
  
  const nameError = validateCustomerName(customerName);
  if (nameError) {
    return res.status(400).json({ error: nameError });
  }
  
  const emailError = validateEmail(customerEmail);
  if (emailError) {
    return res.status(400).json({ error: emailError });
  }
  
  const addressError = validateShippingAddress(shippingAddress);
  if (addressError) {
    return res.status(400).json({ error: addressError });
  }
  
  const sanitizedName = customerName.trim();
  const sanitizedEmail = customerEmail.trim().toLowerCase();
  const sanitizedAddress = shippingAddress.trim();
  
  // Get cart items
  db.all(`
    SELECT ci.product_id, ci.quantity, p.name, p.price
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_session_id = ?
  `, [cartSessionId], (err, items) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderNumber = 'ORD-' + Date.now();
    
    // Create order
    db.run(
      `INSERT INTO orders (order_number, total_amount, customer_name, customer_email, shipping_address)
       VALUES (?, ?, ?, ?, ?)`,
      [orderNumber, totalAmount, sanitizedName, sanitizedEmail, sanitizedAddress],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const orderId = this.lastID;
        
        // Add order items
        let itemsProcessed = 0;
        items.forEach((item) => {
          db.run(
            `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, item.product_id, item.name, item.quantity, item.price],
            (err) => {
              if (err) {
                console.error('Error adding order item:', err);
              }
              itemsProcessed++;
              
              if (itemsProcessed === items.length) {
                // Clear cart after order is created
                db.run('DELETE FROM cart_items WHERE cart_session_id = ?', [cartSessionId], () => {
                  res.status(201).json({
                    orderId,
                    orderNumber,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    itemCount: items.length
                  });
                });
              }
            }
          );
        });
      }
    );
  });
});

// Get order by ID
router.get('/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  const error = validateOrderId(orderId);
  if (error) {
    return res.status(400).json({ error });
  }
  
  const parsedOrderId = parseInt(orderId, 10);
  db.get('SELECT * FROM orders WHERE id = ?', [parsedOrderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    db.all('SELECT * FROM order_items WHERE order_id = ?', [parsedOrderId], (err, items) => {
      res.json({
        ...order,
        items: items || []
      });
    });
  });
});

// Get orders by email
router.get('/customer/:email', (req, res) => {
  const { email } = req.params;
  
  const error = validateEmail(email);
  if (error) {
    return res.status(400).json({ error });
  }
  
  const sanitizedEmail = email.trim().toLowerCase();
  db.all(
    'SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC',
    [sanitizedEmail],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(orders || []);
    }
  );
});

// Update order status
router.put('/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  const orderError = validateOrderId(orderId);
  if (orderError) {
    return res.status(400).json({ error: orderError });
  }
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: pending, processing, shipped, delivered, or cancelled' });
  }
  
  const parsedOrderId = parseInt(orderId, 10);
  db.run(
    'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, parsedOrderId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Order status updated' });
    }
  );
});

// Get all orders (admin)
router.get('/', (req, res) => {
  let { page = 1, limit = 20, status } = req.query;
  
  // Validate pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;
  
  // Validate status if provided
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }
  
  let query = 'SELECT * FROM orders';
  let params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);
  
  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    let countQuery = 'SELECT COUNT(*) as total FROM orders';
    if (status) {
      countQuery += ' WHERE status = ?';
    }
    
    const countParams = status ? [status] : [];
    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        orders: orders || [],
        total: countRow.total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(countRow.total / limitNum)
      });
    });
  });
});

module.exports = router;
