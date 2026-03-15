const express = require('express');
const { getConnection, sql } = require('../config');
const router = express.Router();

// Validate and apply discount code
router.post('/validate', async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Discount code is required' });
    }

    if (!cartTotal || cartTotal < 0) {
      return res.status(400).json({ error: 'Cart total is required' });
    }

    const pool = await getConnection();
    
    // Get discount details
    const result = await pool.request()
      .input('code', sql.NVarChar, code.toUpperCase().trim())
      .query(`
        SELECT id, code, description, discount_type, discount_value, 
               minimum_purchase, maximum_discount, usage_limit, usage_count,
               is_active, valid_from, valid_until
        FROM discounts
        WHERE UPPER(RTRIM(LTRIM(code))) = @code
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid discount code' });
    }

    const discount = result.recordset[0];

    // Check if discount is active
    if (!discount.is_active) {
      return res.status(400).json({ error: 'This discount code is no longer active' });
    }

    // Check if discount is within valid date range
    const now = new Date();
    if (discount.valid_from && new Date(discount.valid_from) > now) {
      return res.status(400).json({ error: 'This discount code is not yet valid' });
    }

    if (discount.valid_until && new Date(discount.valid_until) < now) {
      return res.status(400).json({ error: 'This discount code has expired' });
    }

    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return res.status(400).json({ error: 'This discount code has reached its usage limit' });
    }

    // Check minimum purchase requirement
    if (cartTotal < discount.minimum_purchase) {
      return res.status(400).json({ 
        error: `Minimum purchase of ₹${discount.minimum_purchase.toFixed(2)} required for this discount` 
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    
    if (discount.discount_type === 'percentage') {
      discountAmount = (cartTotal * discount.discount_value) / 100;
      
      // Apply maximum discount limit if set
      if (discount.maximum_discount && discountAmount > discount.maximum_discount) {
        discountAmount = discount.maximum_discount;
      }
    } else if (discount.discount_type === 'fixed') {
      discountAmount = discount.discount_value;
    }

    res.json({
      success: true,
      discount: {
        code: discount.code,
        description: discount.description,
        type: discount.discount_type,
        value: discount.discount_value,
        amount: parseFloat(discountAmount.toFixed(2)),
        maximumDiscount: discount.maximum_discount
      }
    });
  } catch (error) {
    console.error('Discount validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all active discounts (for displaying available discounts)
router.get('/active', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT code, description, discount_type, discount_value, minimum_purchase
        FROM discounts
        WHERE is_active = 1 
        AND valid_from <= GETDATE() 
        AND (valid_until IS NULL OR valid_until >= GETDATE())
        ORDER BY code
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching active discounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get discount by code (admin endpoint - no auth check for now)
router.get('/:code', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('code', sql.NVarChar, req.params.code.toUpperCase().trim())
      .query(`
        SELECT id, code, description, discount_type, discount_value, 
               minimum_purchase, maximum_discount, usage_limit, usage_count,
               is_active, valid_from, valid_until, created_at
        FROM discounts
        WHERE UPPER(RTRIM(LTRIM(code))) = @code
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching discount:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new discount (admin only)
router.post('/', async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minimumPurchase, 
            maximumDiscount, usageLimit, validFrom, validUntil } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ 
        error: 'Code, discount type, and discount value are required' 
      });
    }

    const pool = await getConnection();

    const result = await pool.request()
      .input('code', sql.NVarChar, code.toUpperCase().trim())
      .input('description', sql.NVarChar, description || null)
      .input('discountType', sql.NVarChar, discountType)
      .input('discountValue', sql.Decimal(10, 2), discountValue)
      .input('minimumPurchase', sql.Decimal(10, 2), minimumPurchase || 0)
      .input('maximumDiscount', sql.Decimal(10, 2), maximumDiscount || null)
      .input('usageLimit', sql.Int, usageLimit || null)
      .input('validFrom', sql.DateTime2, validFrom || null)
      .input('validUntil', sql.DateTime2, validUntil || null)
      .query(`
        INSERT INTO discounts (code, description, discount_type, discount_value, 
                               minimum_purchase, maximum_discount, usage_limit,
                               valid_from, valid_until, is_active)
        OUTPUT INSERTED.id, INSERTED.code, INSERTED.description, INSERTED.discount_type, 
               INSERTED.discount_value, INSERTED.minimum_purchase, INSERTED.maximum_discount
        VALUES (@code, @description, @discountType, @discountValue, @minimumPurchase,
                @maximumDiscount, @usageLimit, @validFrom, @validUntil, 1)
      `);

    res.status(201).json({
      success: true,
      discount: result.recordset[0]
    });
  } catch (error) {
    if (error.number === 2627) { // Unique constraint violation
      return res.status(400).json({ error: 'Discount code already exists' });
    }
    console.error('Error creating discount:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update discount (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { description, discountValue, minimumPurchase, maximumDiscount, 
            usageLimit, isActive, validFrom, validUntil } = req.body;

    const pool = await getConnection();

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('description', sql.NVarChar, description)
      .input('discountValue', sql.Decimal(10, 2), discountValue)
      .input('minimumPurchase', sql.Decimal(10, 2), minimumPurchase)
      .input('maximumDiscount', sql.Decimal(10, 2), maximumDiscount)
      .input('usageLimit', sql.Int, usageLimit)
      .input('isActive', sql.Bit, isActive)
      .input('validFrom', sql.DateTime2, validFrom)
      .input('validUntil', sql.DateTime2, validUntil)
      .query(`
        UPDATE discounts
        SET description = @description,
            discount_value = @discountValue,
            minimum_purchase = @minimumPurchase,
            maximum_discount = @maximumDiscount,
            usage_limit = @usageLimit,
            is_active = @isActive,
            valid_from = @validFrom,
            valid_until = @validUntil,
            updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.code, INSERTED.description, INSERTED.discount_type,
               INSERTED.discount_value, INSERTED.minimum_purchase, INSERTED.maximum_discount
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json({
      success: true,
      discount: result.recordset[0]
    });
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
