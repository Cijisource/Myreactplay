import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/OrderConfirmation.css';

function OrderConfirmation() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const lastOrder = localStorage.getItem('lastOrder');
    if (lastOrder) {
      setOrder(JSON.parse(lastOrder));
      localStorage.removeItem('lastOrder');
    } else {
      // Redirect to home if no order found
      navigate('/');
    }
  }, [navigate]);

  if (!order) {
    return <div className="loading">Loading order confirmation...</div>;
  }

  return (
    <div className="confirmation-container">
      <div className="confirmation-card">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p className="thank-you">Thank you for your purchase!</p>

        <div className="order-details">
          <div className="detail-row">
            <span className="label">Order Number:</span>
            <span className="value">{order.orderNumber}</span>
          </div>
          <div className="detail-row">
            <span className="label">Total Amount:</span>
            <span className="value">${order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Items:</span>
            <span className="value">{order.itemCount} product(s)</span>
          </div>
        </div>

        <div className="info-box">
          <h3>What's Next?</h3>
          <ul>
            <li>A confirmation email has been sent to your email address</li>
            <li>Your order will be processed within 24 hours</li>
            <li>You'll receive a shipping notification once your order ships</li>
            <li>Track your order using the order number above</li>
          </ul>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default OrderConfirmation;
