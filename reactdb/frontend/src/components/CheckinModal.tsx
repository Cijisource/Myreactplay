import { useState, useEffect } from 'react';
import { apiService } from '../api';
import './CheckinModal.css';
import './ManagementStyles.css';

interface CheckinModalProps {
  tenantId: number;
  tenantName: string;
  onClose: () => void;
  onCheckInSuccess: (updatedOccupancy: any) => void;
}

interface VacantRoom {
  id: number;
  number: string;
  rent: number;
  beds: number;
}

export default function CheckinModal({
  tenantId,
  tenantName,
  onClose,
  onCheckInSuccess
}: CheckinModalProps) {
  const [roomId, setRoomId] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [rentFixed, setRentFixed] = useState<string>('');
  const [depositReceived, setDepositReceived] = useState<string>('');
  const [vacantRooms, setVacantRooms] = useState<VacantRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Fetch vacant rooms on mount
  useEffect(() => {
    const fetchVacantRooms = async () => {
      try {
        setIsLoadingRooms(true);
        const response = await apiService.getVacantRooms();
        setVacantRooms(response.data || []);
      } catch (err) {
        console.error('Error fetching vacant rooms:', err);
        setError('Failed to load vacant rooms');
      } finally {
        setIsLoadingRooms(false);
      }
    };
    
    fetchVacantRooms();
  }, []);

  // Auto-set checkout date to 3 months from check-in date
  useEffect(() => {
    if (checkInDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkIn);
      checkOut.setMonth(checkOut.getMonth() + 3);
      setCheckOutDate(checkOut.toISOString().split('T')[0]);
    }
  }, [checkInDate]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get today's date
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Get minimum checkout date (day after check-in)
  const getMinCheckOutDate = (): string => {
    const minDate = new Date(checkInDate);
    minDate.setDate(minDate.getDate() + 1);
    return minDate.toISOString().split('T')[0];
  };

  const handleCheckIn = async () => {
    if (!roomId) {
      setError('Please select a room');
      return;
    }
    if (!checkInDate) {
      setError('Please select a check-in date');
      return;
    }
    if (!checkOutDate) {
      setError('Please select a check-out date');
      return;
    }
    if (!rentFixed || parseFloat(rentFixed) <= 0) {
      setError('Please enter a valid rent amount');
      return;
    }
    if (depositReceived && parseFloat(depositReceived) < 0) {
      setError('Deposit amount cannot be negative');
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError('Checkout date must be after check-in date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.checkInTenant(
        tenantId, 
        parseInt(roomId), 
        checkInDate,
        checkOutDate,
        parseFloat(rentFixed),
        depositReceived ? parseFloat(depositReceived) : 0
      );
      onCheckInSuccess(response.data.occupancy);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in tenant');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRoomId('');
    setCheckInDate(new Date().toISOString().split('T')[0]);
    setCheckOutDate('');
    setRentFixed('');
    setDepositReceived('');
    setError(null);
    setLoading(false);
    onClose();
  };

  const selectedRoom = vacantRooms.find(r => r.id === parseInt(roomId));

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleCheckIn(); }} className="tenant-form">
      {error && (
        <div className="form-error">
          <span>❌</span>
          {error}
        </div>
      )}

      {/* Tenant Information */}
      <div className="form-section">
        <h3>Tenant Information</h3>

        <div className="form-group">
          <label>Tenant Name</label>
          <input
            type="text"
            value={tenantName}
            disabled
            className="form-input-disabled"
          />
        </div>
      </div>

      {/* Check-In Details */}
      <div className="form-section">
        <h3>Check-In Details</h3>

        <div className="form-group">
          <label htmlFor="room-select">Select Room *</label>
          {isLoadingRooms ? (
            <div className="loading-spinner" style={{ marginTop: '0.5rem' }}>Loading rooms...</div>
          ) : vacantRooms.length === 0 ? (
            <div className="form-error">No vacant rooms available</div>
          ) : (
            <select
              id="room-select"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                const room = vacantRooms.find(r => r.id === parseInt(e.target.value));
                if (room) {
                  setRentFixed(String(room.rent));
                } else {
                  setRentFixed('');
                }
                setError(null);
              }}
              disabled={loading}
              required
              className="form-select"
            >
              <option value="">-- Select a vacant room --</option>
              {vacantRooms.map(room => (
                <option key={room.id} value={room.id}>
                  Room {room.number} (₹{room.rent}/mo, {room.beds} bed{room.beds > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="checkin-date">Check-In Date *</label>
          <input
            id="checkin-date"
            type="date"
            value={checkInDate}
            onChange={(e) => {
              setCheckInDate(e.target.value);
              setError(null);
            }}
            max={getTodayDate()}
            disabled={loading}
            required
          />
          <p className="field-hint">
            Select a date up to today ({formatDate(getTodayDate())})
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="checkout-date">Expected Check-Out Date *</label>
          <input
            id="checkout-date"
            type="date"
            value={checkOutDate}
            onChange={(e) => {
              setCheckOutDate(e.target.value);
              setError(null);
            }}
            min={checkInDate ? getMinCheckOutDate() : ''}
            disabled={loading || !checkInDate}
            required
          />
          <p className="field-hint">
            {checkInDate ? `Select a date after ${formatDate(checkInDate)}` : 'Select a check-in date first'}
          </p>
        </div>

        {roomId && selectedRoom && (
          <div className="form-group">
            <label>Room Details</label>
            <div className="room-details-display">
              <p><strong>Room Number:</strong> {selectedRoom.number}</p>
              <p><strong>Monthly Rent:</strong> ₹{selectedRoom.rent}</p>
              <p><strong>Beds:</strong> {selectedRoom.beds}</p>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="rent-fixed">Fixed Rent Amount *</label>
          <input
            id="rent-fixed"
            type="number"
            value={rentFixed}
            onChange={(e) => {
              setRentFixed(e.target.value);
              setError(null);
            }}
            min="0"
            step="0.01"
            disabled={loading}
            required
            placeholder="Auto-populated from room selection"
          />
          <p className="field-hint">
            Monthly rent amount to be fixed for this occupancy
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="deposit-received">Deposit Received (Optional)</label>
          <input
            id="deposit-received"
            type="number"
            value={depositReceived}
            onChange={(e) => {
              setDepositReceived(e.target.value);
              setError(null);
            }}
            min="0"
            step="0.01"
            disabled={loading}
            placeholder="Security deposit amount"
          />
          <p className="field-hint">
            Security deposit or advance amount received from tenant
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={!roomId || !checkInDate || !checkOutDate || !rentFixed || loading || isLoadingRooms}
        >
          {loading ? 'Processing...' : 'Confirm Check-In'}
        </button>
      </div>
    </form>
  );
}
