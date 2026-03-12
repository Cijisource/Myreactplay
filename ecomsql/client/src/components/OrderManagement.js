import React, { useState, useEffect } from 'react';
import { getOrders, getSellerOrders, getOrderById, updateOrderStatus } from '../api';
import { hasRole } from '../utils/authUtils';
import './OrderManagement.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const isSeller = hasRole('Seller');
      console.log('[OrderManagement] Loading orders, isSeller:', isSeller);
      
      const response = isSeller ? await getSellerOrders() : await getOrders();
      console.log('[OrderManagement] Orders response:', response);
      
      const ordersData = Array.isArray(response.data) ? response.data : [];
      console.log('[OrderManagement] Parsed orders:', ordersData.length, 'orders found');
      
      setOrders(ordersData);
    } catch (err) {
      console.error('[OrderManagement] Error loading orders:', err);
      console.error('[OrderManagement] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      setError(`Failed to load orders: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await getOrderById(orderId);
      setSelectedOrder(response.data);
    } catch (err) {
      setError('Failed to load order details');
      console.error(err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'ready for shipping':
        return 'status-ready';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusLoading(true);
      await updateOrderStatus(selectedOrder.id, { status: newStatus });
      
      // Update selected order with new status
      setSelectedOrder({
        ...selectedOrder,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // Reload orders list
      await loadOrders();
      
      setSuccessMessage(`Order status updated to "${newStatus}" successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update order status');
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return <div className="order-management"><div className="loading">Loading orders...</div></div>;
  }

  return (
    <div className="order-management">
      <div className="order-header-section">
        <h2>{hasRole('Seller') ? 'My Orders (Seller)' : 'My Orders'}</h2>
        <button className="refresh-btn" onClick={loadOrders} title="Refresh orders">
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {selectedOrder ? (
        <div className="order-details">
          <button className="back-btn" onClick={() => setSelectedOrder(null)}>← Back to Orders</button>
          
          <div className="order-card">
            <div className="order-header">
              <h3>{selectedOrder.order_number}</h3>
              <div className="order-header-status">
                <span className={`status ${getStatusBadgeClass(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {hasRole('Seller') && (
              <div className="status-update-section">
                <h4>Update Status</h4>
                <div className="status-buttons">
                  <button
                    className={`status-btn ${selectedOrder.status === 'ready for shipping' ? 'active' : ''}`}
                    onClick={() => handleStatusChange('ready for shipping')}
                    disabled={statusLoading || selectedOrder.status === 'ready for shipping'}
                  >
                    Ready for Shipping
                  </button>
                  <button
                    className={`status-btn ${selectedOrder.status === 'shipped' ? 'active' : ''}`}
                    onClick={() => handleStatusChange('shipped')}
                    disabled={statusLoading || selectedOrder.status === 'shipped'}
                  >
                    Shipped
                  </button>
                </div>
              </div>
            )}

            <div className="order-info-grid">
              <div className="order-info-item">
                <label>Customer Name</label>
                <p>{selectedOrder.customer_name}</p>
              </div>
              <div className="order-info-item">
                <label>Email</label>
                <p>{selectedOrder.customer_email}</p>
              </div>
              <div className="order-info-item">
                <label>Total Amount</label>
                <p className="amount">₹{selectedOrder.total_amount.toFixed(2)}</p>
              </div>
              <div className="order-info-item">
                <label>Order Placed Date</label>
                <p>{new Date(selectedOrder.created_at).toLocaleString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              </div>
            </div>

            {selectedOrder.shipping_address && (
              <div className="shipping-info">
                <h4>Shipping Address</h4>
                <p>{selectedOrder.shipping_address}</p>
              </div>
            )}

            <div className="order-items">
              <h4>Order Items</h4>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items && selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.unit_price.toFixed(2)}</td>
                      <td>₹{(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder.payment_screenshot && (
              <div className="payment-screenshot-section">
                <h4>Payment Confirmation</h4>
                <div className="screenshot-container">
                  <img 
                    src={selectedOrder.payment_screenshot} 
                    alt="Payment screenshot" 
                    className="payment-screenshot-img"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="orders-list">
          {orders.length === 0 ? (
            <div className="no-orders">No orders found</div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.customer_email}</td>
                    <td>₹{order.total_amount.toFixed(2)}</td>
                    <td>
                      <span className={`status ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
