import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../api';
import LoadingSpinner from './LoadingSpinner';
import './CleaningStatusManagement.css';

type CleaningStatus = 'cleaned' | 'pending';

interface RoomCleaningRecord {
  roomId: number;
  roomNumber: string;
  status: CleaningStatus;
  updatedAt: string | null;
  lastCleanedDate: string | null;
}

const getLocalDateInputValue = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CleaningStatusManagement(): JSX.Element {
  const [selectedDate, setSelectedDate] = useState(getLocalDateInputValue);
  const [rooms, setRooms] = useState<RoomCleaningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoomId, setSavingRoomId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  const loadStatuses = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await apiService.getRoomCleaningStatuses(selectedDate);
      if (requestId === loadRequestId.current) {
        setRooms(response.data);
      }
    } catch (err) {
      if (requestId === loadRequestId.current) {
        setError(err instanceof Error ? err.message : 'Failed to load cleaning statuses');
      }
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadStatuses();
    return () => {
      loadRequestId.current += 1;
    };
  }, [loadStatuses]);

  const totals = useMemo(() => ({
    cleaned: rooms.filter(room => room.status === 'cleaned').length,
    pending: rooms.filter(room => room.status !== 'cleaned').length,
  }), [rooms]);

  const updateStatus = async (room: RoomCleaningRecord) => {
    const nextStatus: CleaningStatus = room.status === 'cleaned' ? 'pending' : 'cleaned';
    setSavingRoomId(room.roomId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await apiService.updateRoomCleaningStatus(room.roomId, {
        date: selectedDate,
        status: nextStatus,
      });
      setRooms(currentRooms => currentRooms.map(currentRoom =>
        currentRoom.roomId === room.roomId
          ? { ...currentRoom, status: response.data.status, updatedAt: response.data.updatedAt }
          : currentRoom
      ));
      setSuccessMessage(`Room ${room.roomNumber} marked ${nextStatus === 'cleaned' ? 'cleaned' : 'as needing cleaning'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cleaning status');
    } finally {
      setSavingRoomId(null);
    }
  };

  const formatUpdatedAt = (value: string | null): string => {
    if (!value) {
      return 'Not updated';
    }
    const updatedAt = new Date(value);
    return Number.isNaN(updatedAt.getTime())
      ? 'Updated'
      : `Updated ${updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  const formatLastCleanedDate = (value: string | null): string =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Never cleaned';

  return (
    <div className="management-container room-cleaning-container">
      <header className="room-cleaning-header">
        <div>
          <h1>Room Cleaning Status</h1>
          <p>Track which rooms have been cleaned for each day.</p>
        </div>
        <label className="room-cleaning-date">
          <span>Status date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            disabled={savingRoomId !== null}
          />
        </label>
      </header>

      <section className="room-cleaning-summary" aria-label="Cleaning status summary">
        <div className="room-cleaning-summary-card">
          <span>Total rooms</span>
          <strong>{rooms.length}</strong>
        </div>
        <div className="room-cleaning-summary-card cleaned">
          <span>Cleaned</span>
          <strong>{totals.cleaned}</strong>
        </div>
        <div className="room-cleaning-summary-card pending">
          <span>Needs cleaning</span>
          <strong>{totals.pending}</strong>
        </div>
        <button
          className="room-cleaning-refresh"
          type="button"
          onClick={() => void loadStatuses()}
          disabled={loading || savingRoomId !== null}
        >
          Refresh
        </button>
      </section>

      {error && <div className="room-cleaning-message error" role="alert">{error}</div>}
      {successMessage && <div className="room-cleaning-message success" role="status">{successMessage}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : rooms.length === 0 ? (
        <div className="room-cleaning-empty">No rooms found.</div>
      ) : (
        <section className="room-cleaning-grid" aria-label="Rooms and cleaning status">
          {rooms.map(room => (
            <article className={`room-cleaning-card ${room.status}`} key={room.roomId}>
              <div className="room-cleaning-card-details">
                <span className="room-cleaning-label">Room</span>
                <h2>{room.roomNumber}</h2>
                <span className={`room-cleaning-badge ${room.status}`}>
                  {room.status === 'cleaned' ? 'Cleaned' : 'Needs cleaning'}
                </span>
                <small>Last cleaned: {formatLastCleanedDate(room.lastCleanedDate)}</small>
                <small>{formatUpdatedAt(room.updatedAt)}</small>
              </div>
              <button
                type="button"
                className={`room-cleaning-action ${room.status === 'cleaned' ? 'mark-pending' : 'mark-cleaned'}`}
                onClick={() => void updateStatus(room)}
                disabled={savingRoomId !== null}
              >
                {savingRoomId === room.roomId
                  ? 'Saving...'
                  : room.status === 'cleaned'
                    ? 'Mark needs cleaning'
                    : 'Mark cleaned'}
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
