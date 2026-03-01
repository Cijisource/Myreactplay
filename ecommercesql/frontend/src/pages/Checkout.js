import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Checkout.css';

function Checkout({ cartSessionId }) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    shippingAddress: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customerName || !formData.customerEmail || !formData.shippingAddress) {
      setError('Please fill in all fields');
      return;
    }

    if (cartItems.length === 0) {
      setError('Cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/orders', {
        cartSessionId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        shippingAddress: formData.shippingAddress
      });

      // Store order info for confirmation page
      localStorage.setItem('lastOrder', JSON.stringify(response.data));
      navigate('/order-confirmation');
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.response?.data?.error || 'Error creating order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading checkout...</div>;

  return (
    <div className="checkout-container">
      <div className="checkout-content">
        <div className="checkout-form-section">
          <h1>Checkout</h1>
          <form onSubmit={handleSubmit} className="checkout-form">
            {error && <div className="error-message">{error}</div>}

            <fieldset className="form-section">
              <legend>Billing Information</legend>

              <div className="form-group">
                <label htmlFor="customerName">Full Name *</label>
                <input
                  id="customerName"
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="customerEmail">Email Address *</label>
                <input
                  id="customerEmail"
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="shippingAddress">Shipping Address *</label>
                <textarea
                  id="shippingAddress"
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleInputChange}
                  placeholder="123 Main St, City, State ZIP"
                  rows="4"
                  required
                />
              </div>
            </fieldset>

            <button type="submit" className="btn btn-success" disabled={submitting}>
              {submitting ? 'Processing...' : 'Complete Purchase'}
            </button>
          </form>
        </div>

        <div className="checkout-summary-section">
          <h2>Order Summary</h2>
          <div className="order-items">
            {cartItems.map(item => (
              <div key={item.id} className="order-item">
                <span className="item-name">{item.name}</span>
                <span className="item-qty">x{item.quantity}</span>
                <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="order-total">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="total-row final">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
