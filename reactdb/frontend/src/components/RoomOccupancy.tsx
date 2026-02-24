import { useState, useEffect, useMemo } from 'react';
import { getRoomOccupancyData } from '../api';
import './RoomOccupancy.css';

interface OccupancyData {
  roomId: number;
  roomNumber: string;
  roomRent: number;
  beds: number;
  isOccupied: boolean;
  tenantId?: number;
  tenantName?: string;
  tenantPhone?: string;
  checkInDate?: string;
  checkOutDate?: string | null;
  currentPendingPayment?: number;
  currentRentReceived?: number;
  lastPaymentDate?: string;
}

interface Stats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  totalCurrentPayment: number;
}

export default function RoomOccupancy(): JSX.Element {
  const [rooms, setRooms] = useState<OccupancyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true);
        const data = await getRoomOccupancyData();
        setRooms(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room occupancy data');
        console.error('Error fetching room data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, []);

  // Calculate statistics
  const stats = useMemo((): Stats => {
    const total = rooms.length;
    const occupied = rooms.filter(r => r.isOccupied).length;
    const vacant = total - occupied;
    const totalRent = rooms.reduce((sum, r) => sum + (r.roomRent || 0), 0);
    const totalPayment = rooms.reduce((sum, r) => sum + (r.currentRentReceived || 0), 0);

    return {
      totalRooms: total,
      occupiedRooms: occupied,
      vacantRooms: vacant,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      totalMonthlyRent: totalRent,
      totalCurrentPayment: totalPayment
    };
  }, [rooms]);

  // Filter rooms based on search and occupancy status
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Filter by occupancy status
      if (filterOccupancy === 'occupied' && !room.isOccupied) return false;
      if (filterOccupancy === 'vacant' && room.isOccupied) return false;

      // Filter by search term (room number or tenant name)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          room.roomNumber.toLowerCase().includes(term) ||
          (room.tenantName && room.tenantName.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }, [rooms, filterOccupancy, searchTerm]);

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
      <div className="occupancy-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading room occupancy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="occupancy-container">
      {/* Header */}
      <div className="occupancy-header">
        <div>
          <h1>🏠 Room Occupancy Dashboard</h1>
          <p>Track room status and tenant information</p>
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
          <div className="stat-icon">🔑</div>
          <div className="stat-content">
            <h3>Total Rooms</h3>
            <p className="stat-value">{stats.totalRooms}</p>
          </div>
        </div>

        <div className="stat-card occupied">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Occupied</h3>
            <p className="stat-value">{stats.occupiedRooms}</p>
            <span className="stat-percentage">{stats.occupancyRate}%</span>
          </div>
        </div>

        <div className="stat-card vacant">
          <div className="stat-icon">🏡</div>
          <div className="stat-content">
            <h3>Vacant</h3>
            <p className="stat-value">{stats.vacantRooms}</p>
          </div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Monthly Rent</h3>
            <p className="stat-value">{formatCurrency(stats.totalMonthlyRent)}</p>
          </div>
        </div>

        <div className="stat-card collected">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <h3>Collected This Month</h3>
            <p className="stat-value">{formatCurrency(stats.totalCurrentPayment)}</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending Payment</h3>
            <p className="stat-value">
              {formatCurrency(stats.totalMonthlyRent - stats.totalCurrentPayment)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by room number or tenant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterOccupancy === 'all' ? 'active' : ''}`}
            onClick={() => setFilterOccupancy('all')}
          >
            All Rooms ({rooms.length})
          </button>
          <button
            className={`filter-btn ${filterOccupancy === 'occupied' ? 'active' : ''}`}
            onClick={() => setFilterOccupancy('occupied')}
          >
            Occupied ({stats.occupiedRooms})
          </button>
          <button
            className={`filter-btn ${filterOccupancy === 'vacant' ? 'active' : ''}`}
            onClick={() => setFilterOccupancy('vacant')}
          >
            Vacant ({stats.vacantRooms})
          </button>
        </div>
      </div>

      {/* Room Grid */}
      <div className="rooms-grid">
        {filteredRooms.length > 0 ? (
          filteredRooms.map(room => (
            <div key={room.roomId} className={`room-card ${room.isOccupied ? 'occupied' : 'vacant'}`}>
              <div className="room-header">
                <div>
                  <h3>Room {room.roomNumber}</h3>
                  <p className="room-rent">{formatCurrency(room.roomRent)}/month • {room.beds} bed{room.beds > 1 ? 's' : ''}</p>
                </div>
                <div className={`occupancy-badge ${room.isOccupied ? 'occupied' : 'vacant'}`}>
                  {room.isOccupied ? '🟢 Occupied' : '🔴 Vacant'}
                </div>
              </div>

              {room.isOccupied && room.tenantName ? (
                <div className="room-tenant-info">
                  <div className="tenant-section">
                    <h4>Tenant Information</h4>
                    <p className="tenant-name">👤 {room.tenantName}</p>
                    <p className="tenant-contact">📱 {room.tenantPhone}</p>
                    <p className="check-in">📅 Check-in: {formatDate(room.checkInDate)}</p>
                    {room.checkOutDate && (
                      <p className="check-out">📅 Check-out: {formatDate(room.checkOutDate)}</p>
                    )}
                  </div>

                  <div className="payment-section">
                    <h4>Payment Status</h4>
                    <div className="payment-row">
                      <span>Received:</span>
                      <span className="amount received">
                        {formatCurrency(room.currentRentReceived)}
                      </span>
                    </div>
                    <div className="payment-row">
                      <span>Pending:</span>
                      <span className="amount pending">
                        {formatCurrency((room.roomRent || 0) - (room.currentRentReceived || 0))}
                      </span>
                    </div>
                    {room.lastPaymentDate && (
                      <p className="last-payment">Last Payment: {formatDate(room.lastPaymentDate)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="room-vacant-info">
                  <p className="vacant-message">No tenant assigned</p>
                  <p className="vacant-action">Ready for new occupant</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>📭 No rooms found matching your criteria</p>
            <p>Try adjusting your search or filter settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
