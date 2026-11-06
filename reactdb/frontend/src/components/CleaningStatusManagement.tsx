import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../api';
import LoadingSpinner from './LoadingSpinner';
import './CleaningStatusManagement.css';

type CleaningStatus = 'cleaned' | 'pending';
type CleaningView = 'daily-status' | 'cleaned-age' | 'status-graph' | 'frequency-graph';

interface CleaningFrequency {
  cleaned: number;
  pending: number;
  cleanedRooms: Array<{ roomId: number; roomNumber: string }>;
}

interface CleaningHistoryRecord {
  date: string;
}

interface RoomCleaningRecord {
  roomId: number;
  roomNumber: string;
  status: CleaningStatus;
  updatedAt: string | null;
  lastCleanedDate: string | null;
}

const getDateOnlyValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDateInputValue = (): string => {
  return getDateOnlyValue(new Date());
};

const getDaysSinceCleaned = (cleanedDate: string | null, asOfDate: string): number | null => {
  if (!cleanedDate) {
    return null;
  }
  const toUtcDay = (date: string): number => {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.max(0, Math.floor((toUtcDay(asOfDate) - toUtcDay(cleanedDate)) / 86400000));
};

export default function CleaningStatusManagement(): JSX.Element {
  const [selectedDate, setSelectedDate] = useState(getLocalDateInputValue);
  const [activeView, setActiveView] = useState<CleaningView>('daily-status');
  const [rooms, setRooms] = useState<RoomCleaningRecord[]>([]);
  const [cleaningFrequency, setCleaningFrequency] = useState<CleaningFrequency | null>(null);
  const [selectedHistoryRoom, setSelectedHistoryRoom] = useState<{ roomId: number; roomNumber: string } | null>(null);
  const [cleaningHistory, setCleaningHistory] = useState<CleaningHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [frequencyLoading, setFrequencyLoading] = useState(false);
  const [savingRoomId, setSavingRoomId] = useState<number | null>(null);
  const [showCleanedOnly, setShowCleanedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const loadRequestId = useRef(0);
  const frequencyRequestId = useRef(0);
  const historyRequestId = useRef(0);

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

  const loadCleaningFrequency = useCallback(async () => {
    const requestId = ++frequencyRequestId.current;
    setFrequencyLoading(true);
    setFrequencyError(null);
    try {
      const response = await apiService.getRoomCleaningFrequency();
      if (requestId === frequencyRequestId.current) {
        setCleaningFrequency(response.data);
      }
    } catch (err) {
      if (requestId === frequencyRequestId.current) {
        setFrequencyError(err instanceof Error ? err.message : 'Failed to load cleaning frequency');
      }
    } finally {
      if (requestId === frequencyRequestId.current) {
        setFrequencyLoading(false);
      }
    }
  }, []);

  const toggleRoomHistory = async (room: { roomId: number; roomNumber: string }) => {
    if (selectedHistoryRoom?.roomId === room.roomId) {
      historyRequestId.current += 1;
      setSelectedHistoryRoom(null);
      setCleaningHistory([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }

    const requestId = ++historyRequestId.current;
    setSelectedHistoryRoom(room);
    setCleaningHistory([]);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await apiService.getRoomCleaningHistory(room.roomId);
      if (requestId === historyRequestId.current) {
        setCleaningHistory(response.data);
      }
    } catch (err) {
      if (requestId === historyRequestId.current) {
        setHistoryError(err instanceof Error ? err.message : 'Failed to load room cleaning history');
      }
    } finally {
      if (requestId === historyRequestId.current) {
        setHistoryLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadStatuses();
    return () => {
      loadRequestId.current += 1;
    };
  }, [loadStatuses]);

  useEffect(() => {
    if (activeView !== 'frequency-graph') return;
    void loadCleaningFrequency();
    return () => {
      frequencyRequestId.current += 1;
    };
  }, [activeView, loadCleaningFrequency]);

  useEffect(() => {
    if (activeView === 'frequency-graph') return;
    historyRequestId.current += 1;
    setSelectedHistoryRoom(null);
    setCleaningHistory([]);
    setHistoryError(null);
    setHistoryLoading(false);
  }, [activeView]);

  const totals = useMemo(() => ({
    cleaned: rooms.filter(room => room.status === 'cleaned').length,
    pending: rooms.filter(room => room.status !== 'cleaned').length,
  }), [rooms]);

  const visibleRooms = useMemo(() => {
    const sortedRooms = [...rooms].sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
    );
    return showCleanedOnly
      ? sortedRooms.filter(room => room.status === 'cleaned')
      : sortedRooms;
  }, [rooms, showCleanedOnly]);

  const graphRooms = useMemo(() => {
    const asOfDate = getLocalDateInputValue();
    return [...rooms]
      .map(room => ({ ...room, daysSinceCleaned: getDaysSinceCleaned(room.lastCleanedDate, asOfDate) }))
      .sort((a, b) =>
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [rooms]);

  const cleanedAgeRooms = useMemo(() => {
    const asOfDate = getLocalDateInputValue();
    return [...rooms]
      .map(room => ({ ...room, daysSinceCleaned: getDaysSinceCleaned(room.lastCleanedDate, asOfDate) }))
      .sort((a, b) => {
        if (a.daysSinceCleaned === null) return b.daysSinceCleaned === null ? 0 : -1;
        if (b.daysSinceCleaned === null) return 1;
        return b.daysSinceCleaned - a.daysSinceCleaned ||
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [rooms]);

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
          ? {
              ...currentRoom,
              status: response.data.status,
              updatedAt: response.data.updatedAt,
              lastCleanedDate: response.data.lastCleanedDate,
            }
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

  const formatCleanedAge = (days: number | null): string => {
    if (days === null) return 'Never cleaned';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <div className="management-container room-cleaning-container">
      <header className="room-cleaning-header">
        <div>
          <h1>Room Cleaning Status</h1>
          <p>Track daily cleaning and review how long ago each room was cleaned.</p>
        </div>
      </header>

      <div className="room-cleaning-tabs" role="tablist" aria-label="Room cleaning views">
        <button
          type="button"
          className={`room-cleaning-tab ${activeView === 'daily-status' ? 'active' : ''}`}
          onClick={() => setActiveView('daily-status')}
          role="tab"
          aria-selected={activeView === 'daily-status'}
        >
          Daily status
        </button>
        <button
          type="button"
          className={`room-cleaning-tab ${activeView === 'cleaned-age' ? 'active' : ''}`}
          onClick={() => setActiveView('cleaned-age')}
          role="tab"
          aria-selected={activeView === 'cleaned-age'}
        >
          Cleaned age report
        </button>
        <button
          type="button"
          className={`room-cleaning-tab ${activeView === 'status-graph' ? 'active' : ''}`}
          onClick={() => setActiveView('status-graph')}
          role="tab"
          aria-selected={activeView === 'status-graph'}
        >
          Status graph
        </button>
        <button
          type="button"
          className={`room-cleaning-tab ${activeView === 'frequency-graph' ? 'active' : ''}`}
          onClick={() => setActiveView('frequency-graph')}
          role="tab"
          aria-selected={activeView === 'frequency-graph'}
        >
          Cleaning frequency
        </button>
      </div>

      {activeView === 'daily-status' ? (
        <>
          <div className="room-cleaning-toolbar">
            <label className="room-cleaning-date">
              <span>Status date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={event => setSelectedDate(event.target.value)}
                disabled={savingRoomId !== null}
              />
            </label>
            <section className="room-cleaning-summary" aria-label="Cleaning status summary">
              <div className="room-cleaning-summary-card">
                <span>Total rooms</span>
                <strong>{rooms.length}</strong>
              </div>
              <button
                className={`room-cleaning-summary-card cleaned room-cleaning-filter ${showCleanedOnly ? 'active' : ''}`}
                type="button"
                onClick={() => setShowCleanedOnly(current => !current)}
                aria-pressed={showCleanedOnly}
                aria-label={`${showCleanedOnly ? 'Show all rooms' : 'Filter to cleaned rooms'} (${totals.cleaned} cleaned)`}
              >
                <span>Cleaned</span>
                <strong>{totals.cleaned}</strong>
              </button>
              <div className="room-cleaning-summary-card pending">
                <span>Needs cleaning</span>
                <strong>{totals.pending}</strong>
              </div>
            </section>
            <button
              className="room-cleaning-refresh"
              type="button"
              onClick={() => void loadStatuses()}
              disabled={loading || savingRoomId !== null}
            >
              Refresh
            </button>
          </div>
        </>
      ) : (
        <div className="room-cleaning-report-toolbar">
          <p>
            {activeView === 'cleaned-age'
              ? 'Rooms are ordered from longest ago cleaned to most recently cleaned.'
              : activeView === 'status-graph'
                ? `Cleaning status for ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString()}.`
                : 'Recorded cleaning statuses over the last 30 days.'}
          </p>
          <button
            className="room-cleaning-refresh"
            type="button"
            onClick={() => void (activeView === 'frequency-graph' ? loadCleaningFrequency() : loadStatuses())}
            disabled={loading || frequencyLoading || savingRoomId !== null}
          >
            Refresh
          </button>
        </div>
      )}

      {error && <div className="room-cleaning-message error" role="alert">{error}</div>}
      {activeView === 'frequency-graph' && frequencyError && (
        <div className="room-cleaning-message error" role="alert">{frequencyError}</div>
      )}
      {successMessage && <div className="room-cleaning-message success" role="status">{successMessage}</div>}

      {loading || (activeView === 'frequency-graph' && frequencyLoading) ? (
        <LoadingSpinner />
      ) : rooms.length === 0 ? (
        <div className="room-cleaning-empty">No rooms found.</div>
      ) : activeView === 'cleaned-age' ? (
        <div className="room-cleaning-report-scroll">
          <table className="room-cleaning-report">
            <thead>
              <tr>
                <th scope="col">Room</th>
                <th scope="col">Last cleaned</th>
                <th scope="col">Cleaned age</th>
              </tr>
            </thead>
            <tbody>
              {cleanedAgeRooms.map(room => (
                <tr key={room.roomId}>
                  <th scope="row">{room.roomNumber}</th>
                  <td>{formatLastCleanedDate(room.lastCleanedDate)}</td>
                  <td className={room.daysSinceCleaned === null ? 'never-cleaned' : ''}>
                    {formatCleanedAge(room.daysSinceCleaned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeView === 'status-graph' ? (
        <section className="room-cleaning-status-chart" aria-label="Cleaning status graph for all rooms">
          <div className="room-cleaning-chart-summary" aria-label={`${totals.cleaned} cleaned, ${totals.pending} need cleaning`}>
            <span className="room-cleaning-chart-legend">
              <i className="cleaned" aria-hidden="true" />
              Cleaned <strong>{totals.cleaned}</strong>
            </span>
            <span className="room-cleaning-chart-legend">
              <i className="pending" aria-hidden="true" />
              Needs cleaning <strong>{totals.pending}</strong>
            </span>
          </div>
          <div className="room-cleaning-chart-rows">
            {graphRooms.map(room => (
              <div className="room-cleaning-chart-row" key={room.roomId}>
                <span className="room-cleaning-chart-room">Room {room.roomNumber}</span>
                <div
                  className={`room-cleaning-chart-track ${room.status}`}
                  role="img"
                  aria-label={`Room ${room.roomNumber}: ${room.status === 'cleaned' ? 'cleaned' : 'needs cleaning'}. Last cleaned ${formatCleanedAge(room.daysSinceCleaned)}.`}
                >
                  <span>{room.status === 'cleaned' ? 'Cleaned' : 'Needs cleaning'}</span>
                  <small>Last cleaned: {formatCleanedAge(room.daysSinceCleaned)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeView === 'frequency-graph' && cleaningFrequency ? (
        <section className="room-cleaning-frequency-chart" aria-label="Cleaning status frequency over the last 30 days">
          {(() => {
            const total = cleaningFrequency.cleaned + cleaningFrequency.pending;
            const cleanedPercent = total === 0 ? 0 : (cleaningFrequency.cleaned / total) * 100;
            const pendingPercent = total === 0 ? 0 : (cleaningFrequency.pending / total) * 100;
            return (
              <>
                <p className="room-cleaning-frequency-total">
                  {total} recorded status{total === 1 ? '' : 'es'} in the last 30 days
                </p>
                <div className="room-cleaning-frequency-bars">
                  <div className="room-cleaning-frequency-row">
                    <span>Cleaned</span>
                    <div className="room-cleaning-frequency-track">
                      <div className="cleaned" style={{ width: `${cleanedPercent}%` }} />
                    </div>
                    <strong>{cleaningFrequency.cleaned}</strong>
                  </div>
                  <div className="room-cleaning-frequency-row">
                    <span>Needs cleaning</span>
                    <div className="room-cleaning-frequency-track">
                      <div className="pending" style={{ width: `${pendingPercent}%` }} />
                    </div>
                    <strong>{cleaningFrequency.pending}</strong>
                  </div>
                </div>
                <div className="room-cleaning-frequency-rooms">
                  <h3>Rooms cleaned in the last 30 days</h3>
                  {cleaningFrequency.cleanedRooms.length > 0 ? (
                    <ul>
                      {cleaningFrequency.cleanedRooms.map(room => (
                        <li key={room.roomId}>
                          <button
                            type="button"
                            className="room-cleaning-frequency-room-button"
                            onClick={() => void toggleRoomHistory(room)}
                            aria-expanded={selectedHistoryRoom?.roomId === room.roomId}
                          >
                            {room.roomNumber}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No rooms were marked cleaned during this period.</p>
                  )}
                  {selectedHistoryRoom && (
                    <div className="room-cleaning-history" aria-live="polite">
                      <h4>Room {selectedHistoryRoom.roomNumber} cleaning history</h4>
                      {historyLoading ? (
                        <p>Loading cleaning dates...</p>
                      ) : historyError ? (
                        <p className="room-cleaning-history-error" role="alert">{historyError}</p>
                      ) : cleaningHistory.length > 0 ? (
                        <ul>
                          {cleaningHistory.map(record => (
                            <li key={record.date}>{new Date(`${record.date}T00:00:00`).toLocaleDateString()}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No cleaned dates found.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </section>
      ) : activeView === 'frequency-graph' ? null : visibleRooms.length === 0 ? (
        <div className="room-cleaning-empty">No rooms are marked cleaned for this date.</div>
      ) : (
        <section className="room-cleaning-grid" aria-label="Rooms and cleaning status">
          {visibleRooms.map(room => (
            <article className={`room-cleaning-card ${room.status}`} key={room.roomId}>
              <div className="room-cleaning-card-details">
                <span className="room-cleaning-label">Room</span>
                <h2>{room.roomNumber}</h2>
                {room.status === 'cleaned' ? (
                  <button
                    type="button"
                    className="room-cleaning-badge cleaned room-cleaning-badge-filter"
                    onClick={() => setShowCleanedOnly(true)}
                    aria-label="Show cleaned rooms only"
                  >
                    Cleaned
                  </button>
                ) : (
                  <span className="room-cleaning-badge pending">Needs cleaning</span>
                )}
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
