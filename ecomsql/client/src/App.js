import React, { useState } from 'react';
import ProductListing from './components/ProductListing';
import ProductUpload from './components/ProductUpload';
import ImageUpload from './components/ImageUpload';
import ShoppingCart from './components/ShoppingCart';
import OrderManagement from './components/OrderManagement';
import HealthCheck from './components/HealthCheck';
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
  const [currentPage, setCurrentPage] = useState('products');

  const renderPage = () => {
    switch (currentPage) {
      case 'products':
        return <ProductListing />;
      case 'upload':
        return <ProductUpload />;
      case 'images':
        return <ImageUpload />;
      case 'cart':
        return <ShoppingCart />;
      case 'orders':
        return <OrderManagement />;
      default:
        return <ProductListing />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="App">
        <header className="app-header">
          <div className="header-container">
            <div className="header-content">
              <h1>E-Commerce Store</h1>
              <nav className="main-nav">
                <button
                  className={`nav-link ${currentPage === 'products' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('products')}
                >
                  Products
                </button>
                <button
                  className={`nav-link ${currentPage === 'upload' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('upload')}
                >
                  Add Products
                </button>
                <button
                  className={`nav-link ${currentPage === 'images' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('images')}
                >
                  Upload Images
                </button>
                <button
                  className={`nav-link ${currentPage === 'cart' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('cart')}
                >
                  Cart
                </button>
                <button
                  className={`nav-link ${currentPage === 'orders' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('orders')}
                >
                  Orders
                </button>
              </nav>
            </div>
            <HealthCheck />
          </div>
        </header>

        <main className="app-main">
          {renderPage()}
        </main>

        <footer className="app-footer">
          <p>&copy; 2026 E-Commerce Store. All rights reserved.</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
