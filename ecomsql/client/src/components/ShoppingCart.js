import React, { useState, useEffect, useCallback } from 'react';
import { getCartItems, updateCartItem, removeFromCart, validateDiscountCode, validateRewardCode } from '../api';
import Checkout from './Checkout';
import './ShoppingCart.css';

const ShoppingCart = ({ onCartCountChange, onOrderComplete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [rewardCode, setRewardCode] = useState('');
  const [appliedReward, setAppliedReward] = useState(null);
  const [validatingReward, setValidatingReward] = useState(false);

  const sessionId = localStorage.getItem('sessionId');

  const loadCartMemo = useCallback(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    loadCartMemo();
  }, [loadCartMemo]);

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

  // Calculate charges
  const subtotalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const GST_RATE = 0.18; // 18% GST
  const SHIPPING_FREE_ABOVE = 5000; // Free shipping above ₹5000
  
  // Apply discount or reward to subtotal first (before tax and shipping)
  const appliedPromoAmount = (appliedDiscount?.amount || 0) + (appliedReward?.amount || 0);
  const amountAfterPromo = Math.max(0, subtotalAmount - appliedPromoAmount);
  
  // Calculate tax and shipping on discounted amount
  const gstAmount = amountAfterPromo * GST_RATE;
  const shippingCharge = amountAfterPromo >= SHIPPING_FREE_ABOVE ? 0 : 99;
  const totalAmount = amountAfterPromo + gstAmount + shippingCharge;

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setMessage('Please enter a discount code');
      return;
    }

    setValidatingDiscount(true);
    setMessage('');

    try {
      const response = await validateDiscountCode(discountCode.trim(), subtotalAmount);
      
      if (response.data.success) {
        setAppliedDiscount(response.data.discount);
        setAppliedReward(null); // Remove reward if discount applied
        setMessage(`✓ Discount applied! You save ₹${response.data.discount.amount.toFixed(2)}`);
        setDiscountCode('');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid discount code';
      setMessage(errorMsg);
      setAppliedDiscount(null);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleApplyReward = async () => {
    if (!rewardCode.trim()) {
      setMessage('Please enter a reward code');
      return;
    }

    const userEmail = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : '';
    if (!userEmail) {
      setMessage('Please log in to use rewards');
      return;
    }

    setValidatingReward(true);
    setMessage('');

    try {
      const response = await validateRewardCode(rewardCode.trim(), userEmail, subtotalAmount);
      
      if (response.data.success) {
        setAppliedReward(response.data.reward);
        setAppliedDiscount(null); // Remove discount if reward applied
        setMessage(`✓ Reward applied! You save ₹${response.data.reward.amount.toFixed(2)}`);
        setRewardCode('');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid reward code';
      setMessage(errorMsg);
      setAppliedReward(null);
    } finally {
      setValidatingReward(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setMessage('Discount removed');
  };

  const handleRemoveReward = () => {
    setAppliedReward(null);
    setRewardCode('');
    setMessage('Reward removed');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (e.target.classList.contains('discount-input')) {
        handleApplyDiscount();
      } else if (e.target.classList.contains('reward-input')) {
        handleApplyReward();
      }
    }
  };

  if (loading) {
    return <div className="shopping-cart"><div className="loading">Loading cart...</div></div>;
  }

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart</h2>

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('Invalid') ? 'error' : 'success'}`}>
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

          {/* Discount & Reward Code Section */}
          <div className="promo-section">
            <div className="promo-tabs">
              <div className="promo-tab">
                <h4>Discount Code</h4>
                {!appliedDiscount ? (
                  <div className="promo-input-group">
                    <input
                      type="text"
                      placeholder="Enter discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      className="discount-input promo-input"
                    />
                    <button 
                      onClick={handleApplyDiscount}
                      disabled={validatingDiscount}
                      className="apply-promo-btn"
                    >
                      {validatingDiscount ? 'Validating...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="applied-promo">
                    <span className="promo-badge discount-badge">✓ {appliedDiscount.code}</span>
                    <span className="promo-description">{appliedDiscount.description}</span>
                    <button 
                      onClick={handleRemoveDiscount}
                      className="remove-promo-btn"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="promo-tab">
                <h4>Reward Code</h4>
                {!appliedReward ? (
                  <div className="promo-input-group">
                    <input
                      type="text"
                      placeholder="Enter reward code"
                      value={rewardCode}
                      onChange={(e) => setRewardCode(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      className="reward-input promo-input"
                    />
                    <button 
                      onClick={handleApplyReward}
                      disabled={validatingReward}
                      className="apply-promo-btn"
                    >
                      {validatingReward ? 'Validating...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="applied-promo">
                    <span className="promo-badge reward-badge">✓ {appliedReward.code}</span>
                    <span className="promo-description">Reward from previous order</span>
                    <button 
                      onClick={handleRemoveReward}
                      className="remove-promo-btn"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="cart-summary">
            <div className="summary-breakdown">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span className="amount">₹{subtotalAmount.toFixed(2)}</span>
              </div>
              
              {appliedDiscount && (
                <div className="summary-row promo-row">
                  <span>Discount ({appliedDiscount.code}):</span>
                  <span className="amount promo-amount">-₹{appliedDiscount.amount.toFixed(2)}</span>
                </div>
              )}

              {appliedReward && (
                <div className="summary-row promo-row">
                  <span>Reward ({appliedReward.code}):</span>
                  <span className="amount promo-amount">-₹{appliedReward.amount.toFixed(2)}</span>
                </div>
              )}

              <div className="summary-row">
                <span>Amount After Promo:</span>
                <span className="amount">₹{amountAfterPromo.toFixed(2)}</span>
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
                    `₹${shippingCharge.toFixed(2)}`
                  )}
                </span>
              </div>
              {shippingCharge > 0 && (
                <div className="summary-row summary-note">
                  <span style={{ fontSize: '12px', color: '#666' }}>Free shipping on orders above ₹5000</span>
                </div>
              )}
            </div>
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
              discountAmount={appliedDiscount?.amount}  
              discountCode={appliedDiscount?.code}
              rewardAmount={appliedReward?.amount}
              rewardCode={appliedReward?.code}
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

