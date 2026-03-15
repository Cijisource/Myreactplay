import React, { useState, useEffect, useCallback } from 'react';
import { getCartItems, updateCartItem, removeFromCart, getCustomerLoyalty } from '../api';
import DiscountsAndRewards from './DiscountsAndRewards';
import Checkout from './Checkout';
import './ShoppingCart.css';

const ShoppingCart = ({ onCartCountChange, onOrderComplete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [appliedRewards, setAppliedRewards] = useState(null);
  const [customerRewards, setCustomerRewards] = useState(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  const sessionId = localStorage.getItem('sessionId');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const customerEmail = user?.userName || '';

  const loadCart = useCallback(async () => {
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
  }, [sessionId, onCartCountChange]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Load customer rewards data
  useEffect(() => {
    const loadRewards = async () => {
      if (!customerEmail) return;
      
      try {
        setRewardsLoading(true);
        const response = await getCustomerLoyalty(customerEmail);
        setCustomerRewards(response.data);
      } catch (error) {
        console.error('[ShoppingCart] Error loading customer rewards:', error);
      } finally {
        setRewardsLoading(false);
      }
    };
    
    loadRewards();
  }, [customerEmail]);

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

  // Calculate charges
  const subtotalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const GST_RATE = 0.18; // 18% GST
  const gstAmount = subtotalAmount * GST_RATE;
  const shippingCharge = 0; // Shipping calculated during checkout based on delivery location
  const discountAmount = (appliedDiscount?.amount || 0) + (appliedRewards?.discountAmount || 0);
  const totalAmount = subtotalAmount + gstAmount + shippingCharge - discountAmount;

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
            <div className="summary-breakdown">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span className="amount">₹{subtotalAmount.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>GST (18%):</span>
                <span className="amount">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span className="amount">
                  {shippingCharge === 0 ? (
                    <span style={{ color: '#28a745' }}>Free</span>
                  ) : (
                    <span style={{ color: '#FFC107' }}>₹{shippingCharge.toFixed(2)}</span>
                  )}
                </span>
              </div>
              {shippingCharge > 0 && (
                <div className="summary-row summary-note">
                  <span style={{ fontSize: '12px', color: '#666' }}>Free shipping on orders above ₹5000</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="summary-row discount-row">
                  <span style={{ color: '#FFC107', fontWeight: '600' }}>Discount:</span>
                  <span className="amount" style={{ color: '#FFC107', fontWeight: '600' }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            {/* Rewards Points Display */}
            {!rewardsLoading && customerRewards && customerRewards.available_points > 0 && (
              <div className="rewards-points-banner">
                <div className="rewards-header">
                  <span className="rewards-icon">🎁</span>
                  <div className="rewards-info">
                    <p className="rewards-label">Reward Points Available</p>
                    <p className="rewards-value">{customerRewards.available_points} points</p>
                  </div>
                </div>
                <div className="rewards-conversion">
                  <p><strong>Each point = ₹2</strong></p>
                  <p className="rewards-max">Max redemption: ₹{Math.min(customerRewards.available_points * 2, subtotalAmount + gstAmount + shippingCharge)}</p>
                </div>
              </div>
            )}
            
            {/* Discounts and Rewards Component */}
            <DiscountsAndRewards
              orderAmount={subtotalAmount + gstAmount + shippingCharge}
              customerEmail={customerEmail}
              onDiscountApplied={(discount) => setAppliedDiscount(discount)}
              onRewardsApplied={(rewards) => setAppliedRewards(rewards)}
            />
            
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
              subtotalAmount={subtotalAmount}
              gstAmount={gstAmount}
              shippingCharge={shippingCharge}
              totalAmount={totalAmount}
              appliedDiscount={appliedDiscount}
              appliedRewards={appliedRewards}
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
