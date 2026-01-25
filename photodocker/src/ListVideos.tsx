import { useEffect, useState } from 'react';
import { API_BASE_URL } from './constants';

interface Video {
  filename: string;
  size: number;
  sizeMB: string;
  uploadedAt: string;
}

function ListVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

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
      <h1>Uploaded Videos</h1>
      {loading ? (
        <p>Loading...</p>
      ) : videos.length === 0 ? (
        <p>No videos uploaded yet.</p>
      ) : (
        <>
          <p>Total videos: {videos.length}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Filename</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Size</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {videos.map(video => (
                <tr key={video.filename} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{video.filename}</td>
                  <td style={{ padding: '10px' }}>{video.sizeMB} MB</td>
                  <td style={{ padding: '10px' }}>{new Date(video.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {videos.map(video => (
              <div key={video.filename} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
                <video
                  src={`${API_BASE_URL}/uploads/${video.filename}`}
                  controls
                  style={{ width: '100%', height: '180px', borderRadius: '4px', backgroundColor: '#000' }}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {video.sizeMB} MB
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ListVideos;
