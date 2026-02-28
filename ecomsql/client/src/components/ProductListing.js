import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getProducts, getCategories, addToCart, API_BASE_URL } from '../api';
import './ProductListing.css';

// Memoized product card component
const ProductCard = React.memo(({ product, onAddToCart }) => (
  <div className="product-card">
    <div className="product-image">
      <img 
        src={product.image_url ? `${API_BASE_URL}${product.image_url}` : 'https://via.placeholder.com/200'} 
        alt={product.name}
        loading="lazy"
        onError={(e) => { e.target.src = 'https://via.placeholder.com/200'; }}
      />
    </div>
    <div className="product-info">
      <h3>{product.name}</h3>
      <p className="category">{product.category_name}</p>
      <p className="description">{product.description}</p>
      <div className="price-section">
        <span className="price">${product.price.toFixed(2)}</span>
        <span className="stock">Stock: {product.stock}</span>
      </div>
      <button
        className="add-to-cart-btn"
        onClick={() => onAddToCart(product)}
        disabled={product.stock === 0}
      >
        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  </div>
));

ProductCard.displayName = 'ProductCard';

const ProductListing = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      
      const response = await getProducts(params);
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  const handleAddToCart = useCallback(async (product) => {
    try {
      const sessionId = localStorage.getItem('sessionId') || 'session-' + Date.now();
      localStorage.setItem('sessionId', sessionId);
      
      await addToCart({
        sessionId,
        productId: product.id,
        quantity: 1
      });
      alert('Product added to cart!');
    } catch (err) {
      alert('Failed to add to cart');
      console.error(err);
    }
  }, []);

  const memoizedProducts = useMemo(() => 
    products.map(product => (
      <ProductCard 
        key={product.id} 
        product={product} 
        onAddToCart={handleAddToCart}
      />
    )), 
    [products, handleAddToCart]
  );

  return (
    <div className="product-listing">
      <div className="filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="category-filter">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="products-grid">
          {products.length === 0 ? (
            <div className="no-products">No products found</div>
          ) : (
            memoizedProducts
          )}
        </div>
      )}
    </div>
  );
};

export default ProductListing;
