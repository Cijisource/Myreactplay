import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../api';
import { useAuth } from './AuthContext';
import './ManagementStyles.css';

interface DailyStatus {
  id: number;
  date: string;
}

interface GuestCheckIn {
  id: number;
  dailyStatusId: number;
  statusDate?: string;
  guestName: string;
  phoneNumber?: string;
  purpose?: string;
  visitingRoomNo?: string;
  rentAmount?: number;
  depositAmount?: number;
  checkInTime: string;
  checkOutTime?: string;
}

interface Room {
  id: number;
  number: string;
  rent: number;
  beds: number;
}

export default function GuestCheckinManagement() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [statuses, setStatuses] = useState<DailyStatus[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [guestCheckins, setGuestCheckins] = useState<GuestCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkoutDates, setCheckoutDates] = useState<Record<number, string>>({});

  const [formData, setFormData] = useState({
    guestName: '',
    phoneNumber: '',
    purpose: '',
    visitingRoomNo: '',
    rentAmount: '',
    depositAmount: ''
  });

  const phoneRegex = /^\d{10}$/;

  const normalizePhoneDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    return digits;
  };

  const phoneValidationMessage = useMemo(() => {
    if (!formData.phoneNumber) return '';
    if (!/^\d+$/.test(formData.phoneNumber)) return 'Phone number must contain digits only';
    if (formData.phoneNumber.length < 10) return `Phone number must be 10 digits (${formData.phoneNumber.length}/10)`;
    if (formData.phoneNumber.length > 10) return 'Phone number must be exactly 10 digits';
    return '';
  }, [formData.phoneNumber]);

  const isPhoneValid = phoneRegex.test(formData.phoneNumber);

  const guestNameValidationMessage = useMemo(() => {
    if (!formData.guestName) return '';
    if (formData.guestName.trim().length < 2) return 'Guest name must be at least 2 characters';
    return '';
  }, [formData.guestName]);

  const purposeValidationMessage = useMemo(() => {
    if (!formData.purpose) return '';
    if (formData.purpose.trim().length < 3) return 'Purpose must be at least 3 characters';
    return '';
  }, [formData.purpose]);

  const roomValidationMessage = useMemo(() => {
    if (!formData.visitingRoomNo) return '';
    const exists = rooms.some(room => room.number === formData.visitingRoomNo);
    if (!exists) return 'Select a valid room from the dropdown';
    return '';
  }, [formData.visitingRoomNo, rooms]);

  const rentValidationMessage = useMemo(() => {
    if (formData.rentAmount === '') return '';
    const value = parseFloat(formData.rentAmount);
    if (isNaN(value)) return 'Rent amount must be a valid number';
    if (value < 0) return 'Rent amount cannot be negative';
    return '';
  }, [formData.rentAmount]);

  const depositValidationMessage = useMemo(() => {
    if (formData.depositAmount === '') return '';
    const value = parseFloat(formData.depositAmount);
    if (isNaN(value)) return 'Deposit amount must be a valid number';
    if (value < 0) return 'Deposit amount cannot be negative';
    return '';
  }, [formData.depositAmount]);

  const isGuestNameValid = formData.guestName.trim().length >= 2;
  const isPurposeValid = formData.purpose.trim().length >= 3;
  const isRoomValid = formData.visitingRoomNo !== '' && rooms.some(room => room.number === formData.visitingRoomNo);
  const isRentValid = formData.rentAmount !== '' && !isNaN(parseFloat(formData.rentAmount)) && parseFloat(formData.rentAmount) >= 0;
  const isDepositValid = formData.depositAmount !== '' && !isNaN(parseFloat(formData.depositAmount)) && parseFloat(formData.depositAmount) >= 0;
  const isFormValid = isGuestNameValid && isPhoneValid && isPurposeValid && isRoomValid && isRentValid && isDepositValid;

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        return 'Guest check-in API is not available (404). Please verify backend routes and restart the server.';
      }
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };

  const selectedStatus = useMemo(() => {
    if (!selectedDate) return null;
    return statuses.find(s => new Date(s.date).toISOString().split('T')[0] === selectedDate) || null;
  }, [selectedDate, statuses]);

  const consolidatedStats = useMemo(() => {
    const totalGuests = guestCheckins.length;
    const checkedOutGuests = guestCheckins.filter(g => Boolean(g.checkOutTime)).length;
    const activeGuests = totalGuests - checkedOutGuests;
    const totalRent = guestCheckins.reduce((sum, g) => sum + (g.rentAmount || 0), 0);
    const totalDeposit = guestCheckins.reduce((sum, g) => sum + (g.depositAmount || 0), 0);
    return { totalGuests, checkedOutGuests, activeGuests, totalRent, totalDeposit };
  }, [guestCheckins]);

  const fetchStatuses = async () => {
    try {
      const response = await apiService.getDailyStatuses();
      const rows = Array.isArray(response.data) ? response.data : [];
      const ordered = [...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setStatuses(ordered);
      if (!selectedDate && ordered.length > 0) {
        setSelectedDate(new Date(ordered[0].date).toISOString().split('T')[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load daily statuses'));
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await apiService.getRooms();
      const roomRows = Array.isArray(response.data) ? response.data : [];
      setRooms(roomRows);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load rooms'));
    }
  };

  const fetchGuestCheckins = async (statusId: number | null) => {
    if (!statusId) {
      setGuestCheckins([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDailyGuestCheckins(statusId);
      setGuestCheckins(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load guest check-ins'));
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidatedGuestCheckins = async (mode: 'weekly' | 'monthly') => {
    if (!selectedDate) {
      setGuestCheckins([]);
      return;
    }

    const baseDate = new Date(selectedDate);
    const start = new Date(baseDate);
    const end = new Date(baseDate);

    if (mode === 'weekly') {
      const day = baseDate.getDay();
      const offset = day === 0 ? 6 : day - 1;
      start.setDate(baseDate.getDate() - offset);
      end.setDate(start.getDate() + 6);
    } else {
      start.setDate(1);
      end.setMonth(baseDate.getMonth() + 1, 0);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const targetStatuses = statuses.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    try {
      setLoading(true);
      setError(null);

      const responses = await Promise.all(
        targetStatuses.map(async (s) => {
          const response = await apiService.getDailyGuestCheckins(s.id);
          const rows: GuestCheckIn[] = Array.isArray(response.data) ? response.data : [];
          return rows.map(row => ({ ...row, statusDate: s.date }));
        })
      );

      const merged = responses.flat().sort(
        (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
      );
      setGuestCheckins(merged);
    } catch (err) {
      setError(getErrorMessage(err, `Failed to load ${mode} consolidated guest check-ins`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (viewMode === 'daily') {
      fetchGuestCheckins(selectedStatus ? selectedStatus.id : null);
      return;
    }

    fetchConsolidatedGuestCheckins(viewMode);
  }, [selectedDate, viewMode, statuses, selectedStatus]);

  const handleCreateCheckin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStatus) {
      setError('Select a daily status date first');
      return;
    }

    if (viewMode !== 'daily') {
      setError('Switch to Daily view to add new guest check-ins');
      return;
    }

    if (!formData.guestName.trim()) {
      setError('Guest name is required');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!formData.purpose.trim()) {
      setError('Purpose is required');
      return;
    }

    if (!formData.rentAmount || isNaN(parseFloat(formData.rentAmount)) || parseFloat(formData.rentAmount) < 0) {
      setError('Valid rent amount is required');
      return;
    }

    if (!formData.depositAmount || isNaN(parseFloat(formData.depositAmount)) || parseFloat(formData.depositAmount) < 0) {
      setError('Valid deposit amount is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.createDailyGuestCheckin(selectedStatus.id, {
        guestName: formData.guestName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        purpose: formData.purpose.trim(),
        visitingRoomNo: formData.visitingRoomNo.trim() || undefined,
        rentAmount: parseFloat(formData.rentAmount),
        depositAmount: parseFloat(formData.depositAmount)
      });

      setFormData({
        guestName: '',
        phoneNumber: '',
        purpose: '',
        visitingRoomNo: '',
        rentAmount: '',
        depositAmount: ''
      });
      setSuccess('Guest check-in recorded successfully');
      await fetchGuestCheckins(selectedStatus.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create guest check-in'));
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (value: string | Date): string => {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDateOnly = (value: string | Date): Date => {
    const date = value instanceof Date ? value : new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getSelectedCheckoutDate = (guest: GuestCheckIn): string => {
    return checkoutDates[guest.id] || formatDateForInput(new Date());
  };

  const calculateStayDays = (checkInTime: string, checkoutDate: string): number => {
    const checkIn = new Date(checkInTime);
    const checkout = new Date(checkoutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkout.getTime())) {
      return 0;
    }

    const checkInDate = toDateOnly(checkIn);
    const checkoutDateOnly = toDateOnly(checkout);
    const diffMs = checkoutDateOnly.getTime() - checkInDate.getTime();
    if (diffMs < 0) {
      return 0;
    }

    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateRentForStay = (checkInTime: string, checkoutDate: string, baseDailyRent: number): number => {
    if (!baseDailyRent || baseDailyRent < 0) {
      return 0;
    }

    const stayDays = calculateStayDays(checkInTime, checkoutDate);
    if (stayDays <= 0) {
      return 0;
    }

    const totalRent = baseDailyRent * stayDays;
    return Math.round(totalRent * 100) / 100;
  };

  const buildCheckoutDateTimeIso = (checkoutDate: string): string => {
    const date = new Date(checkoutDate);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  };

  const refreshCurrentView = async (fallbackStatusId?: number) => {
    if (viewMode === 'daily') {
      await fetchGuestCheckins(selectedStatus?.id ?? fallbackStatusId ?? null);
      return;
    }

    await fetchConsolidatedGuestCheckins(viewMode);
  };

  const handleCheckout = async (guest: GuestCheckIn) => {
    if (!selectedStatus) return;

    if (!guest.dailyStatusId) {
      setError('Missing daily status for this guest check-in');
      return;
    }

    const selectedCheckoutDate = getSelectedCheckoutDate(guest);
    const stayDays = calculateStayDays(guest.checkInTime, selectedCheckoutDate);

    if (!selectedCheckoutDate) {
      setError('Please select a checkout date');
      return;
    }

    if (stayDays <= 0) {
      setError('Checkout date cannot be earlier than check-in date');
      return;
    }

    const calculatedRent = calculateRentForStay(
      guest.checkInTime,
      selectedCheckoutDate,
      guest.rentAmount || 0
    );

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.updateDailyGuestCheckin(guest.dailyStatusId, guest.id, {
        checkOutTime: buildCheckoutDateTimeIso(selectedCheckoutDate),
        rentAmount: calculatedRent
      });

      setSuccess('Guest checked out successfully');
      setCheckoutDates(prev => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
      await refreshCurrentView(guest.dailyStatusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to check out guest'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (guest: GuestCheckIn) => {
    if (!isAdmin) {
      setError('Only admin can delete guest check-ins');
      return;
    }

    if (!guest.dailyStatusId) {
      setError('Missing daily status for this guest check-in');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.deleteDailyGuestCheckin(guest.dailyStatusId, guest.id);

      setSuccess('Guest check-in deleted successfully');
      await refreshCurrentView(guest.dailyStatusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete guest check-in'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoomChange = (roomNumber: string) => {
    const matchedRoom = rooms.find(room => room.number === roomNumber);
    setFormData(prev => ({
      ...prev,
      visitingRoomNo: roomNumber,
      rentAmount: matchedRoom ? String(matchedRoom.rent ?? 0) : prev.rentAmount
    }));
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = normalizePhoneDigits(value);
    setFormData(prev => ({ ...prev, phoneNumber: digitsOnly }));
  };

  return (
    <div className="management-container guest-checkin-container">
      <h2 className="section-heading">Guest Check-In Management</h2>
      <div className="toolbar">
        <select
          className="sort-select"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'daily' | 'weekly' | 'monthly')}
        >
          <option value="daily">Daily View</option>
          <option value="weekly">Weekly Consolidated</option>
          <option value="monthly">Monthly Consolidated</option>
        </select>

        <input
          type="date"
          className="sort-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        <button
          className="btn btn-secondary"
          onClick={() => {
            if (viewMode === 'daily') {
              fetchGuestCheckins(selectedStatus ? selectedStatus.id : null);
              return;
            }
            fetchConsolidatedGuestCheckins(viewMode);
          }}
          disabled={!selectedDate || loading}
        >
          Refresh
        </button>
      </div>

      {selectedStatus && (
        <div className="filter-info">
          <p>
            {viewMode === 'daily' && `Managing guest entries for ${new Date(selectedStatus.date).toLocaleDateString()}`}
            {viewMode === 'weekly' && `Weekly consolidated view around ${new Date(selectedStatus.date).toLocaleDateString()}`}
            {viewMode === 'monthly' && `Monthly consolidated view for ${new Date(selectedStatus.date).toLocaleDateString()}`}
          </p>
        </div>
      )}

      <div className="items-grid" style={{ marginBottom: '1rem' }}>
        <div className="item-card"><p><strong>Total Guests:</strong> {consolidatedStats.totalGuests}</p></div>
        <div className="item-card"><p><strong>Active:</strong> {consolidatedStats.activeGuests}</p></div>
        <div className="item-card"><p><strong>Checked Out:</strong> {consolidatedStats.checkedOutGuests}</p></div>
        <div className="item-card"><p><strong>Total Rent:</strong> ₹{consolidatedStats.totalRent.toFixed(2)}</p></div>
        <div className="item-card"><p><strong>Total Deposit:</strong> ₹{consolidatedStats.totalDeposit.toFixed(2)}</p></div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {viewMode === 'daily' && (
      <div className="form-container" style={{ marginBottom: '1rem' }}>
        <h3>Add Guest Check-In</h3>
        <form onSubmit={handleCreateCheckin}>
          <input
            type="text"
            placeholder="Guest Name *"
            value={formData.guestName}
            onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
            required
          />
          {guestNameValidationMessage && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {guestNameValidationMessage}
            </div>
          )}
          <input
            type="text"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            maxLength={10}
            inputMode="numeric"
            required
          />
          {phoneValidationMessage && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {phoneValidationMessage}
            </div>
          )}
          <select
            value={formData.visitingRoomNo}
            onChange={(e) => handleRoomChange(e.target.value)}
            required
          >
            <option value="">Select Visiting Room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.number}>
                Room {room.number} (Rent: {room.rent})
              </option>
            ))}
          </select>
          {roomValidationMessage && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {roomValidationMessage}
            </div>
          )}
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Rent Amount"
            value={formData.rentAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, rentAmount: e.target.value }))}
            required
          />
          {rentValidationMessage && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {rentValidationMessage}
            </div>
          )}
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Deposit Amount"
            value={formData.depositAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
            required
          />
          {depositValidationMessage && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {depositValidationMessage}
            </div>
          )}
          <textarea
            placeholder="Purpose"
            rows={2}
            value={formData.purpose}
            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
            required
          />
          {purposeValidationMessage && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {purposeValidationMessage}
            </div>
          )}
          <div className="form-buttons">
            <button type="submit" className="btn btn-success" disabled={saving || !selectedStatus || !isFormValid}>
              {saving ? 'Saving...' : 'Check In Guest'}
            </button>
          </div>
        </form>
      </div>
      )}

      {loading ? (
        <div className="loading-spinner"></div>
      ) : guestCheckins.length === 0 ? (
        <div className="no-results-message">
          <p>No guest check-ins found for the selected date.</p>
        </div>
      ) : (
        <div className="items-grid">
          {guestCheckins.map((guest) => {
            const isCheckedOut = Boolean(guest.checkOutTime);
            return (
              <div key={guest.id} className="item-card">
                <div className="item-header">
                  <h4>{guest.guestName}</h4>
                  <div className="item-actions">
                    {!isCheckedOut && (
                      <input
                        type="date"
                        className="sort-select"
                        value={getSelectedCheckoutDate(guest)}
                        min={formatDateForInput(guest.checkInTime)}
                        max={formatDateForInput(new Date())}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCheckoutDates(prev => ({ ...prev, [guest.id]: value }));
                        }}
                        disabled={saving}
                        style={{ minWidth: '150px' }}
                      />
                    )}
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleCheckout(guest)}
                      disabled={isCheckedOut || saving}
                    >
                      {isCheckedOut ? 'Checked Out' : 'Check Out'}
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(guest)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <p><strong>Phone:</strong> {guest.phoneNumber || 'N/A'}</p>
                <p><strong>Status Date:</strong> {guest.statusDate ? new Date(guest.statusDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Visiting Room:</strong> {guest.visitingRoomNo || 'N/A'}</p>
                <p><strong>Rent:</strong> ₹{(guest.rentAmount || 0).toFixed(2)}</p>
                <p><strong>Deposit:</strong> ₹{(guest.depositAmount || 0).toFixed(2)}</p>
                <p><strong>Purpose:</strong> {guest.purpose || 'N/A'}</p>
                <p><strong>Check-In:</strong> {new Date(guest.checkInTime).toLocaleString()}</p>
                <p><strong>Check-Out:</strong> {guest.checkOutTime ? new Date(guest.checkOutTime).toLocaleString() : 'Still inside'}</p>
                {!isCheckedOut && (
                  <p>
                    <strong>Auto Rent on Checkout:</strong> ₹
                    {calculateRentForStay(
                      guest.checkInTime,
                      getSelectedCheckoutDate(guest),
                      guest.rentAmount || 0
                    ).toFixed(2)}
                    {' '}for{' '}
                    {calculateStayDays(guest.checkInTime, getSelectedCheckoutDate(guest))}
                    {' '}day(s)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
