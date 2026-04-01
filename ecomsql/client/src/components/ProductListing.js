import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getProducts, addToCart, API_BASE_URL, getWishlist } from '../api';
import { SearchCache } from '../utils/useDebounce';
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
const ProductCard = React.memo(({ product, onAddToCart, onViewPhotos, isAuthenticated, isWishlisted, onWishlistAdd }) => {
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
    <div className={`product-card${isWishlisted ? ' wishlisted' : ''}`}>
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
          {isAuthenticated && (
            <>
              <button
                className={`wishlist-btn${isWishlisted ? ' wishlisted' : ''}`}
                onClick={async () => {
                  try {
                    await import('../api').then(({ addToWishlist }) => addToWishlist(product.id));
                    if (onWishlistAdd) onWishlistAdd(product.id);
                  } catch (err) {
                    // Optionally show error in card
                  }
                }}
                title={isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                disabled={isWishlisted}
              >
                {isWishlisted ? '♥' : '♡'}
              </button>
              {isWishlisted && <div className="wishlist-message">Added to wishlist!</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

const ProductListing = ({ searchQuery: externalSearchQuery, setSearchQuery: externalSetSearchQuery, selectedCategory: externalSelectedCategory, setSelectedCategory: externalSetSelectedCategory, onViewProductDetail, onProductAdded, isAuthenticated = false, user = null }) => {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  // Used to trigger re-render for wishlist message
  const [wishlistAdded, setWishlistAdded] = useState([]);
    // Load wishlist for highlighting
    useEffect(() => {
      if (!isAuthenticated) {
        setWishlistIds([]);
        return;
      }
      getWishlist().then(res => {
        if (Array.isArray(res.data)) {
          setWishlistIds(res.data.map(item => item.product_id));
        }
      }).catch(() => setWishlistIds([]));
    }, [isAuthenticated]);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(externalSelectedCategory || '');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Create a cache instance that persists across renders
  const cacheRef = useRef(new SearchCache());

  // Store the callback for ProductCard to use
  ProductCard.onViewDetail = onViewProductDetail;

  // Use external search query if provided
  useEffect(() => {
    console.log('[ProductListing] External search query changed:', externalSearchQuery);
    setSearchQuery(externalSearchQuery || '');
  }, [externalSearchQuery]);

  // Use external selected category if provided
  useEffect(() => {
    console.log('[ProductListing] External selected category changed:', externalSelectedCategory);
    setSelectedCategory(externalSelectedCategory || '');
  }, [externalSelectedCategory]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      
      // Check cache first
      const cacheKey = `${searchQuery}|${selectedCategory}`;
      const cachedResults = cacheRef.current.getIfValid(searchQuery, selectedCategory);
      
      if (cachedResults) {
        console.log('[ProductListing] Using cached results for:', cacheKey);
        setProducts(cachedResults);
        setError(null);
        setLoading(false);
        return;
      }
      
      console.log('[ProductListing] Loading products with params:', params);
      const response = await getProducts(params);
      
      // Handle both old format (array) and new format (object with data property)
      let loadedProducts = [];
      if (Array.isArray(response.data)) {
        loadedProducts = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        loadedProducts = response.data.data;
      }
      
      // Cache the results
      cacheRef.current.set(searchQuery, loadedProducts, selectedCategory);
      
      console.log('[ProductListing] Products loaded:', loadedProducts.length, 'items');
      setProducts(loadedProducts);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('[ProductListing] Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    console.log('[ProductListing] Category or search changed - loading products');
    loadProducts();
  }, [selectedCategory, searchQuery, loadProducts]);

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
        isWishlisted={wishlistIds.includes(product.id) || wishlistAdded.includes(product.id)}
        onWishlistAdd={id => setWishlistAdded(prev => [...prev, id])}
      />
    )), 
    [products, handleAddToCart, handleViewPhotos, isAuthenticated, wishlistIds, wishlistAdded]
  );
// Add style for wishlist message

  return (
    <>
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-icon">{notification.icon}</span>
          <span className="notification-message">{notification.message}</span>
        </div>
      )}
      <div className="product-listing">

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
