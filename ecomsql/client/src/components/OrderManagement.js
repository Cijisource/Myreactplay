import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getOrders, getSellerOrders, getOrderById, updateOrderStatus } from '../api';
import { hasRole } from '../utils/authUtils';
import './OrderManagement.css';

const OrderManagement = () => {
  const INITIAL_ORDERS_LIMIT = 3;
  const ORDERS_PAGE_SIZE = 3;
  const [orders, setOrders] = useState([]);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const loadMoreRef = useRef(null);
  const loadMoreInFlightRef = useRef(false);
  const isSellerOrAdmin = hasRole('Seller') || hasRole('Administrator');

  const fetchOrdersPage = useCallback(async ({ append = false, offset = 0, limit = INITIAL_ORDERS_LIMIT } = {}) => {
    try {
      if (append && loadMoreInFlightRef.current) {
        return;
      }

      if (append) {
        loadMoreInFlightRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');
      const isSeller = hasRole('Seller');
      console.log('[OrderManagement] Loading orders, isSeller:', isSeller, 'offset:', offset, 'limit:', limit, 'append:', append);

      const query = { limit, offset };
      const response = isSeller ? await getSellerOrders(query) : await getOrders(query);
      console.log('[OrderManagement] Orders response:', response);

      const payload = response.data;
      const ordersData = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.orders) ? payload.orders : []);
      const hasMore = Array.isArray(payload)
        ? false
        : (typeof payload?.pagination?.hasMore === 'boolean'
          ? payload.pagination.hasMore
          : ordersData.length === limit);

      console.log('[OrderManagement] Parsed orders:', ordersData.length, 'orders found, hasMore:', hasMore);

      setOrders((prev) => (append ? [...prev, ...ordersData] : ordersData));
      setHasMoreOrders(hasMore);
    } catch (err) {
      console.error('[OrderManagement] Error loading orders:', err);
      console.error('[OrderManagement] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      // Enhanced error message for token issues
      let errorMessage = err.response?.data?.error || err.message;
      if (err.response?.status === 401) {
        errorMessage += ' - Please log in again. If the issue persists, clear your browser cache and try again.';
      }

      if (append) {
        setHasMoreOrders(false);
      }
      setError(`Failed to load orders: ${errorMessage}`);
    } finally {
      if (append) {
        setLoadingMore(false);
        loadMoreInFlightRef.current = false;
      } else {
        setLoading(false);
      }
    }
  }, [INITIAL_ORDERS_LIMIT]);

  const loadOrders = useCallback(() => {
    setHasMoreOrders(true);
    return fetchOrdersPage({ append: false, offset: 0, limit: INITIAL_ORDERS_LIMIT });
  }, [fetchOrdersPage, INITIAL_ORDERS_LIMIT]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (selectedOrder || loading || loadingMore || !hasMoreOrders || orders.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          fetchOrdersPage({ append: true, offset: orders.length, limit: ORDERS_PAGE_SIZE });
        }
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.1
      }
    );

    const sentinel = loadMoreRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, [selectedOrder, loading, loadingMore, hasMoreOrders, orders.length, fetchOrdersPage, ORDERS_PAGE_SIZE]);

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

  const handlePrintFullOrderLabel = () => {
    if (!selectedOrder || !isSellerOrAdmin) {
      return;
    }

    const safeOrderNumber = selectedOrder.order_number || `ORDER-${selectedOrder.id}`;
    const safeCustomerName = selectedOrder.customer_name || 'N/A';
    const safeCustomerEmail = selectedOrder.customer_email || 'N/A';
    const safeShippingAddress = selectedOrder.shipping_address || 'Tower C22, Flat No. 704, Puravankara Windermere, No. 45 Bhavani Amman Kovil Street, Pallikaranai, Chennai - 600100';
    const safeStatus = selectedOrder.status || 'pending';
    const safeCreatedAt = selectedOrder.created_at
      ? new Date(selectedOrder.created_at).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const items = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const itemRows = items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.product_name || 'N/A'}</td>
        <td>${item.quantity || 0}</td>
        <td>Rs. ${Number(item.unit_price || 0).toFixed(2)}</td>
        <td>Rs. ${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    const labelWindow = window.open('', '_blank', 'width=980,height=900');
    if (!labelWindow) {
      setError('Unable to open print window. Please allow popups and try again.');
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Order Label - ${safeOrderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            .label-wrap { border: 2px solid #111827; border-radius: 10px; padding: 16px; }
            .top { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; margin-bottom: 12px; }
            .title { font-size: 22px; font-weight: 800; margin: 0; }
            .meta { font-size: 13px; line-height: 1.6; }
            .chip { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e5e7eb; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .section { margin-top: 12px; }
            .section h3 { margin: 0 0 6px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .address { border: 1px dashed #9ca3af; border-radius: 8px; padding: 10px; font-size: 14px; white-space: pre-wrap; }
            .return-box { border: 1px solid #6b7280; border-radius: 8px; padding: 10px; font-size: 12px; background: #f9fafb; color: #374151; }
            .return-box .return-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 7px 8px; text-align: left; }
            th { background: #f3f4f6; }
            .totals { margin-top: 10px; display: flex; justify-content: space-between; font-weight: 700; }
            .barcode { margin-top: 14px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; }
            @media print {
              body { margin: 8mm; }
              .label-wrap { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="label-wrap">
            <div class="top">
              <div>
                <p class="title">Full Order Label</p>
                <div class="meta">
                  <div><strong>Order:</strong> ${safeOrderNumber}</div>
                  <div><strong>Date:</strong> ${safeCreatedAt}</div>
                </div>
              </div>
              <div class="meta" style="text-align:right;">
                <div class="chip">${safeStatus}</div>
                <div style="margin-top:8px;"><strong>Total:</strong> Rs. ${Number(selectedOrder.total_amount || 0).toFixed(2)}</div>
                <div><strong>Items:</strong> ${totalQty}</div>
              </div>
            </div>

            <div class="section">
              <h3>Ship To</h3>
              <div class="address">
                <strong>${safeCustomerName}</strong>\n
                ${safeShippingAddress}\n
                Email: ${safeCustomerEmail}
              </div>
            </div>

            <div class="section">
              <h3>Order Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows || '<tr><td colspan="5">No items</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <span>Shipping: Rs. ${Number(selectedOrder.shipping_charge || 0).toFixed(2)}</span>
              <span>Payable: Rs. ${Number(selectedOrder.total_amount || 0).toFixed(2)}</span>
            </div>

            <div class="section">
              <div class="return-box">
                <div class="return-label">If Undelivered, Return To</div>
                Tower C22, Flat No. 704, Puravankara Windermere,<br/>
                No. 45 Bhavani Amman Kovil Street, Pallikaranai,<br/>
                Chennai - 600100
              </div>
            </div>

            <div class="barcode">*${safeOrderNumber}*</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    labelWindow.document.open();
    labelWindow.document.write(html);
    labelWindow.document.close();
  };

  const handlePrintShippingLabel4x6 = () => {
    if (!selectedOrder || !isSellerOrAdmin) {
      return;
    }

    const safeOrderNumber = selectedOrder.order_number || `ORDER-${selectedOrder.id}`;
    const safeCustomerName = selectedOrder.customer_name || 'N/A';
    const safeCustomerEmail = selectedOrder.customer_email || 'N/A';
    const safeShippingAddress = selectedOrder.shipping_address || 'Tower C22, Flat No. 704, Puravankara Windermere, No. 45 Bhavani Amman Kovil Street, Pallikaranai, Chennai - 600100';
    const safeStatus = selectedOrder.status || 'pending';
    const safeTotal = Number(selectedOrder.total_amount || 0).toFixed(2);

    const labelWindow = window.open('', '_blank', 'width=520,height=760');
    if (!labelWindow) {
      setError('Unable to open print window. Please allow popups and try again.');
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>4x6 Shipping Label - ${safeOrderNumber}</title>
          <style>
            @page { size: 4in 6in; margin: 0.12in; }
            body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
            .label { width: 100%; height: 100%; border: 1px solid #111827; border-radius: 8px; padding: 10px; box-sizing: border-box; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
            .title { font-size: 14px; font-weight: 800; margin: 0 0 4px 0; }
            .order { font-size: 12px; font-weight: 700; margin: 0; }
            .chip { border: 1px solid #9ca3af; border-radius: 999px; padding: 3px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .block { margin-top: 8px; border: 1px dashed #9ca3af; border-radius: 6px; padding: 8px; }
            .block h4 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            .name { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
            .addr { font-size: 12px; line-height: 1.35; white-space: pre-wrap; }
            .meta { margin-top: 8px; font-size: 11px; line-height: 1.5; }
            .barcode { margin-top: 10px; text-align: center; font-family: monospace; font-size: 18px; letter-spacing: 1.8px; }
            .footer { margin-top: 6px; text-align: center; font-size: 10px; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="row">
              <div>
                <p class="title">Shipping Label (4x6)</p>
                <p class="order">${safeOrderNumber}</p>
              </div>
              <div class="chip">${safeStatus}</div>
            </div>

            <div class="block">
              <h4>Ship To</h4>
              <div class="name">${safeCustomerName}</div>
              <div class="addr">${safeShippingAddress}\nEmail: ${safeCustomerEmail}</div>
            </div>

            <div class="meta">
              <div><strong>Amount:</strong> Rs. ${safeTotal}</div>
              <div><strong>Order Date:</strong> ${selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('en-IN') : 'N/A'}</div>
            </div>

            <div class="barcode">*${safeOrderNumber}*</div>
            <div class="footer">Handle with care | Seller dispatch copy</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    labelWindow.document.open();
    labelWindow.document.write(html);
    labelWindow.document.close();
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

            {isSellerOrAdmin && (
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
                    disabled={statusLoading || selectedOrder.status !== 'ready for shipping'}
                  >
                    Shipped
                  </button>
                </div>
              </div>
            )}

            {isSellerOrAdmin && (
              <div className="order-label-actions">
                <button className="print-label-btn" onClick={handlePrintFullOrderLabel}>
                  🖨 Print Full Order Label
                </button>
                <button className="print-compact-btn" onClick={handlePrintShippingLabel4x6}>
                  🧾 Print 4x6 Shipping Label
                </button>
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

            {/* Discount Summary Section */}
            {(selectedOrder.applied_discount_code || 
              (selectedOrder.discounts && selectedOrder.discounts.length > 0) ||
              // (selectedOrder.discounts && selectedOrder.discounts.some(d => d.discount_type === 'loyalty_points'))) && (
              (selectedOrder.discounts.some(d => d.discount_type === 'loyalty_points'))) && (
              <div className="discount-summary-section">
                <h4>💰 Discount Summary</h4>
                <div className="discount-summary-content">
                  {selectedOrder.applied_discount_code && (
                    <div className="summary-item">
                      <span className="summary-label">Coupon Applied:</span>
                      <span className="summary-value">
                        <span className="coupon-code-badge">{selectedOrder.applied_discount_code}</span>
                        <span className="discount-savings">-₹{selectedOrder.discount_amount ? selectedOrder.discount_amount.toFixed(2) : '0.00'}</span>
                      </span>
                    </div>
                  )}
                  
                  {selectedOrder.discounts && selectedOrder.discounts.length > 0 && (
                    <div className="summary-item">
                      <span className="summary-label">Total Discounts/Rewards Applied:</span>
                      <span className="summary-value">
                        <span className="discount-count-badge">{selectedOrder.discounts.length} {selectedOrder.discounts.length === 1 ? 'item' : 'items'}</span>
                        <span className="total-discount-amount">
                          -₹{selectedOrder.discounts.reduce((sum, d) => sum + (d.discount_amount || 0), 0).toFixed(2)}
                        </span>
                      </span>
                    </div>
                  )}

                  {((selectedOrder.discount_amount > 0) || 
                    ((selectedOrder.discounts && selectedOrder.discounts.filter(d => d.discount_type === 'loyalty_points').reduce((sum, d) => sum + (d.discount_amount || 0), 0)) > 0)) && (
                    <div className="summary-item highlight">
                      <span className="summary-label">You Save:</span>
                      <span className="summary-value savings-highlight">
                        ₹{(
                          (selectedOrder.discount_amount || 0) + 
                          ((selectedOrder.discounts && selectedOrder.discounts.filter(d => d.discount_type === 'loyalty_points').reduce((sum, d) => sum + (d.discount_amount || 0), 0)) || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Display Discounts and Rewards Applied */}
            {selectedOrder.applied_discount_code && (
              <div className="discount-info">
                <h4>Coupon Applied</h4>
                <p className="discount-code">{selectedOrder.applied_discount_code}</p>
                <p className="discount-amount">Discount: ₹{selectedOrder.discount_amount ? selectedOrder.discount_amount.toFixed(2) : '0.00'}</p>
              </div>
            )}

            {selectedOrder.discounts && selectedOrder.discounts.length > 0 && (
              <div className="discounts-details">
                <h4>Applied Discounts/Rewards</h4>
                <div className="discounts-list">
                  {selectedOrder.discounts.map((discount, index) => (
                    <div key={index} className="discount-item">
                      <div className="discount-header">
                        <span className="discount-code">{discount.discount_code}</span>
                        <span className={`discount-type ${discount.discount_type === 'coupon' ? 'coupon-badge' : 'rewards-badge'}`}>
                          {discount.discount_type === 'coupon' ? '🎟️ Coupon' : '🎁 Reward Points'}
                        </span>
                      </div>
                      <p className="discount-amount">₹{discount.discount_amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="order-summary">
              <h4>Order Summary</h4>
              <div className="summary-items">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal_amount ? selectedOrder.subtotal_amount.toFixed(2) : '0.00'}</span>
                </div>
                <div className="summary-row">
                  <span>GST (18%):</span>
                  <span>₹{selectedOrder.gst_amount ? selectedOrder.gst_amount.toFixed(2) : '0.00'}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>₹{selectedOrder.shipping_charge ? selectedOrder.shipping_charge.toFixed(2) : '0.00'}</span>
                </div>

                {/* Display Applied Coupon */}
                {selectedOrder.applied_discount_code && (
                  <div className="summary-row coupon-applied-row">
                    <span>
                      <span className="coupon-label">🎟️ Coupon Applied:</span>
                      <span className="coupon-code">{selectedOrder.applied_discount_code}</span>
                    </span>
                    <span style={{ color: '#22c55e', fontWeight: '600' }}>-₹{selectedOrder.discount_amount ? selectedOrder.discount_amount.toFixed(2) : '0.00'}</span>
                  </div>
                )}

                {/* Display Applied Rewards */}
                {selectedOrder.discounts && selectedOrder.discounts.length > 0 && selectedOrder.discounts.some(d => d.discount_type === 'loyalty_points') && (
                  <div className="summary-row rewards-applied-row">
                    <span>
                      <span className="rewards-label">🎁 Loyalty Points Redeemed</span>
                    </span>
                    <span style={{ color: '#9c27b0', fontWeight: '600' }}>
                      -{selectedOrder.discounts
                        .filter(d => d.discount_type === 'loyalty_points')
                        .reduce((sum, d) => sum + (d.discount_amount || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                )}

                {selectedOrder.discount_amount > 0 && (
                  <div className="summary-row discount-row">
                    <span style={{ color: '#FFC107', fontWeight: '600' }}>Total Discount:</span>
                    <span style={{ color: '#FFC107', fontWeight: '600' }}>-₹{selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row total-row">
                  <span><strong>Total:</strong></span>
                  <span><strong>₹{selectedOrder.total_amount.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            <div className="order-items-section">
              <h4>Order Items</h4>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items && selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td className="item-img-cell">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="order-item-img"
                          />
                        ) : (
                          <div className="order-item-img-placeholder">📦</div>
                        )}
                      </td>
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
                  <th>Discount</th>
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
                      <div className="discount-summary">
                        {order.applied_discount_code && (
                          <div className="discount-item">
                            <span className="coupon-tag">🎟️ {order.applied_discount_code}</span>
                            {order.discount_amount > 0 && (
                              <span className="discount-amount-tag">-₹{order.discount_amount.toFixed(2)}</span>
                            )}
                          </div>
                        )}
                        
                        {order.discounts && order.discounts.length > 0 && order.discounts.some(d => d.discount_type === 'loyalty_points') && (
                          <div className="discount-item">
                            <span className="rewards-tag">🎁 Rewards</span>
                            <span className="discount-amount-tag">
                              -₹{order.discounts
                                .filter(d => d.discount_type === 'loyalty_points')
                                .reduce((sum, d) => sum + (d.discount_amount || 0), 0)
                                .toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        {!order.applied_discount_code && (!order.discounts || order.discounts.length === 0) && (
                          <span className="no-discount">—</span>
                        )}
                      </div>
                    </td>
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

                {loadingMore && (
                  <tr className="orders-loading-row">
                    <td colSpan="8">
                      <div className="orders-loading-inline">
                        <span className="orders-spinner" aria-hidden="true" />
                        <span>Loading more orders...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {!selectedOrder && orders.length > 0 && (
            <div className="orders-scroll-footer">
              {hasMoreOrders ? (
                <>
                  <div className="orders-loading-more">Scroll down to load more orders</div>
                  <div ref={loadMoreRef} className="orders-scroll-sentinel" aria-hidden="true" />
                </>
              ) : (
                <div className="orders-end-message">You have reached the end of your orders.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
