import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import SearchableDropdown from './SearchableDropdown';
import LoadingSpinner from './LoadingSpinner';
import './PaymentTracking.css';

interface PaymentRecord {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  rentFixed: number;
  rentReceivedOn: string | null;
  rentReceived: number;
  charges: number;
  proRataRent: number;
  rentBalance: number;
  occupancyDays: number;
  month: number;
  year: number;
  checkInDate: string;
  checkOutDate: string | null;
  paymentStatus: 'paid' | 'pending' | 'partial';
}

type PaymentStatusFilter = 'paid' | 'pending' | 'partial' | 'merged' | null;

interface MonthYearOption {
  month: number;
  year: number;
  label: string;
}

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Invalid date';
  
  try {
    // Extract just the date part if it includes time
    const dateOnly = dateString.split('T')[0];
    
    // Parse YYYY-MM-DD format directly
    const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return 'Invalid date';
    }
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    // Validate ranges
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return 'Invalid date';
    }
    
    // Format as DD/MM/YYYY using the parsed components
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  } catch (err) {
    return 'Invalid date';
  }
};

const parseDateOnly = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;

  try {
    const dateOnly = dateString.split('T')[0];
    const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
};

// Helper function to get days in month
const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

const compareRoomNumbers = (left: string, right: string): number => {
  return String(left || '').localeCompare(String(right || ''), undefined, { numeric: true, sensitivity: 'base' });
};

const getPaymentDateTimestamp = (payment: PaymentRecord): number => {
  if (payment.rentReceivedOn) {
    const paymentDate = new Date(payment.rentReceivedOn).getTime();
    if (Number.isFinite(paymentDate)) {
      return paymentDate;
    }
  }

  return new Date(payment.year, payment.month - 1, 1).getTime();
};

const getPreviousMonthValue = (monthValue?: string): string => {
  if (!monthValue) {
    return '';
  }

  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) {
    return '';
  }

  let previousYear = year;
  let previousMonth = month - 1;

  if (previousMonth === 0) {
    previousMonth = 12;
    previousYear -= 1;
  }

  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
};

const sortPaymentsByPaymentDateDesc = (left: PaymentRecord, right: PaymentRecord): number => {
  return getPaymentDateTimestamp(right) - getPaymentDateTimestamp(left);
};

// Helper function to format balance tooltip
const getBalanceTooltip = (payment: PaymentRecord): string => {
  const daysInMonth = getDaysInMonth(payment.month, payment.year);
  const occupancyDays = payment.occupancyDays || daysInMonth;
  const monthName = new Date(payment.year, payment.month - 1).toLocaleDateString('en-US', { month: 'long' });
  
  return `Occupancy: ${occupancyDays} of ${daysInMonth} days in ${monthName} ${payment.year}\nPro-rata rent balance`;
};

