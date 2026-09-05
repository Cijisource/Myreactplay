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
}

interface ActiveSessionResponse {
  count: number;
  isAdmin: boolean;
  users: ActiveSessionUser[];
}

export default function ActiveSessionsManagement() {
  const [sessions, setSessions] = useState<ActiveSessionUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getActiveUsers();
      const payload: ActiveSessionResponse = response.data;

      setSessions(payload.users || []);
      setCount(payload.count || 0);
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
            <strong>{count}</strong> currently active session{count === 1 ? '' : 's'}
          </div>
          <button className="btn btn-secondary" onClick={fetchSessions} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {!loading && sessions.length === 0 ? (
          <div className="empty-state">No active sessions at the moment.</div>
        ) : (
          <div className="table-container">
            <table className="management-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Roles</th>
                  <th>Logged In</th>
                  <th>Session Expires</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.userId}>
                    <td>{session.name || session.username}</td>
                    <td>{session.username}</td>
                    <td>{session.roles || 'user'}</td>
                    <td>{new Date(session.loggedInAt).toLocaleString()}</td>
                    <td>{new Date(session.expiresAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
