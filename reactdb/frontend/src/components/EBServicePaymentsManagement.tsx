import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import './EBServicePaymentsManagement.css';

interface ServiceDetail {
  id: number;
  consumerNo: string;
  consumerName: string;
}

interface EBServicePayment {
  id: number;
  serviceId: number;
  billAmount: number;
  billDate: string;
  createdDate: string;
  updatedDate?: string | null;
  billedUnits?: number | null;
  serviceName?: string;
}

interface PaymentFormData {
  serviceId: number;
  billAmount: number;
  billDate: string;
  billedUnits?: number | null;
}

export default function EBServicePaymentsManagement(): JSX.Element {
  const [payments, setPayments] = useState<EBServicePayment[]>([]);
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'billAmount' | 'billDate' | 'consumerName'>('billDate');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>({
    serviceId: 0,
    billAmount: 0,
    billDate: '',
    billedUnits: null
  });

  // Fetch payments and services data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [paymentsRes, servicesRes] = await Promise.all([
          apiService.getEBServicePayments(),
          apiService.getServiceDetails()
        ]);

        // Enrich payments with service names
        const enrichedPayments = paymentsRes.data.map((payment: any) => {
          const service = servicesRes.data.find((s: any) => s.id === payment.serviceId);
          return {
            ...payment,
            serviceName: service?.consumerName || 'Unknown'
          };
        });

        setPayments(enrichedPayments);
        setServices(servicesRes.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load EB service payments');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and search payments
  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments;

    const term = searchTerm.toLowerCase();
    return payments.filter(payment => {
      switch (searchField) {
        case 'billAmount':
          return payment.billAmount.toString().includes(term);
        case 'billDate':
          return new Date(payment.billDate).toLocaleDateString('en-US').includes(term);
        case 'consumerName':
          return payment.serviceName?.toLowerCase().includes(term);
        default:
          return true;
      }
    });
  }, [payments, searchTerm, searchField]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['serviceId', 'billAmount', 'billedUnits'].includes(name) ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceId || !formData.billAmount || !formData.billDate) {
      setError('Service, Bill Amount, and Bill Date are required');
      return;
    }

    try {
      if (editingId) {
        await apiService.updateEBServicePayment(editingId, formData);
        setPayments(payments.map(p => {
          if (p.id === editingId) {
            const service = services.find(s => s.id === formData.serviceId);
            return {
              ...p,
              ...formData,
              serviceName: service?.consumerName || 'Unknown'
            };
          }
          return p;
        }));
      } else {
        const response = await apiService.createEBServicePayment(formData);
        const service = services.find(s => s.id === formData.serviceId);
        setPayments([...payments, {
          ...response.data,
          serviceName: service?.consumerName || 'Unknown'
        }]);
      }

      setFormData({
        serviceId: 0,
        billAmount: 0,
        billDate: '',
        billedUnits: null
      });
      setEditingId(null);
      setShowForm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save EB service payment');
      console.error('Error saving payment:', err);
    }
  };

  const handleEdit = (payment: EBServicePayment) => {
    setFormData({
      serviceId: payment.serviceId,
      billAmount: payment.billAmount,
      billDate: payment.billDate,
      billedUnits: payment.billedUnits
    });
    setEditingId(payment.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    try {
      await apiService.deleteEBServicePayment(id);
      setPayments(payments.filter(p => p.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
      console.error('Error deleting payment:', err);
    }
  };

  const handleCancel = () => {
    setFormData({
      serviceId: 0,
      billAmount: 0,
      billDate: '',
      billedUnits: null
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + p.billAmount, 0);
    const avgAmount = payments.length > 0 ? totalAmount / payments.length : 0;
    const maxAmount = payments.length > 0 ? Math.max(...payments.map(p => p.billAmount)) : 0;

    return {
      totalPayments: payments.length,
      totalAmount,
      avgAmount,
      maxAmount
    };
  }, [payments]);

  if (loading) {
    return (
      <div className="eb-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading EB service payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eb-container">
      {/* Header */}
      <div className="eb-header">
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (showForm && !editingId) {
              handleCancel();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm && !editingId ? 'Cancel' : '+ Add Payment'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-card">
          <span>❌</span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Payments</h3>
            <p className="stat-value">{stats.totalPayments}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Amount</h3>
            <p className="stat-value">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Average Amount</h3>
            <p className="stat-value">{formatCurrency(stats.avgAmount)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>Max Amount</h3>
            <p className="stat-value">{formatCurrency(stats.maxAmount)}</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Edit' : 'Add New'} EB Service Payment</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="serviceId">Service (Consumer) *</label>
                <select
                  id="serviceId"
                  name="serviceId"
                  value={formData.serviceId || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.consumerName} ({service.consumerNo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="billAmount">Bill Amount (₹) *</label>
                <input
                  type="number"
                  id="billAmount"
                  name="billAmount"
                  value={formData.billAmount || ''}
                  onChange={handleInputChange}
                  placeholder="Enter bill amount"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="billDate">Bill Date *</label>
                <input
                  type="date"
                  id="billDate"
                  name="billDate"
                  value={formData.billDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="billedUnits">Billed Units (Optional)</label>
                <input
                  type="number"
                  id="billedUnits"
                  name="billedUnits"
                  value={formData.billedUnits || ''}
                  onChange={handleInputChange}
                  placeholder="Enter units consumed"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingId ? 'Update' : 'Add'} Payment
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Section */}
      <div className="search-section">
        <div className="search-group">
          <div className="search-field-selector">
            <label htmlFor="searchField">Search By:</label>
            <select
              id="searchField"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
              className="search-field-select"
            >
              <option value="billDate">Bill Date</option>
              <option value="billAmount">Bill Amount</option>
              <option value="consumerName">Consumer Name</option>
            </select>
          </div>
          <input
            type="text"
            placeholder={`Search by ${searchField}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {searchTerm && (
          <div className="search-results-info">
            Found {filteredPayments.length} result{filteredPayments.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Payments List */}
      <div className="payments-list">
        {filteredPayments.length > 0 ? (
          <div className="table-responsive">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Consumer Name</th>
                  <th>Bill Date</th>
                  <th>Bill Amount</th>
                  <th>Billed Units</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => (
                  <tr key={payment.id}>
                    <td className="bold">{payment.serviceName}</td>
                    <td>{formatDate(payment.billDate)}</td>
                    <td className="amount">{formatCurrency(payment.billAmount)}</td>
                    <td>{payment.billedUnits ? `${payment.billedUnits} units` : '—'}</td>
                    <td>{formatDate(payment.createdDate)}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon edit"
                        title="Edit"
                        onClick={() => handleEdit(payment)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon delete"
                        title="Delete"
                        onClick={() => handleDelete(payment.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-results">
            <p>📭 No EB service payments found</p>
            <p>{searchTerm ? 'Try adjusting your search criteria' : 'Add the first payment record to get started'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
