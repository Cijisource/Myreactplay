import { useState } from 'react'
import './App.css'
import { API_BASE_URL } from './constants'
import ListPhotos from './ListPhotos'

function App() {
  const [currentView, setCurrentView] = useState<'upload' | 'list'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedImage(`${API_BASE_URL}/uploads/${data.filename}`);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="App">
      <h1>Photo Upload App</h1>
      <nav style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setCurrentView('upload')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentView === 'upload' ? '#007bff' : '#f0f0f0',
            color: currentView === 'upload' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: currentView === 'upload' ? 'bold' : 'normal'
          }}
        >
          Upload Photo
        </button>
        <button 
          onClick={() => setCurrentView('list')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentView === 'list' ? '#007bff' : '#f0f0f0',
            color: currentView === 'list' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: currentView === 'list' ? 'bold' : 'normal'
          }}
        >
          View All Photos
        </button>
      </nav>

      {currentView === 'upload' ? (
        <div>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          {uploadedImage && (
            <div>
              <h2>Uploaded Image:</h2>
              <img src={uploadedImage} alt="Uploaded" style={{ maxWidth: '300px' }} />
            </div>
          )}
        </div>
      ) : (
        <ListPhotos />
      )}
    </div>
  )
}

export default App
