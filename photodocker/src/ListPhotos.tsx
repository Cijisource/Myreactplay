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
      <h1>Uploaded Photos</h1>
      {loading ? (
        <p>Loading...</p>
      ) : photos.length === 0 ? (
        <p>No photos uploaded yet.</p>
      ) : (
        <>
          <p>Total photos: {photos.length}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Filename</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Size</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {photos.map(photo => (
                <tr key={photo.filename} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{photo.filename}</td>
                  <td style={{ padding: '10px' }}>{photo.sizeKB} KB</td>
                  <td style={{ padding: '10px' }}>{new Date(photo.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
            {photos.map(photo => (
              <div key={photo.filename} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
                <img
                  src={`${API_BASE_URL}/uploads/${photo.filename}`}
                  alt={photo.filename}
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {photo.sizeKB} KB
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ListPhotos;
