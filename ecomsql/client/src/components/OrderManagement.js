import React, { useState, useEffect } from 'react';
import { getOrders, getOrderById } from '../api';
import './OrderManagement.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrders();
      setOrders(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
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

  if (loading) {
    return <div className="order-management"><div className="loading">Loading orders...</div></div>;
  }

  return (
    <div className="order-management">
      <h2>Order Management</h2>

      {error && <div className="error">{error}</div>}

      {selectedOrder ? (
        <div className="order-details">
          <button className="back-btn" onClick={() => setSelectedOrder(null)}>← Back to Orders</button>
          
          <div className="order-card">
            <div className="order-header">
              <h3>{selectedOrder.order_number}</h3>
              <span className={`status ${getStatusBadgeClass(selectedOrder.status)}`}>
                {selectedOrder.status}
              </span>
            </div>

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
                <p className="amount">${selectedOrder.total_amount.toFixed(2)}</p>
              </div>
              <div className="order-info-item">
                <label>Order Date</label>
                <p>{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
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
                      <td>${item.unit_price.toFixed(2)}</td>
                      <td>${(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <td>${order.total_amount.toFixed(2)}</td>
                    <td>
                      <span className={`status ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
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
