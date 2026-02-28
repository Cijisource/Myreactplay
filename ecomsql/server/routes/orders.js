const express = require('express');
const { getConnection, sql } = require('../config');
const router = express.Router();

// Generate unique order number
function generateOrderNumber() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Get all orders
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT id, order_number, total_amount, status, customer_email, customer_name, 
               shipping_address, created_at, updated_at
        FROM orders
        ORDER BY created_at DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
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
               shipping_address, created_at, updated_at
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
    const { sessionId, customerEmail, customerName, shippingAddress, items, totalAmount } = req.body;
    
    if (!customerEmail || !customerName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order information' });
    }

    const pool = await getConnection();
    const orderNumber = generateOrderNumber();

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create order
      const orderRequest = new sql.Request(transaction);
      const orderResult = await orderRequest
        .input('orderNumber', sql.NVarChar, orderNumber)
        .input('totalAmount', sql.Decimal(10, 2), totalAmount)
        .input('customerEmail', sql.NVarChar, customerEmail)
        .input('customerName', sql.NVarChar, customerName)
        .input('shippingAddress', sql.NVarChar, shippingAddress || null)
        .query(`
          INSERT INTO orders (order_number, total_amount, customer_email, customer_name, shipping_address, status)
          OUTPUT INSERTED.id, INSERTED.order_number, INSERTED.total_amount, INSERTED.status, 
                 INSERTED.customer_email, INSERTED.customer_name, INSERTED.shipping_address, 
                 INSERTED.created_at, INSERTED.updated_at
          VALUES (@orderNumber, @totalAmount, @customerEmail, @customerName, @shippingAddress, 'pending')
        `);

      const orderId = orderResult.recordset[0].id;

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

      // Clear cart
      const cartRequest = new sql.Request(transaction);
      await cartRequest
        .input('sessionId', sql.NVarChar, sessionId)
        .query('DELETE FROM cart_items WHERE cart_session_id = @sessionId');

      await transaction.commit();
      res.status(201).json(orderResult.recordset[0]);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
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
               INSERTED.created_at, INSERTED.updated_at
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
