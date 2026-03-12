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
const ProductCard = React.memo(({ product, onAddToCart, onViewPhotos, isAuthenticated }) => {
  // Build image URL - works in both local dev and Docker
  const getImageUrl = () => {
    if (!product.image_url) {
      return 'https://via.placeholder.com/300?text=No+Image';
    }
    console.log('Original image URL:', product.image_url);
    // If it's an absolute URL, use it as-is
    if (product.image_url.startsWith('http')) {
      return product.image_url;
    }
    
    // If API_BASE_URL is set (local dev), use it
    if (API_BASE_URL) {
      console.log('Using API_BASE_URL:', API_BASE_URL);
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
      <div 
        className="product-image-wrapper"
        onClick={() => {
          if (ProductCard.onViewDetail) {
            ProductCard.onViewDetail(product.id);
          }
        }}
        style={{ cursor: 'pointer' }}
      >
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
            style={isAuthenticated ? {} : { background: '#ff9800', cursor: product.stock === 0 ? 'not-allowed' : 'pointer' }}
          >
            {product.stock === 0 ? 'Out of Stock' : (isAuthenticated ? 'Add to Cart' : 'Login to Add')}
          </button>
          <button
            className="view-details-btn"
            onClick={() => {
              if (ProductCard.onViewDetail) {
                ProductCard.onViewDetail(product.id);
              }
            }}
            title="View product details"
          >
            👁️
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

const ProductListing = ({ searchQuery: externalSearchQuery, setSearchQuery: externalSetSearchQuery, onViewProductDetail, onProductAdded, isAuthenticated = false, user = null }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [notification, setNotification] = useState(null);

  // Store the callback for ProductCard to use
  ProductCard.onViewDetail = onViewProductDetail;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Use external search query if provided
  useEffect(() => {
    console.log('[ProductListing] External search query changed:', externalSearchQuery);
    setSearchQuery(externalSearchQuery || '');
  }, [externalSearchQuery]);

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
      
      console.log('[ProductListing] Loading products with params:', params);
      const response = await getProducts(params);
      console.log('[ProductListing] Products loaded:', response.data?.length, 'items');
      setProducts(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('[ProductListing] Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    console.log('[ProductListing] Dependency changed - loading products');
    loadCategories();
    loadProducts();
  }, [selectedCategory, searchQuery, loadCategories, loadProducts]);

  const handleAddToCart = useCallback(async (product) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Show modal or notification prompting to login
      const shouldLogin = window.confirm(
        'You need to be logged in to add items to cart. Would you like to login?'
      );
      if (shouldLogin) {
        window.location.href = '/login';
      }
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId') || 'session-' + Date.now();
      localStorage.setItem('sessionId', sessionId);
      
      await addToCart({
        sessionId,
        productId: product.id,
        quantity: 1
      });
      
      // Show notification
      setNotification({
        icon: '✓',
        message: 'Product added to cart!',
        type: 'success'
      });
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
      
      // Notify parent component to update cart count
      if (onProductAdded) {
        onProductAdded();
      }
    } catch (err) {
      setNotification({
        icon: '✕',
        message: 'Failed to add to cart',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      console.error(err);
    }
  }, [onProductAdded, isAuthenticated]);

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
        isAuthenticated={isAuthenticated}
      />
    )), 
    [products, handleAddToCart, handleViewPhotos, isAuthenticated]
  );

  return (
    <>
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-icon">{notification.icon}</span>
          <span className="notification-message">{notification.message}</span>
        </div>
      )}
      <div className="product-listing">
        <div className="filters">
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
