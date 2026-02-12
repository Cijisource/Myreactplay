import { useEffect, useState } from 'react';
import { API_BASE_URL } from './constants';
import PhotoModal from './PhotoModal';

interface Photo {
  filename: string;
  size: number;
  sizeKB: string;
  uploadedAt: string;
}

type DateCategory = 'all' | 'today' | 'week' | 'month' | 'year' | 'older';

function ListPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [dateCategory, setDateCategory] = useState<DateCategory>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/uploads`)
      .then(response => response.json())
      .then(data => {
        setPhotos(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching photos:', error);
        setLoading(false);
      });
  }, [refreshKey]);

  const getCategoryDateRange = (): [Date, Date] => {
    const now = new Date();
    const start = new Date();

    switch (dateCategory) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return [start, now];
      case 'week':
        start.setDate(now.getDate() - 7);
        return [start, now];
      case 'month':
        start.setMonth(now.getMonth() - 1);
        return [start, now];
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        return [start, now];
      case 'older':
        return [new Date(0), new Date(new Date().setFullYear(new Date().getFullYear() - 1))];
      default:
        return [new Date(0), now];
    }
  };

  const getFilteredPhotos = (): Photo[] => {
    return photos.filter(photo => {
      const photoDate = new Date(photo.uploadedAt);

      if (dateCategory !== 'all') {
        const [start, end] = getCategoryDateRange();
        return photoDate >= start && photoDate <= end;
      }

      if (startDate || endDate) {
        if (startDate && photoDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (photoDate > endDateObj) return false;
        }
      }

      return true;
    });
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPhotos(photos.filter(p => p.filename !== filename));
        setSelectedPhoto(null);
        alert('✅ Photo deleted successfully');
      } else {
        alert('❌ Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('❌ Error deleting photo');
    }
  };

  const filteredPhotos = getFilteredPhotos();

  return (
    <div>
      <h2>📷 Uploaded Photos</h2>

      {/* Date Filters */}
      <div className="filter-section">
        <div className="filter-group">
          <label>📅 Filter by Category:</label>
          <div className="button-group">
            {(['all', 'today', 'week', 'month', 'year', 'older'] as const).map(cat => (
              <button
                key={cat}
                className={`filter-button ${dateCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  setDateCategory(cat);
                  setStartDate('');
                  setEndDate('');
                }}
              >
                {cat === 'all' && '📋 All'}
                {cat === 'today' && '📌 Today'}
                {cat === 'week' && '📊 Last 7 Days'}
                {cat === 'month' && '📈 Last Month'}
                {cat === 'year' && '📉 Last Year'}
                {cat === 'older' && '⏳ Older'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>🗓️ Custom Date Range:</label>
          <div className="date-inputs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateCategory('all');
              }}
              placeholder="Start date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateCategory('all');
              }}
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">⏳ Loading photos...</div>
      ) : filteredPhotos.length === 0 ? (
        <div className="empty-state">
          <p>📭 No photos found for the selected filter. <strong>Try adjusting your date range!</strong></p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-item">
              <span className="number">{filteredPhotos.length}</span>
              <span className="label">Filtered Photos</span>
            </div>
            <div className="stat-item">
              <span className="number">{(filteredPhotos.reduce((sum, p) => sum + parseFloat(p.sizeKB), 0) / 1024).toFixed(2)}</span>
              <span className="label">Total Size (MB)</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>📄 Filename</th>
                <th>📊 Size</th>
                <th>📅 Uploaded</th>
                <th>🗑️ Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPhotos.map(photo => (
                <tr key={photo.filename}>
                  <td onClick={() => setSelectedPhoto(photo)} style={{ cursor: 'pointer', color: '#2563eb' }}>
                    {photo.filename}
                  </td>
                  <td>{photo.sizeKB} KB</td>
                  <td>{new Date(photo.uploadedAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(photo.filename)}
                      title="Delete photo"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="content-grid">
            {filteredPhotos.map(photo => (
              <div key={photo.filename} className="media-card" onClick={() => setSelectedPhoto(photo)}>
                <img
                  src={`${API_BASE_URL}/uploads/${photo.filename}`}
                  alt={photo.filename}
                />
                <p>{photo.sizeKB} KB</p>
              </div>
            ))}
          </div>

          {selectedPhoto && (
            <PhotoModal
              imageUrl={`${API_BASE_URL}/uploads/${selectedPhoto.filename}`}
              filename={selectedPhoto.filename}
              onClose={() => setSelectedPhoto(null)}
              onDelete={() => {
                handleDelete(selectedPhoto.filename);
                setRefreshKey(refreshKey + 1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default ListPhotos;
