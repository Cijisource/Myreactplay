import React, { useState, useEffect } from 'react';
import { getCartItems, updateCartItem, removeFromCart } from '../api';
import Checkout from './Checkout';
import './ShoppingCart.css';

const ShoppingCart = ({ onCartCountChange, onOrderComplete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  const sessionId = localStorage.getItem('sessionId');

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      if (!sessionId) {
        setItems([]);
        onCartCountChange && onCartCountChange(0);
        setLoading(false);
        return;
      }

      const response = await getCartItems(sessionId);
      const cartItems = Array.isArray(response.data) ? response.data : [];
      setItems(cartItems);
      onCartCountChange && onCartCountChange(cartItems.length);
    } catch (err) {
      setMessage('Error loading cart');
      console.error(err);
      onCartCountChange && onCartCountChange(0);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      await updateCartItem(itemId, { quantity: newQuantity });
      await loadCart();
    } catch (err) {
      setMessage('Error updating quantity');
      console.error(err);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removeFromCart(itemId);
      await loadCart();
    } catch (err) {
      setMessage('Error removing item');
      console.error(err);
    }
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    loadCart(); // Reload cart in case order was created
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return <div className="shopping-cart"><div className="loading">Loading cart...</div></div>;
  }

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart</h2>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
        </div>
      ) : (
        <div className="cart-container">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>₹{item.price.toFixed(2)}</td>
                  <td>
                    <div className="quantity-control">
                      <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)}>-</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        min="1"
                      />
                      <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</button>
                    </div>
                  </td>
                  <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cart-summary">
            <div className="total">
              <span>Total:</span>
              <span className="amount">₹{totalAmount.toFixed(2)}</span>
            </div>
            <button className="checkout-btn" onClick={() => setShowCheckout(true)}>
              Proceed to Checkout
            </button>
          </div>

          {showCheckout && (
            <Checkout 
              cartItems={items}
              totalAmount={totalAmount}
              onClose={handleCheckoutClose}
              onOrderComplete={onOrderComplete}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;
