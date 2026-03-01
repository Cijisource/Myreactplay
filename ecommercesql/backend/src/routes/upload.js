const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');

// File validation
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (reduced for security)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and add timestamp
    const sanitized = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(sanitized));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      // Additional check: verify file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (validExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file extension.'), false);
      }
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  }
});

// Upload image for product
router.post('/image/:productId', upload.single('file'), (req, res) => {
  const { productId } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  
  // Check if product exists
  db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    
    db.run(
      'INSERT INTO product_images (product_id, image_url, filename) VALUES (?, ?, ?)',
      [productId, imageUrl, req.file.filename],
      function(err) {
        if (err) {
          fs.unlinkSync(req.file.path);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          id: this.lastID,
          imageUrl,
          filename: req.file.filename,
          message: 'Image uploaded successfully'
        });
      }
    );
  });
});

// Delete product image
router.delete('/image/:imageId', (req, res) => {
  const { imageId } = req.params;
  
  db.get('SELECT filename FROM product_images WHERE id = ?', [imageId], (err, image) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    db.run('DELETE FROM product_images WHERE id = ?', [imageId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Delete actual file
      const filePath = path.join(__dirname, '../../uploads', image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ message: 'Image deleted' });
    });
  });
});

module.exports = router;
