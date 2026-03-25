import { useState, useEffect, useMemo } from 'react';
import { getRoomOccupancyData } from '../api';
import SearchableDropdown from './SearchableDropdown';
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
  const [showStatsGrid, setShowStatsGrid] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());

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

  // Generate available room options based on occupancy filter
  const roomOptions = useMemo(() => {
    const uniqueRooms = new Set<string>();
    rooms.forEach((r) => {
      // Filter rooms based on occupancy status
      if (filterOccupancy === 'occupied' && !r.isOccupied) return;
      if (filterOccupancy === 'vacant' && r.isOccupied) return;
      
      if (r.roomNumber) {
        uniqueRooms.add(String(r.roomNumber));
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
  }, [rooms, filterOccupancy]);

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
      // Filter by room selection
      if (selectedRoom && String(room.roomNumber || '') !== selectedRoom) {
        return false;
      }
      
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
  }, [rooms, filterOccupancy, searchTerm, selectedRoom]);

  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
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

  const calculateOccupancyAging = (checkInDate: string | undefined): string => {
    if (!checkInDate) return 'N/A';
    const checkIn = new Date(checkInDate);
    const today = new Date();
    
    // Normalize to date only (remove time component for accurate day counting)
    checkIn.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const days = Math.floor((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  const calculateVacancyAging = (checkOutDate: string | null | undefined): string => {
    if (!checkOutDate) return 'N/A';
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    
    // Normalize to date only (remove time component for accurate day counting)
    checkOut.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const days = Math.floor((today.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Not yet vacant';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    return `${Math.floor(days / 30)} months`;
  };

  const toggleRoomExpanded = (roomId: number) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const getOccupancyStatus = (checkOutDate: string | null | undefined): string => {
    if (!checkOutDate) return 'Active';
    
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    
    // Normalize dates to compare only the date part
    checkOut.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (checkOut > today) {
      return 'Active';
    } else {
      return 'Ended';
    }
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
      <div className="section-header">
        <h2>Statistics</h2>
        <button 
          className={`toggle-btn ${showStatsGrid ? 'expanded' : 'collapsed'}`}
          onClick={() => setShowStatsGrid(!showStatsGrid)}
          aria-expanded={showStatsGrid}
        >
          {showStatsGrid ? '▼' : '▶'}
        </button>
      </div>
      
      <div className={`collapsible-content ${showStatsGrid ? 'open' : 'closed'}`}>
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
      </div>

      {/* Filters */}
      <div className="section-header">
        <h2>Filters & Search</h2>
        <button 
          className={`toggle-btn ${showFilters ? 'expanded' : 'collapsed'}`}
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          {showFilters ? '▼' : '▶'}
        </button>
      </div>

      <div className={`collapsible-content ${showFilters ? 'open' : 'closed'}`}>
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

        {/* Room Filter Dropdown */}
        <div className="room-filter">
          <SearchableDropdown
            options={roomOptions}
            value={selectedRoom}
            onChange={(option) => setSelectedRoom(option.id as string)}
            placeholder="Filter by Room"
          />
          {selectedRoom && (
            <button
              onClick={() => setSelectedRoom('')}
              className="clear-room-filter"
            >
              Clear Room Filter
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Rooms Section */}
      <div className="section-header">
        <h2>Rooms</h2>
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
                <button
                  className="toggle-room-info-btn"
                  onClick={() => toggleRoomExpanded(room.roomId)}
                  title={expandedRooms.has(room.roomId) ? 'Hide Details' : 'Show Details'}
                >
                  {expandedRooms.has(room.roomId) ? '−' : '+'}
                </button>
              </div>

              {room.isOccupied && room.tenantName ? (
                <>
                  {expandedRooms.has(room.roomId) && (
                    <div className="room-tenant-info">
                  <div className="tenant-section">
                    <h4>Tenant Information</h4>
                    <p className="tenant-name">👤 {room.tenantName}</p>
                    <p className="tenant-contact">📱 <a href={`tel:${room.tenantPhone}`}>{room.tenantPhone}</a></p>
                    <p className="check-in">📅 Check-in: {formatDate(room.checkInDate)}</p>
                    <p className="aging-info">⏱️ Occupancy Aging: {calculateOccupancyAging(room.checkInDate)}</p>
                    {room.checkOutDate && (
                      <p className="check-out">📅 Check-out: {formatDate(room.checkOutDate)}</p>
                    )}
                    <p className={`occupancy-status ${getOccupancyStatus(room.checkOutDate).toLowerCase().replace(/ /g, '-')}`}>
                      Status: {getOccupancyStatus(room.checkOutDate)}
                    </p>
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
                  )}
                </>
              ) : (
                <>
                  {expandedRooms.has(room.roomId) && (
                    <div className="room-vacant-info">
                      <p className="vacant-message">No tenant assigned</p>
                      <p className="vacant-action">Ready for new occupant</p>
                      <p className="vacancy-aging">⏱️ Vacancy Aging: {calculateVacancyAging(null)} (No previous checkout data)</p>
                    </div>
                  )}
                </>
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
