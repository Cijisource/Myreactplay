import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Navigation.css';

function Navigation({ cartSessionId }) {
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCartCount();
  }, [cartSessionId]);

  const fetchCartCount = async () => {
    try {
      const response = await axios.get(`/api/cart/${cartSessionId}`);
      setCartCount(response.data.count);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          📦 E-Commerce Store
        </Link>
        
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="nav-menu">
          <Link to="/upload" className="nav-link">Upload Photos</Link>
          <Link to="/cart" className="nav-link cart-link">
            🛒 Cart ({cartCount})
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
