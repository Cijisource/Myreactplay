import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CheckoutProps {
  cartItems: any[];
  onOrderSuccess: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ cartItems, onOrderSuccess }) => {
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          items: cartItems,
          total,
          shippingAddress: shippingInfo
        })
      });

      if (!response.ok) {
        throw new Error('Order failed');
      }

      onOrderSuccess();
      navigate('/order-success');
    } catch (err) {
      setError('Failed to place order. Please try again.');
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-form">
        <h2>🛍️ Checkout</h2>
        {error && <div className="error-message">❌ {error}</div>}
        
        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>📦 Shipping Information</legend>
            <div className="form-row">
              <input type="text" name="name" placeholder="Full Name" value={shippingInfo.name} onChange={handleChange} required aria-label="Full name" />
              <input type="email" name="email" placeholder="Email Address" value={shippingInfo.email} onChange={handleChange} required aria-label="Email" />
            </div>
            <div className="form-row">
              <input type="tel" name="phone" placeholder="Phone Number" value={shippingInfo.phone} onChange={handleChange} required aria-label="Phone number" />
              <input type="text" name="street" placeholder="Street Address" value={shippingInfo.street} onChange={handleChange} required aria-label="Street" />
            </div>
            <div className="form-row">
              <input type="text" name="city" placeholder="City" value={shippingInfo.city} onChange={handleChange} required aria-label="City" />
              <input type="text" name="state" placeholder="State/Province" value={shippingInfo.state} onChange={handleChange} required aria-label="State" />
              <input type="text" name="zipCode" placeholder="ZIP/Postal Code" value={shippingInfo.zipCode} onChange={handleChange} required aria-label="ZIP code" />
            </div>
          </fieldset>

          <div className="order-summary">
            <h3>📋 Order Summary</h3>
            <p>
              <span>Items ({cartItems.length}):</span>
              <span>${(total - 0).toFixed(2)}</span>
            </p>
            <p>
              <span>Shipping:</span>
              <span>Free</span>
            </p>
            <p className="total">
              <span>Order Total:</span>
              <span>${total.toFixed(2)}</span>
            </p>
          </div>

          <button type="submit" className="place-order-btn">✅ Place Order</button>
        </form>
      </div>
    </div>
  );
};
