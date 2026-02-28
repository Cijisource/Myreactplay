const express = require('express');
const { getConnection, sql } = require('../config');
const router = express.Router();

// Get all products with category info and first image
router.get('/', async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT p.id, p.name, p.description, p.category_id, p.price, p.stock, p.sku, 
             p.created_at, p.updated_at, c.name as category_name,
             (SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY uploaded_at DESC) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    if (categoryId) {
      query += ` AND p.category_id = @categoryId`;
      request.input('categoryId', sql.Int, categoryId);
    }
    
    if (search) {
      query += ` AND (p.name LIKE @search OR p.description LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    console.log('[DEBUG] Fetching products with query:', query);
    console.log('[DEBUG] Parameters:', { categoryId, search });
    
    const result = await request.query(query);
    
    console.log('[DEBUG] Products query returned:', result.recordset.length, 'records');
    
    if (result.recordset.length === 0) {
      console.log('[DEBUG] No products found');
      // Test connection by querying count
      const countResult = await pool.request().query('SELECT COUNT(*) as count FROM products');
      console.log('[DEBUG] Total products in database:', countResult.recordset[0].count);
    }
    
    res.json(result.recordset);
  } catch (error) {
    console.error('[ERROR] Products endpoint error:', error);
    console.error('[ERROR] Error details:', {
      code: error.code,
      number: error.number,
      message: error.message
    });
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      details: 'Check server logs for more information'
    });
  }
});

// Get product by ID with images
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT p.id, p.name, p.description, p.category_id, p.price, p.stock, p.sku, 
               p.created_at, p.updated_at, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.recordset[0];
    
    // Get images
    const imagesResult = await pool.request()
      .input('productId', sql.Int, req.params.id)
      .query('SELECT id, product_id, image_url, filename, thumbnail_url, uploaded_at FROM product_images WHERE product_id = @productId');
    
    product.images = imagesResult.recordset;
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { name, description, category_id, price, stock, sku } = req.body;
    
    if (!name || !category_id || !price) {
      return res.status(400).json({ error: 'Name, category_id, and price are required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || null)
      .input('category_id', sql.Int, category_id)
      .input('price', sql.Decimal(10, 2), price)
      .input('stock', sql.Int, stock || 0)
      .input('sku', sql.NVarChar, sku || null)
      .query(`
        INSERT INTO products (name, description, category_id, price, stock, sku)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.category_id, 
               INSERTED.price, INSERTED.stock, INSERTED.sku, INSERTED.created_at, INSERTED.updated_at
        VALUES (@name, @description, @category_id, @price, @stock, @sku)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { name, description, category_id, price, stock, sku } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || null)
      .input('category_id', sql.Int, category_id)
      .input('price', sql.Decimal(10, 2), price)
      .input('stock', sql.Int, stock)
      .input('sku', sql.NVarChar, sku || null)
      .query(`
        UPDATE products 
        SET name = @name, description = @description, category_id = @category_id, 
            price = @price, stock = @stock, sku = @sku, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.category_id, 
               INSERTED.price, INSERTED.stock, INSERTED.sku, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM products WHERE id = @id');
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
