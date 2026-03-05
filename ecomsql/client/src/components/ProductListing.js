import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getProducts, getCategories, addToCart, API_BASE_URL } from '../api';
import ViewPhotos from './ViewPhotos';
import './ProductListing.css';

// Rating star component
const RatingStars = ({ rating = 4.5, reviewCount = 0 }) => {
  const stars = Math.round(rating);
  return (
    <div className="rating-section">
      <span className="stars">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
      {reviewCount > 0 && <span className="review-count">({reviewCount} reviews)</span>}
    </div>
  );
};

// Memoized product card component
const ProductCard = React.memo(({ product, onAddToCart, onViewPhotos }) => {
  // Build image URL - works in both local dev and Docker
  const getImageUrl = () => {
    if (!product.image_url) {
      return 'https://via.placeholder.com/300?text=No+Image';
    }
    
    // If it's an absolute URL, use it as-is
    if (product.image_url.startsWith('http')) {
      return product.image_url;
    }
    
    // If API_BASE_URL is set (local dev), use it
    if (API_BASE_URL) {
      return `${API_BASE_URL}${product.image_url}`;
    }
    
    // In Docker with relative paths, use /uploads directly
    return product.image_url;
  };

  // Calculate discount percentage (mock data - replace with actual if available)
  const originalPrice = product.original_price || (product.price * 1.4);
  const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100);
  
  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        {product.stock === 0 && <div className="out-of-stock-badge">Sold Out</div>}
        {product.stock > 0 && discountPercent > 0 && (
          <span className="sale-badge">{discountPercent}% Off</span>
        )}
        <div className="product-image">
          <img 
            src={getImageUrl()}
            alt={product.name}
            loading="lazy"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=No+Image'; }}
          />
        </div>
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        {product.category_name && <p className="category">{product.category_name}</p>}
        {product.description && <p className="description">{product.description}</p>}
        
        <RatingStars rating={product.rating || 4.5} reviewCount={product.reviewCount || 0} />
        
        <div className="price-section">
          <span className="price">₹{product.price.toFixed(0)}</span>
          {originalPrice > product.price && (
            <span className="original-price">₹{originalPrice.toFixed(0)}</span>
          )}
        </div>
        
        <div className="product-actions">
          <button
            className="add-to-cart-btn"
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button
            className="view-photos-btn"
            onClick={() => onViewPhotos(product)}
            title="View all product photos"
          >
            📸
          </button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

const ProductListing = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      
      const response = await getProducts(params);
      setProducts(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [selectedCategory, searchQuery, loadCategories, loadProducts]);

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

  const handleViewPhotos = useCallback((product) => {
    setSelectedProduct(product);
  }, []);

  const memoizedProducts = useMemo(() => 
    products.map(product => (
      <ProductCard 
        key={product.id} 
        product={product} 
        onAddToCart={handleAddToCart}
        onViewPhotos={handleViewPhotos}
      />
    )), 
    [products, handleAddToCart, handleViewPhotos]
  );

  return (
    <>
      <div className="product-listing">
        <div className="filters">
          <div className="search-bar">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="category-filter">
            <label>Category</label>
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
          <div className="loading">
            <h2>Loading Products...</h2>
            <p>Please wait while we fetch the latest products</p>
          </div>
        ) : (
          <>
            {products.length > 0 && <h2 className="section-title">Featured Products</h2>}
            <div className="products-grid">
              {products.length === 0 ? (
                <div className="no-products">
                  <h2>No Products Found</h2>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                memoizedProducts
              )}
            </div>
          </>
        )}
      </div>

      {selectedProduct && (
        <ViewPhotos
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
};

export default ProductListing;
