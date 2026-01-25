import { useEffect, useState } from 'react';
import { API_BASE_URL } from './constants';

interface Photo {
  filename: string;
  size: number;
  sizeKB: string;
  uploadedAt: string;
}

function ListPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <div>
      <h2>📷 Uploaded Photos</h2>
      {loading ? (
        <div className="loading">⏳ Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="empty-state">
          <p>📭 No photos uploaded yet. <strong>Start by uploading your first photo!</strong></p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-item">
              <span className="number">{photos.length}</span>
              <span className="label">Total Photos</span>
            </div>
            <div className="stat-item">
              <span className="number">{(photos.reduce((sum, p) => sum + parseFloat(p.sizeKB), 0) / 1024).toFixed(2)}</span>
              <span className="label">Total Size (MB)</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>📄 Filename</th>
                <th>📊 Size</th>
                <th>📅 Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {photos.map(photo => (
                <tr key={photo.filename}>
                  <td>{photo.filename}</td>
                  <td>{photo.sizeKB} KB</td>
                  <td>{new Date(photo.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="content-grid">
            {photos.map(photo => (
              <div key={photo.filename} className="media-card">
                <img
                  src={`${API_BASE_URL}/uploads/${photo.filename}`}
                  alt={photo.filename}
                />
                <p>{photo.sizeKB} KB</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ListPhotos;
