import React from 'react';
import { Link } from 'react-router-dom';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartProps {
  items: CartItem[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export const Cart: React.FC<CartProps> = ({ items, onRemoveItem, onUpdateQuantity }) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
        <h2>Your cart is empty</h2>
        <p>Discover amazing products and add them to your cart!</p>
        <Link to="/" className="continue-shopping-btn">🏠 Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>🛒 Shopping Cart</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You have {items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
      <div className="cart-items">
        {items.map(item => (
          <div key={item.productId} className="cart-item">
            <img src={item.image || 'https://via.placeholder.com/100'} alt={item.name} />
            <div className="item-info">
              <h4>{item.name}</h4>
              <p>${item.price.toFixed(2)} each</p>
            </div>
            <div className="quantity-control">
              <button onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)} title="Decrease quantity">−</button>
              <span className="quantity-display">{item.quantity}</span>
              <button onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)} title="Increase quantity">+</button>
            </div>
            <p className="item-total">${(item.price * item.quantity).toFixed(2)}</p>
            <button 
              className="remove-btn"
              onClick={() => onRemoveItem(item.productId)}
              title="Remove from cart"
            >
              🗑️ Remove
            </button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <p>
          <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''}):</span>
          <span>${total.toFixed(2)}</span>
        </p>
        <p>
          <span>Shipping:</span>
          <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Free</span>
        </p>
        <h3>💰 Total: ${total.toFixed(2)}</h3>
        <Link to="/checkout" className="checkout-btn">💳 Proceed to Checkout</Link>
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: 'var(--primary)' }}>← Continue Shopping</Link>
      </div>
    </div>
  );
};
