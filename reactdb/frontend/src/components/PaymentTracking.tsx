import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import './PaymentTracking.css';

interface PaymentRecord {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  rentFixed: number;
  rentReceivedOn: string | null;
  rentReceived: number;
  rentBalance: number;
  month: number;
  year: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
}

interface MonthYearOption {
  month: number;
  year: number;
  label: string;
}

export default function PaymentTracking() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Generate available month-year options (current month and last 12 months)
  const monthYearOptions = useMemo(() => {
    const options: MonthYearOption[] = [];
    const today = new Date();

    for (let i = 0; i < 13; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      options.push({
        month,
        year,
        label: `${monthName} ${year}`,
      });
    }
    return options;
  }, []);

  // Filter dropdown options based on search input
  const filteredOptions = useMemo(() => {
    if (!searchInput) return monthYearOptions;
    return monthYearOptions.filter((option) =>
      option.label.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [searchInput, monthYearOptions]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      totalTenants: payments.length,
      totalRent: payments.reduce((sum, p) => sum + p.rentFixed, 0),
      totalReceived: payments.reduce((sum, p) => sum + p.rentReceived, 0),
      totalPending: payments.reduce((sum, p) => sum + Math.max(0, p.rentBalance), 0),
      paidCount: payments.filter((p) => p.paymentStatus === 'paid').length,
      partialCount: payments.filter((p) => p.paymentStatus === 'partial').length,
      pendingCount: payments.filter((p) => p.paymentStatus === 'pending').length,
    };
  }, [payments]);

  // Fetch payment data for selected month
  useEffect(() => {
    if (!selectedMonth) {
      setPayments([]);
      return;
    }

    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getPaymentsByMonth(selectedMonth);
        setPayments(response.data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch payment data';
        setError(errorMsg);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [selectedMonth]);

  const handleSelectMonth = (option: MonthYearOption) => {
    setSelectedMonth(`${option.year}-${String(option.month).padStart(2, '0')}`);
    setSearchInput('');
    setShowDropdown(false);
  };

  const selectedLabel = monthYearOptions.find(
    (opt) =>
      selectedMonth ===
      `${opt.year}-${String(opt.month).padStart(2, '0')}`
  )?.label;

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'badge-paid';
      case 'pending':
        return 'badge-pending';
      case 'partial':
        return 'badge-partial';
      default:
        return 'badge-pending';
    }
  };

  return (
    <div className="payment-tracking-container">
      {/* Month/Year Selection */}
      <div className="month-selector-wrapper">
        <div className="month-selector">
          <label htmlFor="month-search">Select Month & Year</label>
          <div className="dropdown-container">
            <div
              className="dropdown-input"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <input
                id="month-search"
                type="text"
                placeholder="Search month and year..."
                value={searchInput || selectedLabel || ''}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              <span className="dropdown-arrow">▼</span>
            </div>

            {showDropdown && (
              <div className="dropdown-list">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <div
                      key={`${option.year}-${option.month}`}
                      className={`dropdown-item ${
                        selectedMonth ===
                        `${option.year}-${String(option.month).padStart(2, '0')}`
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => handleSelectMonth(option)}
                    >
                      {option.label}
                    </div>
                  ))
                ) : (
                  <div className="dropdown-empty">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedMonth && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total Tenants</div>
            <div className="summary-value">{summary.totalTenants}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Rent Due</div>
            <div className="summary-value">₹{summary.totalRent.toLocaleString()}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Received</div>
            <div className="summary-value success">
              ₹{summary.totalReceived.toLocaleString()}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Pending</div>
            <div className="summary-value pending">
              ₹{summary.totalPending.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {selectedMonth && (
        <div className="status-summary">
          <div className="status-badge paid">
            <span className="status-label">Paid</span>
            <span className="status-count">{summary.paidCount}</span>
          </div>
          <div className="status-badge partial">
            <span className="status-label">Partial</span>
            <span className="status-count">{summary.partialCount}</span>
          </div>
          <div className="status-badge pending">
            <span className="status-label">Pending</span>
            <span className="status-count">{summary.pendingCount}</span>
          </div>
        </div>
      )}

      {/* Loading/Error States */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading payment records...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Payment Table */}
      {selectedMonth && !loading && payments.length > 0 && (
        <div className="payment-table-wrapper">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Room Number</th>
                <th>Rent Fixed</th>
                <th>Rent Received</th>
                <th>Balance</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={`${payment.occupancyId}-${payment.month}-${payment.year}`}>
                  <td className="tenant-name">{payment.tenantName}</td>
                  <td>{payment.roomNumber}</td>
                  <td className="amount">₹{payment.rentFixed.toLocaleString()}</td>
                  <td className="amount success">
                    ₹{payment.rentReceived.toLocaleString()}
                  </td>
                  <td
                    className={`amount ${
                      payment.rentBalance > 0 ? 'pending' : 'success'
                    }`}
                  >
                    ₹{payment.rentBalance.toLocaleString()}
                  </td>
                  <td>
                    {payment.rentReceivedOn
                      ? new Date(payment.rentReceivedOn).toLocaleDateString()
                      : '-'}
                  </td>
                  <td>
                    <span
                      className={`badge ${getStatusBadgeClass(
                        payment.paymentStatus
                      )}`}
                    >
                      {payment.paymentStatus.charAt(0).toUpperCase() +
                        payment.paymentStatus.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {selectedMonth && !loading && payments.length === 0 && !error && (
        <div className="empty-state">
          <p>No payment records found for the selected month</p>
        </div>
      )}
    </div>
  );
}
