import { useEffect, useState } from 'react';
import { API_BASE_URL } from './constants';
import VideoModal from './VideoModal';

interface Video {
  filename: string;
  size: number;
  sizeMB: string;
  uploadedAt: string;
}

type DateCategory = 'all' | 'today' | 'week' | 'month' | 'year' | 'older';

function ListVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [dateCategory, setDateCategory] = useState<DateCategory>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/videos`)
      .then(response => response.json())
      .then(data => {
        setVideos(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching videos:', error);
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

  const getFilteredVideos = (): Video[] => {
    return videos.filter(video => {
      const videoDate = new Date(video.uploadedAt);

      if (dateCategory !== 'all') {
        const [start, end] = getCategoryDateRange();
        return videoDate >= start && videoDate <= end;
      }

      if (startDate || endDate) {
        if (startDate && videoDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (videoDate > endDateObj) return false;
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
        setVideos(videos.filter(v => v.filename !== filename));
        setSelectedVideo(null);
        alert('✅ Video deleted successfully');
      } else {
        alert('❌ Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('❌ Error deleting video');
    }
  };

  const filteredVideos = getFilteredVideos();

  return (
    <div>
      <h2>🎬 Uploaded Videos</h2>

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
        <div className="loading">⏳ Loading videos...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="empty-state">
          <p>📭 No videos found for the selected filter. <strong>Try adjusting your date range!</strong></p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-item">
              <span className="number">{filteredVideos.length}</span>
              <span className="label">Filtered Videos</span>
            </div>
            <div className="stat-item">
              <span className="number">{filteredVideos.reduce((sum, v) => sum + parseFloat(v.sizeMB), 0).toFixed(2)}</span>
              <span className="label">Total Size (MB)</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>📹 Filename</th>
                <th>📊 Size</th>
                <th>📅 Uploaded</th>
                <th>🗑️ Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map(video => (
                <tr key={video.filename}>
                  <td onClick={() => setSelectedVideo(video)} style={{ cursor: 'pointer', color: '#10b981' }}>
                    {video.filename}
                  </td>
                  <td>{video.sizeMB} MB</td>
                  <td>{new Date(video.uploadedAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(video.filename)}
                      title="Delete video"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="content-grid">
            {filteredVideos.map(video => (
              <div key={video.filename} className="media-card" onClick={() => setSelectedVideo(video)}>
                <video
                  src={`${API_BASE_URL}/uploads/${video.filename}`}
                  preload="metadata"
                />
                <p>{video.sizeMB} MB</p>
              </div>
            ))}
          </div>

          {selectedVideo && (
            <VideoModal
              videoUrl={`${API_BASE_URL}/uploads/${selectedVideo.filename}`}
              filename={selectedVideo.filename}
              onClose={() => setSelectedVideo(null)}
              onDelete={() => {
                handleDelete(selectedVideo.filename);
                setRefreshKey(refreshKey + 1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default ListVideos;
