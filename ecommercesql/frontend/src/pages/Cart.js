import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Cart.css';

function Cart({ cartSessionId }) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, [cartSessionId]);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`/api/cart/${cartSessionId}`);
      setCartItems(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      if (quantity < 1) {
        await axios.delete(`/api/cart/item/${itemId}`);
      } else {
        await axios.put(`/api/cart/item/${itemId}`, { quantity });
      }
      fetchCart();
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await axios.delete(`/api/cart/item/${itemId}`);
      fetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await axios.delete(`/api/cart/${cartSessionId}`);
        fetchCart();
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) return <div className="loading">Loading cart...</div>;

  return (
    <div className="cart-container">
      <h1>Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
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
              {cartItems.map(item => (
                <tr key={item.id}>
                  <td className="product-cell">
                    <img src={item.image_url || '/placeholder.jpg'} alt={item.name} className="item-image" />
                    <span>{item.name}</span>
                  </td>
                  <td>${item.price.toFixed(2)}</td>
                  <td className="quantity-cell">
                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                    <input type="number" value={item.quantity} readOnly />
                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  </td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    <button className="btn-remove" onClick={() => handleRemoveItem(item.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cart-summary">
            <div className="summary-section">
              <div className="summary-row">
                <span className="label">Subtotal:</span>
                <span className="value">${total.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Shipping:</span>
                <span className="value">Free</span>
              </div>
              <div className="summary-row total">
                <span className="label">Total:</span>
                <span className="value">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="cart-actions">
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Continue Shopping
              </button>
              <button className="btn btn-danger" onClick={handleClearCart}>
                Clear Cart
              </button>
              <button className="btn btn-success" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
