import { useEffect, useState } from 'react';
import { apiService } from '../api';
import './ManagementStyles.css';

interface ActiveSessionUser {
  userId: number;
  username: string;
  name: string;
  roles: string;
  loggedInAt: string;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
}

interface ActiveSessionResponse {
  count: number;
  isAdmin: boolean;
  users: ActiveSessionUser[];
}

interface UserHistoryRecord {
  id: number;
  userName: string;
  name: string;
  roles?: string;
  lastLogin?: string | null;
  nextLoginDuration?: number | null;
}

const formatDate = (value?: string | null): string => {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleString();
};

export default function ActiveSessionsManagement() {
  const [sessions, setSessions] = useState<ActiveSessionUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activeResponse, usersResponse] = await Promise.all([
        apiService.getActiveUsers(),
        apiService.getUsers()
      ]);

      const payload: ActiveSessionResponse = activeResponse.data;
      const activeUsers = (payload.users || []).map((user) => ({
        ...user,
        isActive: true,
        isExpired: false
      }));

      const historyUsers = (usersResponse.data || [])
        .filter((user: UserHistoryRecord) => Boolean(user.lastLogin))
        .map((user: UserHistoryRecord) => {
          const baseLoginTime = new Date(user.lastLogin || '').getTime();
          const durationDays = Number(user.nextLoginDuration || 0);
          const derivedExpiry = Number.isFinite(baseLoginTime) && Number.isFinite(durationDays) && durationDays > 0
            ? new Date(baseLoginTime + (durationDays * 24 * 60 * 60 * 1000)).toISOString()
            : null;

          const expiresAt = derivedExpiry || new Date().toISOString();
          const isExpired = Boolean(derivedExpiry) && new Date(expiresAt).getTime() <= Date.now();

          return {
            userId: Number(user.id),
            username: user.userName || user.name || 'Unknown user',
            name: user.name || user.userName || 'Unknown user',
            roles: user.roles || 'user',
            loggedInAt: user.lastLogin || new Date().toISOString(),
            expiresAt,
            isActive: false,
            isExpired
          } satisfies ActiveSessionUser;
        });

      const merged = new Map<number, ActiveSessionUser>();
      activeUsers.forEach((session) => merged.set(session.userId, session));
      historyUsers.forEach((session: ActiveSessionUser) => {
        if (!merged.has(session.userId)) {
          merged.set(session.userId, session);
        }
      });

      const sortedSessions = Array.from(merged.values()).sort((a, b) => {
        const aTime = new Date(a.loggedInAt).getTime();
        const bTime = new Date(b.loggedInAt).getTime();
        return bTime - aTime;
      });

      setSessions(sortedSessions);
      setCount(sortedSessions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = window.setInterval(fetchSessions, 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="management-container">
      <h2 className="section-heading">Active Sessions</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="management-section">
        <div className="toolbar">
          <div className="toolbar-group">
            <strong>{count}</strong> active or recent session{count === 1 ? '' : 's'}
          </div>
          <button className="btn btn-secondary" onClick={fetchSessions} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {!loading && sessions.length === 0 ? (
          <div className="empty-state">No active or recent sessions to show.</div>
        ) : (
          <div className="table-container">
            <table className="management-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Logged In</th>
                  <th>Session Expires</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const statusClass = session.isActive
                    ? 'status-badge status-active'
                    : session.isExpired
                      ? 'status-badge status-expired'
                      : 'status-badge status-history';

                  const statusText = session.isActive ? 'Active' : session.isExpired ? 'Logged Out' : 'History';
                  const rowClass = session.isActive
                    ? 'session-row session-row-active'
                    : session.isExpired
                      ? 'session-row session-row-expired'
                      : 'session-row';

                  return (
                    <tr key={session.userId} className={rowClass}>
                      <td>{session.name || session.username}</td>
                      <td>{session.username}</td>
                      <td>{session.roles || 'user'}</td>
                      <td>
                        <span className={statusClass}>{statusText}</span>
                      </td>
                      <td>{formatDate(session.loggedInAt)}</td>
                      <td>{formatDate(session.expiresAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
