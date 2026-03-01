import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ProductDetail.css';

function ProductDetail({ cartSessionId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      await axios.post('/api/cart/add', {
        sessionId: cartSessionId,
        productId: parseInt(id),
        quantity: parseInt(quantity)
      });
      setMessage('Added to cart!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setMessage('Error adding to cart');
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    setTimeout(() => navigate('/cart'), 500);
  };

  if (loading) return <div className="loading">Loading product...</div>;
  if (!product) return <div className="error">Product not found</div>;

  const images = product.images || [];

  return (
    <div className="product-detail-container">
      <div className="detail-left">
        <div className="main-image-container">
          <img
            src={images[currentImageIndex] || '/placeholder.jpg'}
            alt={product.name}
            className="main-image"
          />
        </div>
        {images.length > 1 && (
          <div className="image-thumbnails">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${product.name} ${index + 1}`}
                className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="detail-right">
        <h1>{product.name}</h1>
        <p className="category">{product.category_name}</p>
        <p className="description">{product.description}</p>

        <div className="detail-specs">
          <div className="spec">
            <span className="spec-label">SKU:</span>
            <span className="spec-value">{product.sku}</span>
          </div>
          <div className="spec">
            <span className="spec-label">Stock:</span>
            <span className="spec-value">{product.stock} units</span>
          </div>
        </div>

        <div className="price-section">
          <span className="price">${product.price.toFixed(2)}</span>
          <span className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {product.stock > 0 ? '✓ In Stock' : '✗ Out of Stock'}
          </span>
        </div>

        {product.stock > 0 && (
          <div className="quantity-section">
            <label htmlFor="quantity">Quantity:</label>
            <div className="quantity-input">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="action-buttons">
          {product.stock > 0 && (
            <>
              <button className="btn btn-primary" onClick={handleAddToCart}>
                🛒 Add to Cart
              </button>
              <button className="btn btn-success" onClick={handleBuyNow}>
                💳 Buy Now
              </button>
            </>
          )}
        </div>

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}

export default ProductDetail;
