import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Checkout } from './components/Checkout';
import './App.css';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  rating: number;
  reviews: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
    checkAuth();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    if (token && storedUserId) {
      setIsAuthenticated(true);
    }
  };

  const handleAddToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.productId === product._id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.productId === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      }]);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCartItems(cartItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const handleLogin = (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', user.id);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  return (
    <Router>
      <Navbar cartCount={cartItems.length} onLogout={handleLogout} isAuthenticated={isAuthenticated} />
      
      <Routes>
        <Route path="/" element={
          <main className="main-content">
            <div className="hero">
              <h1>Welcome to eCommerce Store</h1>
              <p>Shop millions of products with great prices</p>
            </div>
            
            {loading ? (
              <div className="loading">Loading products...</div>
            ) : (
              <div className="products-grid">
                {products.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onProductClick={handleProductClick}
                  />
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={closeModal}>×</button>
                  <div className="product-details">
                    <img src={selectedProduct.image || 'https://via.placeholder.com/400'} alt={selectedProduct.name} />
                    <div className="details-info">
                      <h2>{selectedProduct.name}</h2>
                      <p className="description">{selectedProduct.description}</p>
                      <p className="price">${selectedProduct.price.toFixed(2)}</p>
                      <div className="rating">
                        {'⭐'.repeat(Math.floor(selectedProduct.rating))} ({selectedProduct.reviews} reviews)
                      </div>
                      <p className="stock">{selectedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
                      <button 
                        className="add-to-cart-btn large"
                        onClick={() => {
                          handleAddToCart(selectedProduct);
                          closeModal();
                        }}
                        disabled={selectedProduct.stock === 0}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        } />

        <Route path="/cart" element={
          <Cart
            items={cartItems}
            onRemoveItem={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateQuantity}
          />
        } />

        <Route path="/login" element={
          <Login onLoginSuccess={handleLogin} />
        } />

        <Route path="/register" element={
          <Register onRegisterSuccess={() => {}} />
        } />

        <Route path="/checkout" element={
          <Checkout
            cartItems={cartItems}
            onOrderSuccess={() => {
              setCartItems([]);
            }}
          />
        } />

        <Route path="/order-success" element={
          <div className="order-success">
            <div className="success-message">
              <h2>✓ Order Placed Successfully!</h2>
              <p>Thank you for your purchase. You will receive a confirmation email shortly.</p>
              <a href="/" className="continue-shopping-btn">Continue Shopping</a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
