import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { createOrder } from '../api';
import './Checkout.css';

const Checkout = ({ cartItems, totalAmount, onClose }) => {
  const sessionId = localStorage.getItem('sessionId');
  const [step, setStep] = useState('details'); // 'details' -> 'payment' -> 'confirmation'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('gpay');
  const [qrValue, setQrValue] = useState('');
  const [orderId, setOrderId] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    city: '',
    zipCode: ''
  });

  // Generate UPI/GPay QR code
  useEffect(() => {
    if (step === 'payment' && selectedPayment === 'gpay') {
      const upiString = `upi://pay?pa=business@gpay&pn=VSS-Vault&am=${totalAmount}&tn=Order Payment`;
      setQrValue(upiString);
    }
  }, [step, selectedPayment, totalAmount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateDetails = () => {
    if (!formData.customerName.trim()) {
      setMessage('Please enter your name');
      return false;
    }
    if (!formData.customerEmail.trim()) {
      setMessage('Please enter your email');
      return false;
    }
    if (!formData.customerPhone.trim()) {
      setMessage('Please enter your phone number');
      return false;
    }
    if (!formData.shippingAddress.trim()) {
      setMessage('Please enter your address');
      return false;
    }
    if (!formData.city.trim()) {
      setMessage('Please enter your city');
      return false;
    }
    if (!formData.zipCode.trim()) {
      setMessage('Please enter your zip code');
      return false;
    }
    return true;
  };

  const handleContinueToPayment = () => {
    setMessage('');
    if (validateDetails()) {
      setStep('payment');
    }
  };

  const handlePaymentSubmit = async () => {
    setLoading(true);
    setMessage('');
    try {
      // Create order
      const response = await createOrder({
        sessionId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        shippingAddress: `${formData.shippingAddress}, ${formData.city} - ${formData.zipCode}`,
        items: cartItems.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount,
        paymentMethod: selectedPayment
      });

      setOrderId(response.data?.id || response.data?.orderId || 'ORD-' + Date.now());
      setStep('confirmation');
      
      // Call completion callback after showing confirmation
      setTimeout(() => {
        onClose && onClose();
      }, 3000);
    } catch (err) {
      setMessage('Error processing order: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const qrCanvas = document.querySelector('canvas');
    const url = qrCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-qr-${Date.now()}.png`;
    link.click();
  };

  // Step 1: Customer Details
  if (step === 'details') {
    return (
      <div className="checkout-modal">
        <div className="checkout-container">
          <div className="checkout-header">
            <h2>Shipping Information</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="checkout-content">
            <div className="order-summary-sidebar">
              <h3>Order Summary</h3>
              <div className="order-items">
                {cartItems.map(item => (
                  <div key={item.id} className="order-item">
                    <div className="item-details">
                      <p className="item-name">{item.product_name}</p>
                      <span className="item-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="order-total">
                <h4>Total Amount</h4>
                <p className="total-price">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <form className="checkout-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Shipping Address *</label>
                <textarea
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleInputChange}
                  placeholder="Enter your complete address"
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter your city"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Zip Code *</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="Enter zip code"
                    required
                  />
                </div>
              </div>

              {message && <div className="error-message">{message}</div>}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleContinueToPayment}
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Payment Method
  if (step === 'payment') {
    return (
      <div className="checkout-modal">
        <div className="checkout-container">
          <div className="checkout-header">
            <h2>Payment Method</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="checkout-content payment-step">
            <div className="payment-options">
              <h3>Select Payment Method</h3>
              
              <div className="payment-method-group">
                <label className={`payment-option ${selectedPayment === 'gpay' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="gpay"
                    checked={selectedPayment === 'gpay'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="payment-icon">🏦</span>
                  <span className="payment-text">Google Pay / UPI</span>
                </label>

                <label className={`payment-option ${selectedPayment === 'card' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="card"
                    checked={selectedPayment === 'card'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="payment-icon">💳</span>
                  <span className="payment-text">Credit / Debit Card</span>
                </label>

                <label className={`payment-option ${selectedPayment === 'upi' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="upi"
                    checked={selectedPayment === 'upi'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="payment-icon">📱</span>
                  <span className="payment-text">UPI Direct</span>
                </label>
              </div>
            </div>

            <div className="qr-code-section">
              {selectedPayment === 'gpay' && qrValue && (
                <div className="qr-container">
                  <h3>Scan to Pay</h3>
                  <p className="qr-note">Scan the QR code with your phone to complete payment</p>
                  <div className="qr-code-box">
                    <QRCode
                      value={qrValue}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={downloadQRCode}
                  >
                    Download QR Code
                  </button>
                </div>
              )}

              {selectedPayment === 'card' && (
                <div className="card-section">
                  <p className="payment-note">Card payments are being processed securely.</p>
                  <p className="payment-info">
                    Your payment information is encrypted and secure.
                  </p>
                </div>
              )}

              {selectedPayment === 'upi' && (
                <div className="upi-section">
                  <p className="payment-note">Open your UPI app and complete the payment.</p>
                  <p className="payment-info">
                    You'll receive a confirmation once payment is received.
                  </p>
                </div>
              )}
            </div>

            <div className="payment-summary">
              <h4>Order Total</h4>
              <p className="total-amount">₹{totalAmount.toFixed(2)}</p>
            </div>

            {message && <div className="error-message">{message}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('details')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePaymentSubmit}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Complete Payment`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirmation
  if (step === 'confirmation') {
    return (
      <div className="checkout-modal">
        <div className="checkout-container checkout-confirmation">
          <div className="confirmation-content">
            <div className="success-icon">✓</div>
            <h2>Order Confirmed!</h2>
            <p className="order-number">Order ID: {orderId}</p>
            <p className="confirmation-message">
              Your order has been placed successfully. You will receive a confirmation email shortly.
            </p>
            <div className="confirmation-details">
              <p><strong>Total Paid:</strong> ₹{totalAmount.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> {selectedPayment === 'gpay' ? 'Google Pay/UPI' : selectedPayment}</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onClose && onClose()}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default Checkout;
