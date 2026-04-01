import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProductListing from './components/ProductListing';
import Wishlist from './components/Wishlist';
import RefundPolicy from './components/RefundPolicy';
import ProductDetail from './components/ProductDetail';
import ProductUpload from './components/ProductUpload';
import ProductManagement from './components/ProductManagement';
import EditProduct from './components/EditProduct';
import ProductImagesManagement from './components/ProductImagesManagement';
import CategoryManagement from './components/CategoryManagement';
import ImageUpload from './components/ImageUpload';
import ShoppingCart from './components/ShoppingCart';
import OrderManagement from './components/OrderManagement';
import RewardsManagement from './components/RewardsManagement';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import SearchableCategoryDropdown from './components/SearchableCategoryDropdown';
import { RoleBasedRoute } from './components/ProtectedRoute';
import { getUser, hasRole, hasAnyRole, isAuthenticated } from './utils/authUtils';
import { getCartItems, getCategories } from './api';
import { useDebounce } from './utils/useDebounce';
import './App.css';

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>⚠️ Error Loading Page</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route
            path="/*"
            element={<MainApp />}
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [managingImagesProduct, setManagingImagesProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    }
  }, []);

  const updateCartCount = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        setCartCount(0);
        return;
      }
      const response = await getCartItems(sessionId);
      const items = Array.isArray(response.data) ? response.data : [];
      setCartCount(items.length);
    } catch (err) {
      console.error('Error fetching cart count:', err);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    updateCartCount();
    loadCategories();
  }, [updateCartCount, loadCategories]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const handleSearch = () => {
    console.log('Search button clicked');
    console.log('Search query:', searchQuery);
    if (searchQuery.trim()) {
      setCurrentPage('products');
    } else {
      alert('Please enter a search term');
    }
  };

  const handleClearSearch = () => {
    console.log('[App] Clearing search');
    setSearchQuery('');
    setCurrentPage('products');
  };

  const renderPage = () => {
    // Redirect to login if trying to access protected pages
    const protectedPages = ['cart', 'orders', 'profile'];
    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '20px',
          background: '#f5f5f5'
        }}>
          <h2 style={{ color: '#0066cc', marginBottom: '10px' }}>Login Required</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Please log in to access this feature.
          </p>
          <div>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                padding: '12px 24px',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginRight: '10px'
              }}
            >
              Login
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              style={{
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Register
            </button>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'products':
        return (
          <ProductListing 
            searchQuery={debouncedSearchQuery} 
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onViewProductDetail={(productId) => {
              setSelectedProductId(productId);
              setCurrentPage('productDetail');
            }}
            onProductAdded={updateCartCount}
            isAuthenticated={isAuthenticated()}
            user={user}
          />
        );
      case 'productDetail':
        return (
          <ProductDetail 
            productId={selectedProductId}
            onBackClick={() => setCurrentPage('products')}
            isAuthenticated={isAuthenticated()}
            user={user}
          />
        );
      case 'upload':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <ProductUpload />
          </RoleBasedRoute>
        );
      case 'manage':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <>
              <ProductManagement 
                onEditProduct={(product) => setEditingProduct(product)}
                onManageImages={(product) => setManagingImagesProduct(product)}
              />
              {editingProduct && (
                <EditProduct
                  product={editingProduct}
                  onClose={() => setEditingProduct(null)}
                  onSaved={() => {
                    setEditingProduct(null);
                    // Refresh product management list
                  }}
                />
              )}
              {managingImagesProduct && (
                <ProductImagesManagement
                  product={managingImagesProduct}
                  onClose={() => setManagingImagesProduct(null)}
                />
              )}
            </>
          </RoleBasedRoute>
        );
      case 'categories':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <CategoryManagement onClose={() => setCurrentPage('manage')} />
          </RoleBasedRoute>
        );
      case 'images':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <ImageUpload />
          </RoleBasedRoute>
        );
      case 'cart':
        return (
          <ShoppingCart 
            onCartCountChange={setCartCount}
            onOrderComplete={() => setCurrentPage('orders')}
          />
        );
      case 'orders':
        return <OrderManagement />;
      case 'rewards':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <RewardsManagement />
          </RoleBasedRoute>
        );
      case 'admin':
        return (
          <RoleBasedRoute requiredRole={['Administrator', 'Seller']}>
            <AdminPanel />
          </RoleBasedRoute>
        );
      case 'profile':
        return <UserProfile />;
      default:
        return (
          <ProductListing 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            onViewProductDetail={(productId) => {
              setSelectedProductId(productId);
              setCurrentPage('productDetail');
            }}
            onProductAdded={updateCartCount}
            isAuthenticated={isAuthenticated()}
            user={user}
          />
        );
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-container">
          <div className="header-content">
            <h1>� VSS-Vault</h1>
          </div>
          {!isAuthenticated() && (
            <nav className="main-nav">
              <button
                className={`nav-link ${currentPage === 'products' ? 'active' : ''}`}
                onClick={() => setCurrentPage('products')}
              >
                Browse
              </button>
            </nav>
          )}
          {isAuthenticated() && (
            <nav className="main-nav">
              <button
                className={`nav-link ${currentPage === 'products' ? 'active' : ''}`}
                onClick={() => setCurrentPage('products')}
              >
                Browse
              </button>
              <button
                className={`nav-link ${currentPage === 'orders' ? 'active' : ''}`}
                onClick={() => setCurrentPage('orders')}
              >
                My Orders
              </button>
              <button
                className={`nav-link ${currentPage === 'cart' ? 'active' : ''}`}
                onClick={() => setCurrentPage('cart')}
                style={{ position: 'relative' }}
              >
                Shopping Cart
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#FF9900',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid white'
                  }}>
                    {cartCount}
                  </span>
                )}
              </button>
              {user && (hasRole('Seller') || hasRole('Administrator')) && (
                <>
                  <button
                    className={`nav-link ${currentPage === 'upload' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('upload')}
                  >
                    📝 New Product
                  </button>
                  <button
                    className={`nav-link ${currentPage === 'manage' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('manage')}
                  >
                    📦 My Products
                  </button>
                  <button
                    className={`nav-link ${currentPage === 'categories' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('categories')}
                  >
                    📋 Categories
                  </button>
                  <button
                    className={`nav-link ${currentPage === 'rewards' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('rewards')}
                  >
                    🎁 Rewards
                  </button>
                </>
              )}
              {user && hasAnyRole(['Administrator', 'Seller']) && (
                <button
                  className={`nav-link admin-link ${currentPage === 'admin' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('admin')}
                >
                  🔐 Admin
                </button>
              )}
              {user && (
                <div className="nav-user-section">
                  <button 
                    onClick={() => setCurrentPage('profile')} 
                    className={`nav-link nav-name ${currentPage === 'profile' ? 'active' : ''}`}
                  >
                    👤 {user.name}
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="nav-link logout-nav"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </nav>
          )}
          
          {/* Search box visible to all users (authenticated and unauthenticated) */}
          <div className="header-search">
            <input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => {
                console.log('[App] Search input changed:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              title="Type to search products (searches automatically after 500ms of inactivity)"
            />
            <SearchableCategoryDropdown 
              categories={categories}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              placeholder="All Categories"
            />
            <button 
              onClick={handleSearch}
              style={{
                position: 'relative',
                opacity: searchQuery !== debouncedSearchQuery ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
              title={searchQuery !== debouncedSearchQuery ? 'Searching...' : 'Search'}
            >
              {searchQuery !== debouncedSearchQuery ? '⏳' : '🔍'}
            </button>
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                style={{
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: '8px',
                  transition: 'all 0.3s ease',
                  fontSize: '14px',
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(220, 53, 69, 0.25)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #c82333 0%, #a91e2c 100%)';
                  e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.35)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
                  e.target.style.boxShadow = '0 2px 6px rgba(220, 53, 69, 0.25)';
                  e.target.style.transform = 'translateY(0)';
                }}
                title="Clear search"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {!isAuthenticated() && (
            <div className="header-icons">
              <div className="header-icon">
                <button 
                  onClick={() => window.location.href = '/login'}
                  style={{
                    padding: '10px 16px',
                    background: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginRight: '8px'
                  }}
                >
                  Login
                </button>
                <button 
                  onClick={() => window.location.href = '/register'}
                  style={{
                    padding: '10px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>
          &copy; 2026 VSS-Vault. Secure Vault For Digital Assets. | Fast & Reliable Service
          {' | '}
          <Link to="/refund-policy" style={{ color: '#0066cc', textDecoration: 'underline', marginLeft: 8 }}>
            Refunds & Return Policy
          </Link>
          {' | '}
          <Link to="/wishlist" style={{ color: '#FF9900', textDecoration: 'underline', marginLeft: 8 }}>
            My Wishlist
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default App;
