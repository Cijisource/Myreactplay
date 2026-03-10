import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductListing from './components/ProductListing';
import ProductUpload from './components/ProductUpload';
import ImageUpload from './components/ImageUpload';
import ShoppingCart from './components/ShoppingCart';
import OrderManagement from './components/OrderManagement';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import { ProtectedRoute, RoleBasedRoute } from './components/ProtectedRoute';
import { getUser, isAuthenticated, hasRole } from './utils/authUtils';
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
          
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
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

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

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
    switch (currentPage) {
      case 'products':
        return <ProductListing searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case 'upload':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <ProductUpload />
          </RoleBasedRoute>
        );
      case 'images':
        return (
          <RoleBasedRoute requiredRole="Seller">
            <ImageUpload />
          </RoleBasedRoute>
        );
      case 'cart':
        return <ShoppingCart />;
      case 'orders':
        return <OrderManagement />;
      case 'admin':
        return (
          <RoleBasedRoute requiredRole="Administrator">
            <AdminPanel />
          </RoleBasedRoute>
        );
      case 'profile':
        return <UserProfile />;
      default:
        return <ProductListing searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-container">
          <div className="header-content">
            <h1>� VSS-Vault</h1>
          </div>

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
            />
            <button onClick={handleSearch}>Search</button>
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: '8px',
                  transition: 'all 0.3s'
                }}
                title="Clear search"
              >
                ✕ Clear
              </button>
            )}
          </div>

          <div className="header-icons">
            <div className="header-icon" onClick={() => setCurrentPage('cart')} style={{ cursor: 'pointer' }}>
              🛒 Cart
            </div>
            <div className="header-icon" onClick={() => setCurrentPage('orders')} style={{ cursor: 'pointer' }}>
              📦 Orders
            </div>
            <div className="header-icon">
              {user && (
                <div className="user-menu">
                  <button onClick={() => setCurrentPage('profile')} className="user-button">
                    👤 {user.name}
                  </button>
                  <button onClick={handleLogout} className="logout-button">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <nav className="main-nav">
            <button
              className={`nav-link ${currentPage === 'products' ? 'active' : ''}`}
              onClick={() => setCurrentPage('products')}
            >
              Browse
            </button>
            <button
              className={`nav-link ${currentPage === 'upload' ? 'active' : ''}`}
              onClick={() => setCurrentPage('upload')}
            >
              Sell
            </button>
            <button
              className={`nav-link ${currentPage === 'images' ? 'active' : ''}`}
              onClick={() => setCurrentPage('images')}
            >
              Media
            </button>
            {user && hasRole('Administrator') && (
              <button
                className={`nav-link admin-link ${currentPage === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentPage('admin')}
              >
                🔐 Admin
              </button>
            )}
            <button
              className={`nav-link ${currentPage === 'cart' ? 'active' : ''}`}
              onClick={() => setCurrentPage('cart')}
            >
              Shopping Cart
            </button>
            <button
              className={`nav-link ${currentPage === 'orders' ? 'active' : ''}`}
              onClick={() => setCurrentPage('orders')}
            >
              My Orders
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 VSS-Vault. Secure Vault For Digital Assets. | Fast & Reliable Service</p>
      </footer>
    </div>
  );
}

export default App;
