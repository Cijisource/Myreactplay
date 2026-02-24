import { useState, useEffect, useMemo } from 'react';
import { getOccupancyLinks } from '../api';
import './OccupancyLinks.css';

interface OccupancyLink {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
  tenantCity: string;
  tenantPhoto?: string;
  roomId: number;
  roomNumber: string;
  roomRent: number;
  beds: number;
  checkInDate: string;
  checkOutDate: string | null;
  rentFixed: number;
  isActive: boolean;
  currentRentReceived: number;
  currentPendingPayment: number;
  lastPaymentDate?: string;
}

interface Stats {
  totalOccupancies: number;
  activeOccupancies: number;
  inactiveOccupancies: number;
  totalRentsCollected: number;
  totalPendingPayments: number;
}

export default function OccupancyLinks(): JSX.Element {
  const [occupancies, setOccupancies] = useState<OccupancyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'tenant' | 'room' | 'checkIn'>('checkIn');

  useEffect(() => {
    const fetchOccupancies = async () => {
      try {
        setLoading(true);
        const data = await getOccupancyLinks();
        setOccupancies(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load occupancy links');
        console.error('Error fetching occupancies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancies();
  }, []);

  // Calculate statistics
  const stats = useMemo((): Stats => {
    const active = occupancies.filter(o => o.isActive).length;
    const inactive = occupancies.length - active;
    const totalCollected = occupancies.reduce((sum, o) => sum + (o.currentRentReceived || 0), 0);
    const totalPending = occupancies.reduce((sum, o) => sum + (o.currentPendingPayment || 0), 0);

    return {
      totalOccupancies: occupancies.length,
      activeOccupancies: active,
      inactiveOccupancies: inactive,
      totalRentsCollected: totalCollected,
      totalPendingPayments: totalPending
    };
  }, [occupancies]);

  // Filter and sort occupancies
  const filteredAndSorted = useMemo(() => {
    let filtered = occupancies.filter(occ => {
      // Filter by status
      if (filterStatus === 'active' && !occ.isActive) return false;
      if (filterStatus === 'inactive' && occ.isActive) return false;

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          occ.tenantName.toLowerCase().includes(term) ||
          occ.roomNumber.toLowerCase().includes(term) ||
          occ.tenantPhone.toLowerCase().includes(term) ||
          occ.tenantCity.toLowerCase().includes(term)
        );
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'tenant') return a.tenantName.localeCompare(b.tenantName);
      if (sortBy === 'room') return a.roomNumber.localeCompare(b.roomNumber);
      // Default: checkIn
      return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
    });
  }, [occupancies, filterStatus, searchTerm, sortBy]);

  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="occupancy-links-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading room-tenant linkages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="occupancy-links-container">
      {/* Header */}
      <div className="links-header">
        <div>
          <h1>🔗 Room-Tenant Occupancy Links</h1>
          <p>View active tenant assignments to rooms and payment status</p>
        </div>
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
        <div className="stat-card total">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <h3>Total Linkages</h3>
            <p className="stat-value">{stats.totalOccupancies}</p>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <h3>Active</h3>
            <p className="stat-value">{stats.activeOccupancies}</p>
          </div>
        </div>

        <div className="stat-card inactive">
          <div className="stat-icon">⊗</div>
          <div className="stat-content">
            <h3>Inactive</h3>
            <p className="stat-value">{stats.inactiveOccupancies}</p>
          </div>
        </div>

        <div className="stat-card collected">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <h3>Rents Collected</h3>
            <p className="stat-value">{formatCurrency(stats.totalRentsCollected)}</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-value">{formatCurrency(stats.totalPendingPayments)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by tenant name, room, phone or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({stats.totalOccupancies})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active ({stats.activeOccupancies})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterStatus('inactive')}
            >
              Inactive ({stats.inactiveOccupancies})
            </button>
          </div>

          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
              <option value="checkIn">Check-In Date (Newest)</option>
              <option value="tenant">Tenant Name</option>
              <option value="room">Room Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* Occupancy Links Table */}
      <div className="table-wrapper">
        <table className="occupancy-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Room</th>
              <th>Tenant</th>
              <th>Phone</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Rent Fixed</th>
              <th>Collected</th>
              <th>Pending</th>
              <th>Last Payment</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map(occ => (
                <tr key={occ.occupancyId} className={`row ${occ.isActive ? 'active' : 'inactive'}`}>
                  <td className="status-cell">
                    <span className={`badge ${occ.isActive ? 'active' : 'inactive'}`}>
                      {occ.isActive ? '🟢 Active' : '🔴 Ended'}
                    </span>
                  </td>
                  <td className="room-cell">
                    <strong>#{occ.roomNumber.trim()}</strong>
                    <small>{occ.beds} bed{occ.beds > 1 ? 's' : ''}</small>
                  </td>
                  <td className="tenant-cell">
                    <strong>{occ.tenantName.trim()}</strong>
                    <small>{occ.tenantCity.trim()}</small>
                  </td>
                  <td className="phone-cell">{occ.tenantPhone.trim()}</td>
                  <td>{formatDate(occ.checkInDate)}</td>
                  <td>{occ.checkOutDate ? formatDate(occ.checkOutDate) : '-'}</td>
                  <td className="currency-cell">
                    <strong>{formatCurrency(occ.rentFixed)}</strong>
                  </td>
                  <td className="currency-cell collected">
                    {formatCurrency(occ.currentRentReceived)}
                  </td>
                  <td className="currency-cell pending">
                    {formatCurrency(occ.currentPendingPayment)}
                  </td>
                  <td>{occ.lastPaymentDate ? formatDate(occ.lastPaymentDate) : '-'}</td>
                </tr>
              ))
            ) : (
              <tr className="no-data">
                <td colSpan={10}>
                  <p>📭 No occupancy links found matching your criteria</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Database Relationship Info */}
      <div className="relationship-info">
        <h3>🗄️ Database Relationship (FK_Occupancy_Tenant)</h3>
        <div className="relationship-diagram">
          <div className="entity room-entity">
            <strong>RoomDetail</strong>
            <small>Id, Number, Rent, Beds</small>
          </div>
          <div className="connection">↔</div>
          <div className="entity occupancy-entity">
            <strong>Occupancy</strong>
            <small>Id, TenantId (FK), RoomId (FK)</small>
          </div>
          <div className="connection">↔</div>
          <div className="entity tenant-entity">
            <strong>Tenant</strong>
            <small>Id, Name, Phone, City</small>
          </div>
        </div>
        <p className="relationship-desc">
          The Occupancy table serves as the junction table linking Rooms to Tenants.
          Each occupancy record (FK_Occupancy_Tenant) represents a tenant's assignment to a room for a specific time period.
        </p>
      </div>
    </div>
  );
}
