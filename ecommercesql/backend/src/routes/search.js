const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Input sanitization
function sanitizeSearchInput(input) {
  return String(input).trim().substring(0, 100);
}

function validatePrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0 ? num : null;
}

// Search products by query
router.get('/', (req, res) => {
  const { q, category, minPrice, maxPrice, page = 1, limit = 12 } = req.query;

  if (!q || sanitizeSearchInput(q).length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // Sanitize and validate inputs
  const sanitizedQuery = sanitizeSearchInput(q);
  const searchTerm = `%${sanitizedQuery}%`;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12)); // Max 100 items per page
  const offset = (pageNum - 1) * limitNum;
  
  let query = `
    SELECT p.*, c.name as category_name,
           (SELECT GROUP_CONCAT(image_url) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)
  `;
  let params = [searchTerm, searchTerm, searchTerm];
  
  if (category) {
    const catId = parseInt(category);
    if (!isNaN(catId)) {
      query += ' AND c.id = ?';
      params.push(catId);
    }
  }
  
  if (minPrice !== undefined) {
    const minVal = validatePrice(minPrice);
    if (minVal !== null) {
      query += ' AND p.price >= ?';
      params.push(minVal);
    }
  }
  
  if (maxPrice !== undefined) {
    const maxVal = validatePrice(maxPrice);
    if (maxVal !== null) {
      query += ' AND p.price <= ?';
      params.push(maxVal);
    }
  }
  
  query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);
  
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
    let countQuery = `
      SELECT COUNT(*) as total FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)
    `;
    let countParams = [searchTerm, searchTerm, searchTerm];
    
    if (category) {
      const catId = parseInt(category);
      if (!isNaN(catId)) {
        countQuery += ' AND c.id = ?';
        countParams.push(catId);
      }
    }
    if (minPrice !== undefined) {
      const minVal = validatePrice(minPrice);
      if (minVal !== null) {
        countQuery += ' AND p.price >= ?';
        countParams.push(minVal);
      }
    }
    if (maxPrice !== undefined) {
      const maxVal = validatePrice(maxPrice);
      if (maxVal !== null) {
        countQuery += ' AND p.price <= ?';
        countParams.push(maxVal);
      }
    }
    
    db.get(countQuery, countParams, (err, countRow) => {
      // Log search query
      db.run(
        'INSERT INTO search_history (session_id, search_query, results_count) VALUES (?, ?, ?)',
        ['anonymous', sanitizedQuery, countRow.total],
        (logErr) => {
          // Continue regardless of logging result
        }
      );
      
      res.json({
        query: sanitizedQuery,
        products: processedProducts,
        total: countRow.total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(countRow.total / limitNum)
      });
    });
  });
});

// Get popular search terms
router.get('/trends/popular', (req, res) => {
  db.all(`
    SELECT search_query, COUNT(*) as count
    FROM search_history
    GROUP BY search_query
    ORDER BY count DESC
    LIMIT 10
  `, (err, trends) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(trends);
  });
});

module.exports = router;
