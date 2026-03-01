import React, { useState } from 'react';

interface NavbarProps {
  cartCount: number;
  onLogout: () => void;
  isAuthenticated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, onLogout, isAuthenticated }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchQuery);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/" className="logo">✨ ShopHub</a>
        
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for products, brands and more..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" title="Search">🔍</button>
        </form>

        <div className="navbar-links">
          <a href="/categories" className="nav-link" title="Browse categories">📂 Categories</a>
          <a href="/deals" className="nav-link" title="View deals">🎉 Deals</a>
          
          {isAuthenticated ? (
            <>
              <a href="/account" className="nav-link" title="View account">👤 Account</a>
              <button onClick={onLogout} className="nav-link logout-btn" title="Logout">🚪 Logout</button>
            </>
          ) : (
            <>
              <a href="/login" className="nav-link" title="Sign in">🔐 Login</a>
              <a href="/register" className="nav-link" title="Create account">✍️ Register</a>
            </>
          )}
          
          <a href="/cart" className="cart-link" title="View shopping cart">
            🛒 Cart ({cartCount})
          </a>
        </div>
      </div>
    </nav>
  );
};