export default function PaymentTracking() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<PaymentStatusFilter>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [checkInDateFrom, setCheckInDateFrom] = useState<string>('');
  const [checkInDateTo, setCheckInDateTo] = useState<string>('');
  const [checkOutDateFrom, setCheckOutDateFrom] = useState<string>('');
  const [checkOutDateTo, setCheckOutDateTo] = useState<string>('');
  const [ebDetailsPopup, setEbDetailsPopup] = useState<{
    open: boolean;
    roomNumber: string;
    monthLabel: string;
    loading: boolean;
    error: string | null;
    records: any[];
  }>({
    open: false,
    roomNumber: '',
    monthLabel: '',
    loading: false,
    error: null,
    records: []
  });

  const hasActiveDateFilter = Boolean(checkInDateFrom || checkInDateTo || checkOutDateFrom || checkOutDateTo);

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

  // Generate available room options
  const roomOptions = useMemo(() => {
    const uniqueRooms = new Set<string>();
    payments.forEach((p) => {
      if (p.roomNumber) {
        uniqueRooms.add(p.roomNumber);
      }
    });
    
    // Sort rooms numerically if they're numbers, otherwise alphabetically
    const sortedRooms = Array.from(uniqueRooms).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    return sortedRooms.map((room) => ({
      id: room,
      label: `Room ${room}`,
    }));
  }, [payments]);

  const getEffectiveStatus = (payment: Pick<PaymentRecord, 'rentFixed' | 'paymentStatus'>): 'paid' | 'pending' | 'partial' | 'merged' => {
    if (payment.rentFixed === 0) return 'merged';
    return payment.paymentStatus;
  };

  // Calculate summary statistics based on filtered payments (checkout >= today)
  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activePayments = payments.filter((p) => {
      // If no checkOutDate, include the record
      if (!p.checkOutDate) return true;
      
      // Parse the checkout date
      const checkoutDate = new Date(p.checkOutDate);
      checkoutDate.setHours(0, 0, 0, 0);
      
      // Include if checkout date is >= today
      return checkoutDate >= today;
    });

    return {
      totalTenants: activePayments.length,
      totalRent: activePayments.reduce((sum, p) => sum + p.rentFixed, 0),
      totalReceived: activePayments.reduce((sum, p) => sum + p.rentReceived + p.charges, 0),
      totalPending: activePayments.reduce((sum, p) => sum + Math.max(0, p.rentBalance), 0),
      paidCount: activePayments.filter((p) => getEffectiveStatus(p) === 'paid').length,
      partialCount: activePayments.filter((p) => getEffectiveStatus(p) === 'partial').length,
      pendingCount: activePayments.filter((p) => getEffectiveStatus(p) === 'pending').length,
      mergedCount: activePayments.filter((p) => getEffectiveStatus(p) === 'merged').length,
    };
  }, [payments]);

  // Filter payments based on selected status and date filters.
  // When a date filter is active, the hard-coded checkout >= today restriction is skipped,
  // so the selected range can actually match records.
  const filteredPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = payments.filter((p) => {
      if (hasActiveDateFilter) {
        return true;
      }

      // If no checkOutDate, include the record
      if (!p.checkOutDate) return true;
      
      // Parse the checkout date
      const checkoutDate = new Date(p.checkOutDate);
      checkoutDate.setHours(0, 0, 0, 0);
      
      // Include if checkout date is >= today
      return checkoutDate >= today;
    });

    // Apply status filter if selected
    if (selectedStatusFilter) {
      filtered = filtered.filter((p) => getEffectiveStatus(p) === selectedStatusFilter);
    }

    // Apply room filter if selected
    if (selectedRoom) {
      filtered = filtered.filter((p) => p.roomNumber === selectedRoom);
    }

    if (checkInDateFrom) {
      const fromDate = parseDateOnly(checkInDateFrom);
      filtered = filtered.filter((p) => {
        const recordDate = parseDateOnly(p.checkInDate);
        if (!recordDate || !fromDate) return false;
        return recordDate.getTime() >= fromDate.getTime();
      });
    }

    if (checkInDateTo) {
      const toDate = parseDateOnly(checkInDateTo);
      filtered = filtered.filter((p) => {
        const recordDate = parseDateOnly(p.checkInDate);
        if (!recordDate || !toDate) return false;
        return recordDate.getTime() <= toDate.getTime();
      });
    }

    if (checkOutDateFrom || checkOutDateTo) {
      filtered = filtered.filter((p) => {
        if (!p.checkOutDate) return false;
        const recordDate = parseDateOnly(p.checkOutDate);
        if (!recordDate) return false;

        if (checkOutDateFrom) {
          const fromDate = parseDateOnly(checkOutDateFrom);
          if (!fromDate || recordDate.getTime() < fromDate.getTime()) return false;
        }

        if (checkOutDateTo) {
          const toDate = parseDateOnly(checkOutDateTo);
          if (!toDate || recordDate.getTime() > toDate.getTime()) return false;
        }

        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      const paymentDateDiff = sortPaymentsByPaymentDateDesc(a, b);
      if (paymentDateDiff !== 0) {
        return paymentDateDiff;
      }
      return compareRoomNumbers(a.roomNumber, b.roomNumber);
    });
  }, [payments, selectedStatusFilter, selectedRoom, checkInDateFrom, checkInDateTo, checkOutDateFrom, checkOutDateTo, hasActiveDateFilter]);

  // Fetch payment data for the selected month, or load the recent month range when no
  // month/date filters are active so the screen starts with all data available.
  useEffect(() => {
    const shouldLoadAllData = !selectedMonth && !hasActiveDateFilter;

    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        let paymentData: PaymentRecord[] = [];

        if (shouldLoadAllData) {
          const monthResponses = await Promise.all(
            monthYearOptions.map(async (opt) => {
              const monthValue = `${opt.year}-${String(opt.month).padStart(2, '0')}`;
              const response = await apiService.getPaymentsByMonth(monthValue);
              return Array.isArray(response.data) ? response.data : [];
            })
          );

          paymentData = [...monthResponses.flat()]
            .sort(sortPaymentsByPaymentDateDesc)
            .slice(0, 30);
        } else if (selectedMonth) {
          const response = await apiService.getPaymentsByMonth(selectedMonth);
          paymentData = Array.isArray(response.data) ? response.data : [];
        } else if (hasActiveDateFilter) {
          const monthResponses = await Promise.all(
            monthYearOptions.map(async (opt) => {
              const monthValue = `${opt.year}-${String(opt.month).padStart(2, '0')}`;
              const response = await apiService.getPaymentsByMonth(monthValue);
              return Array.isArray(response.data) ? response.data : [];
            })
          );

          paymentData = monthResponses.flat();
        }

        console.log('Fetched payments:', paymentData);
        setPayments(paymentData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch payment data';
        setError(errorMsg);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    if (shouldLoadAllData || selectedMonth || hasActiveDateFilter) {
      fetchPayments();
    } else {
      setPayments([]);
    }
  }, [selectedMonth, hasActiveDateFilter, monthYearOptions]);

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'badge-paid';
      case 'pending':
        return 'badge-pending';
      case 'partial':
        return 'badge-partial';
      case 'merged':
        return 'badge-merged';
      default:
        return 'badge-pending';
    }
  };

  const openEbDetails = async (roomNumber: string, monthValue?: string) => {
    const latestMonthValue = monthYearOptions.length
      ? `${monthYearOptions[0].year}-${String(monthYearOptions[0].month).padStart(2, '0')}`
      : '';
    const selectedMonthValue = monthValue || selectedMonth || latestMonthValue;
    const previousMonthValue = getPreviousMonthValue(selectedMonthValue);

    if (!previousMonthValue) {
      return;
    }

    const [yearText, monthText] = previousMonthValue.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) {
      return;
    }

    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    setEbDetailsPopup({
      open: true,
      roomNumber,
      monthLabel,
      loading: true,
      error: null,
      records: []
    });

    try {
      const response = await apiService.getRoomMonthlyEbReport(year, month);
      const allRecords = Array.isArray(response.data?.data) ? response.data.data : [];
      const roomRecords = allRecords.filter((record: any) => {
        const sameRoom = String(record.roomNumber ?? '').trim() === String(roomNumber ?? '').trim();
        return sameRoom && (Number(record.totalAmount || 0) > 0 || record.unitsConsumed || record.startingReading || record.endingReading);
      });

      setEbDetailsPopup({
        open: true,
        roomNumber,
        monthLabel,
        loading: false,
        error: roomRecords.length ? null : 'No EB readings found for this room in the previous month.',
        records: roomRecords
      });
    } catch (err) {
      setEbDetailsPopup({
        open: true,
        roomNumber,
        monthLabel,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load previous month EB details.',
        records: []
      });
    }
  };

  const closeEbDetails = () => {
    setEbDetailsPopup({
      open: false,
      roomNumber: '',
      monthLabel: '',
      loading: false,
      error: null,
      records: []
    });
  };

  return (
    <div className="payment-tracking-container">
      <h2 className="section-heading">Payment Tracking</h2>
      {/* Month/Year Selection and Room Filter */}
      <div className="month-selector-wrapper">
        <div className="month-selector">
          <SearchableDropdown
            label="Select Month & Year"
            value={selectedMonth}
            onChange={(option) => setSelectedMonth(option.id.toString())}
            options={monthYearOptions.map(opt => ({
              id: `${opt.year}-${String(opt.month).padStart(2, '0')}`,
              label: opt.label
            }))}
            placeholder="Search month and year..."
          />
        </div>
        
        {selectedMonth && roomOptions.length > 0 && (
          <div className="room-filter">
            <SearchableDropdown
              label="Filter by Room"
              value={selectedRoom}
              onChange={(option) => setSelectedRoom(option.id.toString())}
              options={roomOptions}
              placeholder="Search room..."
            />
            {selectedRoom && (
              <button 
                className="clear-room-filter"
                onClick={() => setSelectedRoom('')}
                title="Clear room filter"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="payment-date-filters">
        <div className="date-filter-group">
          <div className="date-filter-header">
            <h3>Check-In Date</h3>
            {(checkInDateFrom || checkInDateTo) && (
              <button
                type="button"
                className="date-filter-clear"
                onClick={() => {
                  setCheckInDateFrom('');
                  setCheckInDateTo('');
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="date-filter-row">
            <label>
              <span>From</span>
              <input
                type="date"
                value={checkInDateFrom}
                onChange={(e) => setCheckInDateFrom(e.target.value)}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={checkInDateTo}
                onChange={(e) => setCheckInDateTo(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="date-filter-group">
          <div className="date-filter-header">
            <h3>Check-Out Date</h3>
            {(checkOutDateFrom || checkOutDateTo) && (
              <button
                type="button"
                className="date-filter-clear"
                onClick={() => {
                  setCheckOutDateFrom('');
                  setCheckOutDateTo('');
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="date-filter-row">
            <label>
              <span>From</span>
              <input
                type="date"
                value={checkOutDateFrom}
                onChange={(e) => setCheckOutDateFrom(e.target.value)}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={checkOutDateTo}
                onChange={(e) => setCheckOutDateTo(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {(selectedMonth || (!selectedMonth && !hasActiveDateFilter) || payments.length > 0) && (
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
      {(selectedMonth || (!selectedMonth && !hasActiveDateFilter) || payments.length > 0) && (
        <div className="status-summary">
          <div 
            className={`status-badge paid ${selectedStatusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'paid' ? null : 'paid')}
            role="button"
            tabIndex={0}
          >
            <span className="status-label">Paid</span>
            <span className="status-count">{summary.paidCount}</span>
          </div>
          <div 
            className={`status-badge partial ${selectedStatusFilter === 'partial' ? 'active' : ''}`}
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'partial' ? null : 'partial')}
            role="button"
            tabIndex={0}
          >
            <span className="status-label">Partial</span>
            <span className="status-count">{summary.partialCount}</span>
          </div>
          <div 
            className={`status-badge pending ${selectedStatusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'pending' ? null : 'pending')}
            role="button"
            tabIndex={0}
          >
            <span className="status-label">Pending</span>
            <span className="status-count">{summary.pendingCount}</span>
          </div>
          <div 
            className={`status-badge merged ${selectedStatusFilter === 'merged' ? 'active' : ''}`}
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'merged' ? null : 'merged')}
            role="button"
            tabIndex={0}
          >
            <span className="status-label">Merged</span>
            <span className="status-count">{summary.mergedCount}</span>
          </div>
        </div>
      )}

      {/* Loading/Error States */}
      {loading && (
        <LoadingSpinner text="Loading payment records" />
      )}

      {error && (
        <div className="error-state">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Payment Table */}
      {!loading && filteredPayments.length > 0 && (
        <div className="payment-table-wrapper">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Room Number</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Rent Fixed</th>
                <th>Charges</th>
                <th>Rent Received</th>
                <th>Total Receivable</th>
                <th>Balance</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const status = getEffectiveStatus(payment);

                return (
                  <tr 
                    key={`${payment.occupancyId}-${payment.month}-${payment.year}`}
                    className="payment-row"
                  >
                    <td 
                      className="tenant-name"
                      data-label="Tenant"
                      title={`Check-in: ${formatDate(payment.checkInDate)}\nCheck-out: ${payment.checkOutDate ? formatDate(payment.checkOutDate) : 'Active'}`}
                    >
                      {payment.tenantName}
                    </td>
                    <td data-label="Room">
                      {payment.roomNumber}
                    </td>
                    <td data-label="Check-In">
                      {formatDate(payment.checkInDate)}
                    </td>
                    <td data-label="Check-Out">
                      {payment.checkOutDate ? formatDate(payment.checkOutDate) : 'Active'}
                    </td>
                    <td className="amount" data-label="Rent Fixed">
                      ₹{payment.rentFixed.toLocaleString()}
                    </td>
                    <td className="amount eb-charge-cell" data-label="Charges">
                      <div className="eb-charge-content">
                        <span>{payment.charges > 0 ? `₹${payment.charges.toLocaleString()}` : '-'}</span>
                        <button
                          type="button"
                          className="eb-charge-icon"
                          onClick={() => openEbDetails(payment.roomNumber, `${payment.year}-${String(payment.month).padStart(2, '0')}`)}
                          title={`EB details for Room ${payment.roomNumber}`}
                          aria-label={`Show EB details for Room ${payment.roomNumber}`}
                        >
                          ⚡
                        </button>
                      </div>
                    </td>
                    <td className="amount success" data-label="Rent Received">
                      ₹{payment.rentReceived.toLocaleString()}
                    </td>
                    <td className="amount maroon" data-label="Total Receivable">
                      ₹{(payment.proRataRent + payment.charges).toLocaleString()}
                    </td>
                    <td
                      className={`amount ${
                        payment.rentBalance > 0 ? 'pending' : 'success'
                      }`}
                      data-label="Balance"
                      title={getBalanceTooltip(payment)}
                    >
                      ₹{payment.rentBalance.toLocaleString()}
                    </td>
                    <td data-label="Payment Date">
                      {payment.rentReceivedOn
                        ? formatDate(payment.rentReceivedOn)
                        : '-'}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`badge ${getStatusBadgeClass(status)}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && payments.length === 0 && !error && (
        <div className="empty-state">
          <p>No payment records found for the current selection</p>
        </div>
      )}

      {/* Empty State - Filter Applied but No Matches */}
      {!loading && payments.length > 0 && filteredPayments.length === 0 && !error && (
        <div className="empty-state">
          <p>No {selectedStatusFilter || 'matching'} payment records found</p>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setSelectedStatusFilter(null);
              setSelectedRoom('');
              setCheckInDateFrom('');
              setCheckInDateTo('');
              setCheckOutDateFrom('');
              setCheckOutDateTo('');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {ebDetailsPopup.open && (
        <div className="eb-details-overlay" onClick={closeEbDetails}>
          <div className="eb-details-popup" onClick={(event) => event.stopPropagation()}>
            <div className="eb-details-header">
              <div>
                <h3>EB Details</h3>
                <p>Room {ebDetailsPopup.roomNumber} • {ebDetailsPopup.monthLabel}</p>
              </div>
              <button type="button" className="eb-details-close" onClick={closeEbDetails} aria-label="Close EB details">
                ✕
              </button>
            </div>

            {ebDetailsPopup.loading ? (
              <div className="eb-details-loading">Loading EB details...</div>
            ) : ebDetailsPopup.error ? (
              <div className="eb-details-empty">{ebDetailsPopup.error}</div>
            ) : (
              <div className="eb-details-table-wrap">
                <table className="eb-details-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Meter</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Units</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ebDetailsPopup.records.map((record: any, index: number) => (
                      <tr key={`${record.serviceConsumptionId || index}-${record.serviceName || 'eb'}`}>
                        <td className="eb-table-service">{record.serviceName || 'EB Service'}</td>
                        <td>{record.meterNo || '-'}</td>
                        <td>{record.startingReading ?? '-'}</td>
                        <td>{record.endingReading ?? '-'}</td>
                        <td className="eb-table-units">{record.unitsConsumed ?? 0}</td>
                        <td className="eb-table-amount">₹{Number(record.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
