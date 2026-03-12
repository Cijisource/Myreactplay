const express = require('express');
const { getConnection, sql } = require('../config');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Generate unique order number
function generateOrderNumber() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Get seller's orders (all orders from all customers)
router.get('/seller/orders', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const pool = await getConnection();
    
    console.log('[DEBUG] Fetching all orders for seller:', sellerId);
    
    // Get all orders from all customers
    const result = await pool.request()
      .query(`
        SELECT o.id, o.order_number, o.total_amount, o.status, 
               o.customer_email, o.customer_name, o.shipping_address, 
               o.payment_screenshot, o.created_at, o.updated_at
        FROM orders o
        ORDER BY o.created_at DESC
      `);
    
    console.log('[DEBUG] Seller orders query returned:', result.recordset.length, 'records');
    
    res.json(result.recordset);
  } catch (error) {
    console.error('[ERROR] Seller orders endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});

// Get all orders for current logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('[ORDERS Get] User from token:', {
      userId: req.user?.userId,
      userName: req.user?.userName,
      roleType: req.user?.roleType
    });
    
    const pool = await getConnection();
    // Normalize userName to match order storage: trim and lowercase
    const userEmail = (req.user?.userName || '').trim().toLowerCase();
    
    console.log('[ORDERS Get] Normalized email to search:', userEmail);
    
    const result = await pool.request()
      .input('customerEmail', sql.NVarChar, userEmail)
      .query(`
        SELECT id, order_number, total_amount, status, customer_email, customer_name, 
               shipping_address, payment_screenshot, created_at, updated_at
        FROM orders
        WHERE LOWER(RTRIM(LTRIM(customer_email))) = @customerEmail
        ORDER BY created_at DESC
      `);
    
    console.log('[ORDERS Get] Query returned:', result.recordset.length, 'orders');
    if (result.recordset.length === 0) {
      console.log('[ORDERS Get] No orders found for email:', userEmail);
    } else {
      console.log('[ORDERS Get] Orders found:', result.recordset.map(o => ({ id: o.id, email: o.customer_email, order_number: o.order_number })));
    }
    
    res.json(result.recordset);
  } catch (error) {
    console.error('[ORDERS Get] Error endpoint error:', error);
    console.error('[ORDERS Get] Error details:', {
      code: error.code,
      number: error.number,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      details: 'Failed to retrieve orders'
    });
  }
});

// Get order by ID with items
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT id, order_number, total_amount, status, customer_email, customer_name, 
               shipping_address, payment_screenshot, created_at, updated_at
        FROM orders
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.recordset[0];
    
    // Get order items
    const itemsResult = await pool.request()
      .input('orderId', sql.Int, req.params.id)
      .query(`
        SELECT id, order_id, product_id, product_name, quantity, unit_price
        FROM order_items
        WHERE order_id = @orderId
      `);
    
    order.items = itemsResult.recordset;
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create order from cart
router.post('/', async (req, res) => {
  try {
    const { sessionId, customerEmail, customerName, shippingAddress, items, totalAmount, paymentScreenshot, orderDate } = req.body;
    
    console.log('[ORDERS Post] Received order creation request:', {
      customerEmail: customerEmail,
      customerName: customerName,
      itemCount: items?.length,
      totalAmount: totalAmount
    });
    
    if (!customerEmail || !customerName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order information' });
    }

    const pool = await getConnection();
    const orderNumber = generateOrderNumber();
    
    // Normalize customer email by trimming whitespace and converting to lowercase
    const normalizedEmail = customerEmail.trim().toLowerCase();
    
    // Use provided orderDate or fall back to current server time
    const createdDate = orderDate ? new Date(orderDate) : new Date();

    console.log('[ORDERS Post] Creating order with normalized email:', normalizedEmail);

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create order
      const orderRequest = new sql.Request(transaction);
      const orderResult = await orderRequest
        .input('orderNumber', sql.NVarChar, orderNumber)
        .input('totalAmount', sql.Decimal(10, 2), totalAmount)
        .input('customerEmail', sql.NVarChar, normalizedEmail)
        .input('customerName', sql.NVarChar, customerName)
        .input('shippingAddress', sql.NVarChar, shippingAddress || null)
        .input('paymentScreenshot', sql.NVarChar(sql.MAX), paymentScreenshot || null)
        .input('createdAt', sql.DateTime2, createdDate)
        .query(`
          INSERT INTO orders (order_number, total_amount, customer_email, customer_name, shipping_address, payment_screenshot, status, created_at)
          OUTPUT INSERTED.id, INSERTED.order_number, INSERTED.total_amount, INSERTED.status, 
                 INSERTED.customer_email, INSERTED.customer_name, INSERTED.shipping_address, 
                 INSERTED.created_at, INSERTED.updated_at
          VALUES (@orderNumber, @totalAmount, @customerEmail, @customerName, @shippingAddress, @paymentScreenshot, 'pending', @createdAt)
        `);

      const orderId = orderResult.recordset[0].id;
      console.log('[ORDERS Post] Order created with ID:', orderId, 'Order#:', orderResult.recordset[0].order_number);

      // Add order items
      for (const item of items) {
        const itemRequest = new sql.Request(transaction);
        await itemRequest
          .input('orderId', sql.Int, orderId)
          .input('productId', sql.Int, item.productId)
          .input('productName', sql.NVarChar, item.productName)
          .input('quantity', sql.Int, item.quantity)
          .input('unitPrice', sql.Decimal(10, 2), item.price)
          .query(`
            INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
            VALUES (@orderId, @productId, @productName, @quantity, @unitPrice)
          `);
      }
      console.log('[ORDERS Post] Order items added:', items.length);

      // Clear cart
      const cartRequest = new sql.Request(transaction);
      await cartRequest
        .input('sessionId', sql.NVarChar, sessionId)
        .query('DELETE FROM cart_items WHERE cart_session_id = @sessionId');

      await transaction.commit();
      console.log('[ORDERS Post] Order transaction committed successfully');
      console.log('[ORDERS Post] Returning order:', {
        id: orderResult.recordset[0].id,
        order_number: orderResult.recordset[0].order_number,
        customer_email: orderResult.recordset[0].customer_email
      });
      
      res.status(201).json(orderResult.recordset[0]);
    } catch (error) {
      console.error('[ORDERS Post] Transaction error:', error);
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('[ORDERS Post] Endpoint error:', error.message);
    console.error('[ORDERS Post] Full error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status values
    const validStatuses = ['pending', 'processing', 'ready for shipping', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE orders 
        SET status = @status, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.order_number, INSERTED.total_amount, INSERTED.status, 
               INSERTED.customer_email, INSERTED.customer_name, INSERTED.shipping_address, 
               INSERTED.payment_screenshot, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
