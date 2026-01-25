import { useState } from 'react'
import './App.css'
import { API_BASE_URL } from './constants'
import ListPhotos from './ListPhotos'
import UploadVideo from './UploadVideo'
import ListVideos from './ListVideos'

function App() {
  const [currentView, setCurrentView] = useState<'upload-photo' | 'list-photos' | 'upload-video' | 'list-videos'>('upload-photo');
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
      <h1>📱 MediaHub</h1>
      <nav className="navigation">
        <button 
          className={`nav-button ${currentView === 'upload-photo' ? 'active-photo' : ''}`}
          onClick={() => setCurrentView('upload-photo')}
        >
          📷 Upload Photo
        </button>
        <button 
          className={`nav-button ${currentView === 'list-photos' ? 'active-photo' : ''}`}
          onClick={() => setCurrentView('list-photos')}
        >
          🖼️ View Photos
        </button>
        <button 
          className={`nav-button ${currentView === 'upload-video' ? 'active-video' : ''}`}
          onClick={() => setCurrentView('upload-video')}
        >
          🎥 Upload Video
        </button>
        <button 
          className={`nav-button ${currentView === 'list-videos' ? 'active-video' : ''}`}
          onClick={() => setCurrentView('list-videos')}
        >
          🎬 View Videos
        </button>
      </nav>

      {currentView === 'upload-photo' ? (
        <div className="upload-section">
          <h2>Upload Photo</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {selectedFile && <p className="file-info">📄 {selectedFile.name}</p>}
          <button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? '⏳ Uploading...' : '📤 Upload Photo'}
          </button>
          {uploadedImage && (
            <div className="preview-section">
              <h2>✅ Uploaded Image</h2>
              <img src={uploadedImage} alt="Uploaded" />
            </div>
          )}
        </div>
      ) : currentView === 'list-photos' ? (
        <ListPhotos />
      ) : currentView === 'upload-video' ? (
        <UploadVideo />
      ) : (
        <ListVideos />
      )}
    </div>
  )
}

export default App
