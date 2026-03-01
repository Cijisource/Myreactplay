const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Input validation helper
function validateProductInput(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Product name is required and must be a string');
  }
  if (!data.category_id || !Number.isInteger(Number(data.category_id))) {
    errors.push('Valid category_id is required');
  }
  if (!data.price || isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0) {
    errors.push('Valid price is required');
  }
  if (data.stock !== undefined && (!Number.isInteger(Number(data.stock)) || data.stock < 0)) {
    errors.push('Stock must be a non-negative integer');
  }
  return errors;
}

// Get all products with optional filtering and pagination
router.get('/', (req, res) => {
  const { category, page = 1, limit = 12, sortBy = 'created_at', order = 'DESC' } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT p.*, c.name as category_name,
           (SELECT GROUP_CONCAT(image_url) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    JOIN categories c ON p.category_id = c.id
  `;
  let params = [];
  
  if (category) {
    query += ' WHERE c.id = ?';
    params.push(category);
  }
  
  query += ` ORDER BY p.${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.all(query, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Parse images
    const processedProducts = products.map(p => ({
      ...p,
      images: p.images ? p.images.split(',') : []
    }));
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM products p';
    if (category) {
      countQuery += ' JOIN categories c ON p.category_id = c.id WHERE c.id = ?';
    }
    
    db.get(countQuery, category ? [category] : [], (err, countRow) => {
      res.json({
        products: processedProducts,
        total: countRow.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countRow.total / limit)
      });
    });
  });
});

// Get product by ID with images
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get images for this product
    db.all('SELECT id, image_url, thumbnail_url, filename FROM product_images WHERE product_id = ?', [id], (err, images) => {
      res.json({
        ...product,
        images: images || []
      });
    });
  });
});

// Get all categories
router.get('/categories/list', (req, res) => {
  db.all('SELECT id, name, description FROM categories ORDER BY name', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories);
  });
});

// Create new product (admin)
router.post('/', (req, res) => {
  const { name, description, category_id, price, stock, sku } = req.body;
  
  // Validate inputs
  const errors = validateProductInput({ name, category_id, price, stock });
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  // Sanitize inputs
  const sanitizedName = String(name).trim().substring(0, 255);
  const sanitizedDesc = description ? String(description).trim().substring(0, 2000) : null;
  const sanitizedSku = sku ? String(sku).trim().substring(0, 100) : null;

  db.run(
    'INSERT INTO products (name, description, category_id, price, stock, sku) VALUES (?, ?, ?, ?, ?, ?)',
    [sanitizedName, sanitizedDesc, parseInt(category_id), parseFloat(price), parseInt(stock) || 0, sanitizedSku],
      res.status(201).json({ id: this.lastID, message: 'Product created' });
    }
  );
});

// Update product
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, category_id, price, stock, sku } = req.body;
  
  const updates = [];
  const values = [];
  
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (category_id !== undefined) { updates.push('category_id = ?'); values.push(category_id); }
  if (price !== undefined) { updates.push('price = ?'); values.push(price); }
  if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
  if (sku !== undefined) { updates.push('sku = ?'); values.push(sku); }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  db.run(
    `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Product updated' });
    }
  );
});

// Delete product
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Product deleted' });
  });
});

module.exports = router;
