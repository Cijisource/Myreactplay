import React, { useState, useEffect } from 'react';
import { getCartItems, updateCartItem, removeFromCart, createOrder } from '../api';
import './ShoppingCart.css';

const ShoppingCart = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerEmail: '',
    shippingAddress: ''
  });

  const sessionId = localStorage.getItem('sessionId');

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      if (!sessionId) {
        setItems([]);
        setLoading(false);
        return;
      }

      const response = await getCartItems(sessionId);
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setMessage('Error loading cart');
      console.error(err);
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

  const handleCheckoutChange = (e) => {
    const { name, value } = e.target;
    setCheckoutForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    try {
      if (!checkoutForm.customerName || !checkoutForm.customerEmail) {
        setMessage('Please fill in all required fields');
        return;
      }

      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      await createOrder({
        sessionId,
        customerName: checkoutForm.customerName,
        customerEmail: checkoutForm.customerEmail,
        shippingAddress: checkoutForm.shippingAddress,
        items: items.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount
      });

      setMessage('Order created successfully!');
      setShowCheckout(false);
      setCheckoutForm({ customerName: '', customerEmail: '', shippingAddress: '' });
      await loadCart();
    } catch (err) {
      setMessage('Error creating order: ' + err.message);
      console.error(err);
    }
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
                  <td>${item.price.toFixed(2)}</td>
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
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
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
              <span className="amount">${totalAmount.toFixed(2)}</span>
            </div>
            <button className="checkout-btn" onClick={() => setShowCheckout(true)}>
              Proceed to Checkout
            </button>
          </div>

          {showCheckout && (
            <div className="checkout-form">
              <h3>Checkout</h3>
              <form onSubmit={handleCheckout}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="customerName"
                    value={checkoutForm.customerName}
                    onChange={handleCheckoutChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={checkoutForm.customerEmail}
                    onChange={handleCheckoutChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Shipping Address</label>
                  <textarea
                    name="shippingAddress"
                    value={checkoutForm.shippingAddress}
                    onChange={handleCheckoutChange}
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">Place Order</button>
                  <button type="button" className="cancel-btn" onClick={() => setShowCheckout(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;
