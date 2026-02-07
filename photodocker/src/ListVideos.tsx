import { useEffect, useState } from 'react';
import { API_BASE_URL } from './constants';
import VideoModal from './VideoModal';

interface Video {
  filename: string;
  size: number;
  sizeMB: string;
  uploadedAt: string;
}

function ListVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

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
  }, []);

  return (
    <div>
      <h2>🎬 Uploaded Videos</h2>
      {loading ? (
        <div className="loading">⏳ Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <p>📭 No videos uploaded yet. <strong>Start by uploading your first video!</strong></p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-item">
              <span className="number">{videos.length}</span>
              <span className="label">Total Videos</span>
            </div>
            <div className="stat-item">
              <span className="number">{videos.reduce((sum, v) => sum + parseFloat(v.sizeMB), 0).toFixed(2)}</span>
              <span className="label">Total Size (MB)</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>📹 Filename</th>
                <th>📊 Size</th>
                <th>📅 Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {videos.map(video => (
                <tr key={video.filename} onClick={() => setSelectedVideo(video)} style={{ cursor: 'pointer' }}>
                  <td>{video.filename}</td>
                  <td>{video.sizeMB} MB</td>
                  <td>{new Date(video.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="content-grid">
            {videos.map(video => (
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
            />
          )}
        </>
      )}
    </div>
  );
}

export default ListVideos;
