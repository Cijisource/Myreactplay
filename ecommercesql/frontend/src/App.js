import React, { useState, useEffect } from 'react';
import './App.css';
import Navigation from './components/Navigation';
import ProductList from './components/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Search from './pages/Search';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Upload from './pages/Upload';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [cartSessionId, setCartSessionId] = useState(() => {
    const stored = localStorage.getItem('cartSessionId');
    if (stored) return stored;
    const newId = uuidv4();
    localStorage.setItem('cartSessionId', newId);
    return newId;
  });

  return (
    <Router>
      <div className="App">
        <Navigation cartSessionId={cartSessionId} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/product/:id" element={<ProductDetail cartSessionId={cartSessionId} />} />
            <Route path="/cart" element={<Cart cartSessionId={cartSessionId} />} />
            <Route path="/search" element={<Search />} />
            <Route path="/checkout" element={<Checkout cartSessionId={cartSessionId} />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
