import { useState, useEffect } from 'react';
import { apiService, getFileUrl } from '../api';
import { useAuth } from './AuthContext';
import './ManagementStyles.css';

interface DailyStatus {
  id: number;
  date: string;
  roomStatus?: string;
  waterLevelStatus?: string;
  createdDate?: string;
}

interface MediaFile {
  id: number;
  dailyStatusId: number;
  mediaType: string;
  sequenceNumber: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedDate?: string;
}

export default function DailyStatusManagement() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [statuses, setStatuses] = useState<DailyStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatusId, setErrorStatusId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successStatusId, setSuccessStatusId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<DailyStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc'>('date-desc');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  
  // Media upload states
  const [showMediaUpload, setShowMediaUpload] = useState<number | null>(null);
  const [mediaFiles, setMediaFiles] = useState<Record<number, MediaFile[]>>({});
  const [selectedMediaType, setSelectedMediaType] = useState<'photo' | 'video'>('photo');
  const [uploadingMedia, setUploadingMedia] = useState<Record<number, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [deletingMedia, setDeletingMedia] = useState<Record<number, boolean>>({});
  
  // Fullscreen view states
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaFile | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    roomStatus: '',
    waterLevelStatus: ''
  });

  // Auto-dismiss success message after 10 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setSuccessStatusId(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-dismiss error message after 5 seconds
  // useEffect(() => {
  //   if (error) {
  //     const timer = setTimeout(() => {
  //       setError(null);
  //       setErrorStatusId(null);
  //     }, 5000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [error]);

  // Fetch statuses
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDailyStatuses();
      setStatuses(response.data);
      console.log('Fetched daily statuses:', response.data);
      // Fetch media for each status
      // for (const status of response.data) {
      //   await fetchMediaForStatus(status.id);
      // }
      await fetchMediaForAll(); // Fetch all media and organize by statusId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch daily statuses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch media for a specific status
  const fetchMediaForStatus = async (statusId: number) => {
    try {
      const response = await apiService.getDailyStatusMedia(statusId);
      setMediaFiles(prev => ({
        ...prev,
        [statusId]: response.data
      }));
    } catch (err) {
      console.error(`Failed to fetch media for status ${statusId}:`, err);
    }
  };

  // Fetch All media and organize by statusId
  const fetchMediaForAll = async () => {
    try {
      const response = await apiService.getDailyStatusAllMedia();
      console.log('Fetched all media files:', response.data);
      const mediaByStatus: Record<number, MediaFile[]> = {};
      response.data.forEach((media: MediaFile) => {
        if (!mediaByStatus[media.dailyStatusId]) {
          mediaByStatus[media.dailyStatusId] = [];
        }
        mediaByStatus[media.dailyStatusId].push(media);
      });
      setMediaFiles(mediaByStatus);
    } catch (err) {
      console.error(`Failed to fetch media for all statuses:`, err);
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
      setErrorStatusId(null);

      if (editingStatus) {
        await apiService.updateDailyStatus(editingStatus.id, formData);
        setSuccessMessage('Daily status updated successfully!');
        setSuccessStatusId(editingStatus.id);
      } else {
        const createResponse = await apiService.createDailyStatus(formData);
        // Fetch media for the newly created status
        if (createResponse.data.id) {
          await fetchMediaForStatus(createResponse.data.id);
          setSuccessStatusId(createResponse.data.id);
        }
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
      const errorMsg = err instanceof Error ? err.message : 'Failed to save daily status';
      setError(errorMsg);
      setErrorStatusId(editingStatus?.id || null);
    } finally {
      setLoading(false);
    }
  };

  // Handle media file upload
  const handleMediaUpload = async (statusId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const existingMedia = mediaFiles[statusId] || [];
    const existingCount = existingMedia.filter(m => m.mediaType === selectedMediaType).length;

    if (existingCount + files.length > 2) {
      setError(`Cannot upload more than 2 ${selectedMediaType}s per status. Current: ${existingCount}`);
      setErrorStatusId(statusId);
      return;
    }

    try {
      setUploadingMedia(prev => ({ ...prev, [statusId]: true }));
      setUploadProgress(prev => ({ ...prev, [statusId]: 0 }));
      setError(null);
      setErrorStatusId(null);

      const formData = new FormData();
      formData.append('dailyStatusId', statusId.toString());
      formData.append('mediaType', selectedMediaType);

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      // Pass progress callback
      await apiService.uploadDailyStatusMedia(formData, (progress) => {
        setUploadProgress(prev => ({ ...prev, [statusId]: progress }));
      });
      
      setSuccessMessage(`${selectedMediaType}(s) uploaded successfully!`);
      setSuccessStatusId(statusId);
      
      // Refresh media for this status
      await fetchMediaForStatus(statusId);
      setShowMediaUpload(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload media';
      setError(errorMsg);
      setErrorStatusId(statusId);
    } finally {
      setUploadingMedia(prev => ({ ...prev, [statusId]: false }));
      setUploadProgress(prev => ({ ...prev, [statusId]: 0 }));
    }
  };

  // Handle media deletion
  const handleDeleteMedia = async (mediaId: number, statusId: number) => {
    try {
      setDeletingMedia(prev => ({ ...prev, [mediaId]: true }));
      setError(null);
      setErrorStatusId(null);

      await apiService.deleteDailyStatusMedia(mediaId);
      setSuccessMessage('Media deleted successfully!');
      setSuccessStatusId(statusId);
      
      // Refresh media for this status
      await fetchMediaForStatus(statusId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete media';
      setError(errorMsg);
      setErrorStatusId(statusId);
    } finally {
      setDeletingMedia(prev => ({ ...prev, [mediaId]: false }));
    }
  };

  // Open fullscreen view
  const handleOpenFullscreen = (media: MediaFile) => {
    setFullscreenMedia(media);
    setFullscreenOpen(true);
  };

  // Close fullscreen view
  const handleCloseFullscreen = () => {
    setFullscreenOpen(false);
    setFullscreenMedia(null);
  };

  // Handle keyboard close for fullscreen (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenOpen) {
        handleCloseFullscreen();
      }
    };
    if (fullscreenOpen) {
      // Prevent body scroll on mobile when fullscreen is open
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [fullscreenOpen]);

  // Delete status
  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await apiService.deleteDailyStatus(id);
      setSuccessMessage('Daily status deleted successfully!');
      setSuccessStatusId(id);
      setShowDeleteConfirm(null);
      fetchStatuses();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete daily status';
      setError(errorMsg);
      setErrorStatusId(id);
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

  const isImageFile = (mimeType: string | undefined) => {
    return mimeType?.startsWith('image/') ?? false;
  };

  return (
    <div className="management-container">
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
              {successMessage && successStatusId === status.id && (
                <div className="success-message">{successMessage}</div>
              )}
              {error && errorStatusId === status.id && (
                <div className="error-message">{error}</div>
              )}
              <div className="item-header">
                <h4>{new Date(status.date).toLocaleDateString()} - Id: {status.id}</h4>
                <div className="item-actions">
                  <button className="btn btn-sm btn-info" onClick={() => handleEdit(status)}>
                    Edit
                  </button>
                  {isAdmin && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setShowDeleteConfirm(status.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              {status.roomStatus && (
                <p><strong>Room Status:</strong> {status.roomStatus}</p>
              )}
              {status.waterLevelStatus && (
                <p><strong>Water Level:</strong> {status.waterLevelStatus}</p>
              )}
              {status.createdDate && (
                <p>
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: "UTC",   // keep UTC, don’t convert
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true       // enable AM/PM
                }).format(new Date(status.createdDate))}
              </p>
              )}

              {/* Media Section */}
              <div className="media-section">
                <h5>Media Files</h5>
                
                {/* Photos */}
                <div className="media-type-group">
                  <div className="media-type-header">📷 Photos ({(mediaFiles[status.id] || []).filter(m => m.mediaType === 'photo').length}/2)</div>
                  <div className="media-gallery">
                    {(mediaFiles[status.id] || [])
                      .filter(m => m.mediaType === 'photo')
                      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                      .map(media => (
                        <div key={media.id} className="media-item">
                          {isImageFile(media.mimeType) ? (
                            <img 
                              src={getFileUrl(media.filePath)} 
                              alt={media.fileName} 
                              className="media-thumbnail" 
                              onClick={() => handleOpenFullscreen(media)}
                              style={{ cursor: 'pointer' }}
                            />
                          ) : (
                            <div className="media-placeholder">{media.fileName}</div>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteMedia(media.id, status.id)}
                              disabled={deletingMedia[media.id]}
                            >
                              {deletingMedia[media.id] ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Videos */}
                <div className="media-type-group">
                  <div className="media-type-header">🎥 Videos ({(mediaFiles[status.id] || []).filter(m => m.mediaType === 'video').length}/2)</div>
                  <div className="media-gallery">
                    {(mediaFiles[status.id] || [])
                      .filter(m => m.mediaType === 'video')
                      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                      .map(media => (
                        <div key={media.id} className="media-item">
                          <video 
                            className="media-thumbnail" 
                            onClick={() => handleOpenFullscreen(media)}
                            style={{ cursor: 'pointer' }}
                          >
                            <source src={getFileUrl(media.filePath)} type={media.mimeType || 'video/mp4'} />
                          </video>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteMedia(media.id, status.id)}
                              disabled={deletingMedia[media.id]}
                            >
                              {deletingMedia[media.id] ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Upload Section */}
                {showMediaUpload === status.id ? (
                  <div className="media-upload-form">
                    <div className="form-group">
                      <label>Media Type:</label>
                      <select
                        value={selectedMediaType}
                        onChange={(e) => setSelectedMediaType(e.target.value as 'photo' | 'video')}
                      >
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Select Files (max 2 per type):</label>
                      <input
                        type="file"
                        multiple
                        accept={selectedMediaType === 'photo' ? 'image/*' : 'video/*'}
                        onChange={(e) => handleMediaUpload(status.id, e.target.files)}
                        disabled={uploadingMedia[status.id]}
                      />
                    </div>
                    {uploadingMedia[status.id] && (
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress[status.id] || 0}%` }}
                          ></div>
                        </div>
                        <p className="progress-text">{uploadProgress[status.id] || 0}% Uploaded</p>
                      </div>
                    )}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowMediaUpload(null)}
                      disabled={uploadingMedia[status.id]}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowMediaUpload(status.id)}
                  >
                    + Upload Media
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this daily status? This will also delete all associated media files.</p>
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

      {/* Fullscreen Media Modal */}
      {fullscreenOpen && fullscreenMedia && (
        <div className="fullscreen-overlay" onClick={handleCloseFullscreen}>
          <div className="fullscreen-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="fullscreen-close" 
              onClick={handleCloseFullscreen} 
              title="Close (or press ESC)"
              aria-label="Close fullscreen"
            >
              ✕
            </button>
            {fullscreenMedia.mediaType === 'photo' ? (
              <img 
                src={getFileUrl(fullscreenMedia.filePath)} 
                alt={fullscreenMedia.fileName}
                className="fullscreen-content"
                loading="lazy"
              />
            ) : (
              <video 
                className="fullscreen-content"
                controls
                autoPlay
                controlsList="nodownload"
              >
                <source src={getFileUrl(fullscreenMedia.filePath)} type={fullscreenMedia.mimeType || 'video/mp4'} />
                Your browser does not support the video tag.
              </video>
            )}
            <div className="fullscreen-info">
              <p>{fullscreenMedia.fileName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
