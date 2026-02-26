import { useState, useEffect } from 'react';
import { apiService } from '../api';
import './ManagementStyles.css';

interface DailyStatus {
  id: number;
  date: string;
  roomStatus?: string;
  waterLevelStatus?: string;
  createdDate?: string;
}

export default function DailyStatusManagement() {
  const [statuses, setStatuses] = useState<DailyStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<DailyStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc'>('date-desc');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    roomStatus: '',
    waterLevelStatus: ''
  });

  // Fetch statuses
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDailyStatuses();
      setStatuses(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch daily statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (editingStatus) {
        await apiService.updateDailyStatus(editingStatus.id, formData);
        setSuccessMessage('Daily status updated successfully!');
      } else {
        await apiService.createDailyStatus(formData);
        setSuccessMessage('Daily status created successfully!');
      }

      setShowForm(false);
      setEditingStatus(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        roomStatus: '',
        waterLevelStatus: ''
      });
      fetchStatuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save daily status');
    } finally {
      setLoading(false);
    }
  };

  // Delete status
  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await apiService.deleteDailyStatus(id);
      setSuccessMessage('Daily status deleted successfully!');
      setShowDeleteConfirm(null);
      fetchStatuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete daily status');
    } finally {
      setLoading(false);
    }
  };

  // Edit status
  const handleEdit = (status: DailyStatus) => {
    setEditingStatus(status);
    setFormData({
      date: status.date.split('T')[0],
      roomStatus: status.roomStatus || '',
      waterLevelStatus: status.waterLevelStatus || ''
    });
    setShowForm(true);
  };

  const filteredStatuses = statuses.filter(s => {
    // Search filter
    const searchMatch = !searchQuery || 
      s.roomStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.waterLevelStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(s.date).toLocaleDateString().includes(searchQuery);
    
    // Date range filter
    const statusDate = new Date(s.date).toISOString().split('T')[0];
    const dateMatch = (!filterFromDate || statusDate >= filterFromDate) &&
                      (!filterToDate || statusDate <= filterToDate);
    
    return searchMatch && dateMatch;
  }).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortBy === 'date-desc' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="management-container">
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search statuses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="date-filter-group">
          <input
            type="date"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
            className="date-input"
            title="Filter from date"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={filterToDate}
            onChange={(e) => setFilterToDate(e.target.value)}
            className="date-input"
            title="Filter to date"
          />
          {(filterFromDate || filterToDate) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setFilterFromDate('');
                setFilterToDate('');
              }}
              title="Clear date filter"
            >
              Clear Dates
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="sort-select"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingStatus(null);
            setFormData({
              date: new Date().toISOString().split('T')[0],
              roomStatus: '',
              waterLevelStatus: ''
            });
            setShowForm(true);
          }}
        >
          + Add Status
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>{editingStatus ? 'Edit Daily Status' : 'Add New Daily Status'}</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <textarea
              placeholder="Room Status"
              value={formData.roomStatus}
              onChange={(e) => setFormData({ ...formData, roomStatus: e.target.value })}
              rows={3}
            />
            <textarea
              placeholder="Water Level Status"
              value={formData.waterLevelStatus}
              onChange={(e) => setFormData({ ...formData, waterLevelStatus: e.target.value })}
              rows={3}
            />
            <div className="form-buttons">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Saving...' : 'Save Status'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"></div>
      ) : filteredStatuses.length === 0 ? (
        <div className="no-results-message">
          <p>No daily statuses found for the selected filters.</p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredStatuses.map((status) => (
            <div key={status.id} className="item-card">
              <div className="item-header">
                <h4>{new Date(status.date).toLocaleDateString()}</h4>
                <div className="item-actions">
                  <button className="btn btn-sm btn-info" onClick={() => handleEdit(status)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setShowDeleteConfirm(status.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {status.roomStatus && (
                <p><strong>Room Status:</strong> {status.roomStatus}</p>
              )}
              {status.waterLevelStatus && (
                <p><strong>Water Level:</strong> {status.waterLevelStatus}</p>
              )}
              {status.createdDate && (
                <p><strong>Created:</strong> {new Date(status.createdDate).toLocaleDateString()}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this daily status?</p>
            <div className="modal-buttons">
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
