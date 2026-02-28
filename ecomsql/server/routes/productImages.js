const express = require('express');
const { getConnection, sql } = require('../config');
const upload = require('../middleware/upload');
const path = require('path');
const router = express.Router();

// Get all images for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('productId', sql.Int, req.params.productId)
      .query('SELECT id, product_id, image_url, filename, thumbnail_url, uploaded_at FROM product_images WHERE product_id = @productId ORDER BY uploaded_at DESC');
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Upload product image
router.post('/upload/:productId', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const productId = req.params.productId;
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Verify product exists
    const pool = await getConnection();
    const productCheck = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT id FROM products WHERE id = @productId');
    
    if (productCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Insert image record
    const result = await pool.request()
      .input('productId', sql.Int, productId)
      .input('imageUrl', sql.NVarChar, imageUrl)
      .input('filename', sql.NVarChar, req.file.filename)
      .query(`
        INSERT INTO product_images (product_id, image_url, filename)
        OUTPUT INSERTED.id, INSERTED.product_id, INSERTED.image_url, INSERTED.filename, INSERTED.thumbnail_url, INSERTED.uploaded_at
        VALUES (@productId, @imageUrl, @filename)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product image
router.delete('/:imageId', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Get image record
    const imageResult = await pool.request()
      .input('imageId', sql.Int, req.params.imageId)
      .query('SELECT filename FROM product_images WHERE id = @imageId');
    
    if (imageResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from database
    await pool.request()
      .input('imageId', sql.Int, req.params.imageId)
      .query('DELETE FROM product_images WHERE id = @imageId');
    
    // Delete from filesystem
    const fs = require('fs');
    const filePath = path.join(__dirname, '../uploads', imageResult.recordset[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
