import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import './ComplaintsManagement.css';

interface Room {
  id: number;
  number: string;
  rent: number;
}

interface ComplaintType {
  id: number;
  type: string;
}

interface ComplaintStatus {
  id: number;
  status: string;
}

interface Complaint {
  id: number;
  description: string;
  complaintTypeId: number;
  complaintTypeName: string;
  complaintStatusId: number;
  complaintStatusName: string;
  closedDate: string | null;
  closureComments: string | null;
  createdDate: string;
  updatedDate: string | null;
  roomId: number;
  roomNumber: string;
  charges: number | null;
  chargesDetails: string | null;
  proof1Url: string | null;
  proof2Url: string | null;
  videoUrl: string | null;
}

interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: number; name: string }>;
  placeholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    return options.filter(opt =>
      opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(opt => opt.id.toString() === value);

  const handleSelect = (optionId: number) => {
    onChange(optionId.toString());
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="searchable-dropdown-container">
      <label>{label}</label>
      <div className="dropdown-wrapper">
        <button
          className="dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOption ? selectedOption.name : placeholder}
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="dropdown-content">
            <input
              type="text"
              className="dropdown-search"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <div className="dropdown-options">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`dropdown-option ${
                      selectedOption?.id === option.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelect(option.id)}
                  >
                    {option.name}
                  </button>
                ))
              ) : (
                <div className="no-options">No results found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ComplaintsManagement: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [types, setTypes] = useState<ComplaintType[]>([]);
  const [statuses, setStatuses] = useState<ComplaintStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal and form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingComplaintId, setEditingComplaintId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    complaintTypeId: '',
    complaintStatusId: '',
    roomId: '',
    charges: '',
    chargesDetails: '',
    proof1Url: '',
    proof2Url: '',
    videoUrl: '',
    closedDate: '',
    closureComments: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');
  const [filterStatusId, setFilterStatusId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [complaintsRes, roomsRes, typesRes, statusesRes] = await Promise.all([
        apiService.getComplaints(),
        apiService.getRooms(),
        apiService.getComplaintTypes(),
        apiService.getComplaintStatuses()
      ]);

      setComplaints(complaintsRes.data || []);
      setRooms((roomsRes.data || []).map((r: any) => ({
        id: r.id,
        number: r.number,
        rent: r.rent
      })));
      setTypes((typesRes.data || []).map((t: any) => ({
        id: t.id,
        type: t.type
      })));
      setStatuses((statusesRes.data || []).map((s: any) => ({
        id: s.id,
        status: s.status
      })));
      setError(null);
    } catch (err) {
      setError('Failed to load complaints data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      complaintTypeId: '',
      complaintStatusId: '',
      roomId: '',
      charges: '',
      chargesDetails: '',
      proof1Url: '',
      proof2Url: '',
      videoUrl: '',
      closedDate: '',
      closureComments: ''
    });
    setEditingComplaintId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (complaint: Complaint) => {
    setFormData({
      description: complaint.description,
      complaintTypeId: complaint.complaintTypeId.toString(),
      complaintStatusId: complaint.complaintStatusId.toString(),
      roomId: complaint.roomId.toString(),
      charges: complaint.charges?.toString() || '',
      chargesDetails: complaint.chargesDetails || '',
      proof1Url: complaint.proof1Url || '',
      proof2Url: complaint.proof2Url || '',
      videoUrl: complaint.videoUrl || '',
      closedDate: complaint.closedDate || '',
      closureComments: complaint.closureComments || ''
    });
    setEditingComplaintId(complaint.id);
    setShowFormModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        description: formData.description,
        complaintTypeId: parseInt(formData.complaintTypeId),
        complaintStatusId: parseInt(formData.complaintStatusId),
        roomId: parseInt(formData.roomId),
        charges: formData.charges ? parseFloat(formData.charges) : 0,
        chargesDetails: formData.chargesDetails || null,
        proof1Url: formData.proof1Url || null,
        proof2Url: formData.proof2Url || null,
        videoUrl: formData.videoUrl || null,
        closedDate: formData.closedDate || null,
        closureComments: formData.closureComments || null
      };

      if (editingComplaintId) {
        await apiService.updateComplaint(editingComplaintId, submitData);
        setSuccessMessage('Complaint updated successfully');
      } else {
        await apiService.createComplaint(submitData);
        setSuccessMessage('Complaint created successfully');
      }

      setShowFormModal(false);
      resetForm();
      await fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(editingComplaintId ? 'Failed to update complaint' : 'Failed to create complaint');
      console.error(err);
    }
  };

  const handleDelete = async (complaintId: number) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        await apiService.deleteComplaint(complaintId);
        setSuccessMessage('Complaint deleted successfully');
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError('Failed to delete complaint');
        console.error(err);
      }
    }
  };

  const roomOptions = useMemo(
    () => rooms.map(r => ({ id: r.id, name: `Room ${r.number}` })),
    [rooms]
  );

  const typeOptions = useMemo(
    () => types.map(t => ({ id: t.id, name: t.type })),
    [types]
  );

  const statusOptions = useMemo(
    () => statuses.map(s => ({ id: s.id, name: s.status })),
    [statuses]
  );

  const filteredComplaints = useMemo(() => {
    return complaints.filter(complaint => {
      const matchesSearch = 
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.complaintTypeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRoom = !filterRoomId || complaint.roomId.toString() === filterRoomId;
      const matchesType = !filterTypeId || complaint.complaintTypeId.toString() === filterTypeId;
      const matchesStatus = !filterStatusId || complaint.complaintStatusId.toString() === filterStatusId;

      const complaintDate = new Date(complaint.createdDate);
      const matchesFromDate = !filterFromDate || complaintDate >= new Date(filterFromDate);
      const matchesToDate = !filterToDate || complaintDate <= new Date(filterToDate);

      return matchesSearch && matchesRoom && matchesType && matchesStatus && 
             matchesFromDate && matchesToDate;
    });
  }, [complaints, searchTerm, filterRoomId, filterTypeId, filterStatusId, filterFromDate, filterToDate]);

  const stats = useMemo(() => ({
    total: complaints.length,
    open: complaints.filter(c => c.complaintStatusName === 'Open').length,
    closed: complaints.filter(c => c.complaintStatusName === 'Closed').length,
    inProgress: complaints.filter(c => c.complaintStatusName === 'In Progress').length,
    totalCharges: complaints.reduce((sum, c) => sum + (c.charges || 0), 0)
  }), [complaints]);

  const formatCurrency = (amount: number | null): string => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRoomId('');
    setFilterTypeId('');
    setFilterStatusId('');
    setFilterFromDate('');
    setFilterToDate('');
  };

  if (loading) {
    return <div className="complaints-container"><div className="loading">Loading complaints...</div></div>;
  }

  if (error) {
    return <div className="complaints-container"><div className="error">{error}</div></div>;
  }

  return (
    <div className="complaints-container">
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <div className="complaints-header">
        <h2>Complaints Management</h2>
        <button className="btn-primary" onClick={openCreateModal}>
          ➕ Create New Complaint
        </button>
      </div>
      <div className="complaints-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Complaints</div>
        </div>
        <div className="stat-card open">
          <div className="stat-value">{stats.open}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card in-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card closed">
          <div className="stat-value">{stats.closed}</div>
          <div className="stat-label">Closed</div>
        </div>
        <div className="stat-card charges">
          <div className="stat-value">{formatCurrency(stats.totalCharges)}</div>
          <div className="stat-label">Total Charges</div>
        </div>
      </div>

      <div className="complaints-filters">
        <div className="filter-header">
          <h3>Filters & Search</h3>
          <button className="clear-btn" onClick={clearFilters}>Clear All</button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by description, room, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-grid">
          <SearchableDropdown
            label="Room"
            value={filterRoomId}
            onChange={setFilterRoomId}
            options={roomOptions}
            placeholder="All Rooms"
          />

          <SearchableDropdown
            label="Complaint Type"
            value={filterTypeId}
            onChange={setFilterTypeId}
            options={typeOptions}
            placeholder="All Types"
          />

          <SearchableDropdown
            label="Status"
            value={filterStatusId}
            onChange={setFilterStatusId}
            options={statusOptions}
            placeholder="All Statuses"
          />

          <div className="date-filter">
            <label>From Date</label>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
            />
          </div>

          <div className="date-filter">
            <label>To Date</label>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="results-count">
          Showing {filteredComplaints.length} of {complaints.length} complaints
        </div>
      </div>

      <div className="complaints-table-wrapper">
        <table className="complaints-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Room</th>
              <th>Description</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Closed Date</th>
              <th>Charges</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td>{complaint.id}</td>
                  <td className="room-cell">Room {complaint.roomNumber}</td>
                  <td className="description-cell" title={complaint.description}>
                    {complaint.description.substring(0, 50)}...
                  </td>
                  <td>{complaint.complaintTypeName}</td>
                  <td>
                    <span className={`status-badge ${complaint.complaintStatusName.toLowerCase()}`}>
                      {complaint.complaintStatusName}
                    </span>
                  </td>
                  <td>{formatDate(complaint.createdDate)}</td>
                  <td>{complaint.closedDate ? formatDate(complaint.closedDate) : '-'}</td>
                  <td className="charges-cell">{formatCurrency(complaint.charges)}</td>
                  <td className="details-cell">
                    <div className="proof-icons">
                      {complaint.proof1Url && <span title="Proof 1">📷</span>}
                      {complaint.proof2Url && <span title="Proof 2">📷</span>}
                      {complaint.videoUrl && <span title="Video">🎥</span>}
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => openEditModal(complaint)}
                      title="Edit complaint"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(complaint.id)}
                      title="Delete complaint"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="no-data">
                  No complaints found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="badge open-badge">Open</span>
            <span>Complaint opened and awaiting action</span>
          </div>
          <div className="legend-item">
            <span className="badge in-progress-badge">In Progress</span>
            <span>Complaint is being worked on</span>
          </div>
          <div className="legend-item">
            <span className="badge closed-badge">Closed</span>
            <span>Complaint resolved and closed</span>
          </div>
        </div>
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingComplaintId ? 'Edit Complaint' : 'Create New Complaint'}</h3>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="complaint-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="roomId">Room *</label>
                  <select
                    id="roomId"
                    name="roomId"
                    value={formData.roomId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select a room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="complaintTypeId">Complaint Type *</label>
                  <select
                    id="complaintTypeId"
                    name="complaintTypeId"
                    value={formData.complaintTypeId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="complaintStatusId">Status *</label>
                  <select
                    id="complaintStatusId"
                    name="complaintStatusId"
                    value={formData.complaintStatusId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select status</option>
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Enter detailed complaint description"
                  rows={4}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="charges">Charges ($)</label>
                  <input
                    type="number"
                    id="charges"
                    name="charges"
                    value={formData.charges}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="closedDate">Closed Date</label>
                  <input
                    type="date"
                    id="closedDate"
                    name="closedDate"
                    value={formData.closedDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="chargesDetails">Charges Details</label>
                <textarea
                  id="chargesDetails"
                  name="chargesDetails"
                  value={formData.chargesDetails}
                  onChange={handleFormChange}
                  placeholder="Enter details about charges"
                  rows={2}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="closureComments">Closure Comments</label>
                <textarea
                  id="closureComments"
                  name="closureComments"
                  value={formData.closureComments}
                  onChange={handleFormChange}
                  placeholder="Enter closure comments if complaint is closed"
                  rows={2}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="proof1Url">Proof 1 URL</label>
                  <input
                    type="url"
                    id="proof1Url"
                    name="proof1Url"
                    value={formData.proof1Url}
                    onChange={handleFormChange}
                    placeholder="https://example.com/proof1.jpg"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="proof2Url">Proof 2 URL</label>
                  <input
                    type="url"
                    id="proof2Url"
                    name="proof2Url"
                    value={formData.proof2Url}
                    onChange={handleFormChange}
                    placeholder="https://example.com/proof2.jpg"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="videoUrl">Video URL</label>
                  <input
                    type="url"
                    id="videoUrl"
                    name="videoUrl"
                    value={formData.videoUrl}
                    onChange={handleFormChange}
                    placeholder="https://example.com/video.mp4"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  {editingComplaintId ? 'Update Complaint' : 'Create Complaint'}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowFormModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsManagement;
