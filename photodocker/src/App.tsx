import { useState } from 'react'
import './App.css'
import { API_BASE_URL } from './constants'
import ListPhotos from './ListPhotos'
import UploadVideo from './UploadVideo'
import ListVideos from './ListVideos'
import { useUploadProgress } from './hooks/useUploadProgress'

function App() {
  const [currentView, setCurrentView] = useState<'upload-photo' | 'list-photos' | 'upload-video' | 'list-videos'>('upload-photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { progress, uploading, uploadFile, error } = useUploadProgress();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadFile(selectedFile, `${API_BASE_URL}/upload`);

    if (result) {
      setUploadedImage(`${API_BASE_URL}/uploads/${result.filename}`);
      setSelectedFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else if (!error) {
      alert('Upload failed');
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
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          {selectedFile && <p className="file-info">📄 {selectedFile.name}</p>}
          <button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? '⏳ Uploading...' : '📤 Upload Photo'}
          </button>
          {uploading && (
            <div style={{ marginTop: '1rem' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{Math.round(progress)}%</div>
            </div>
          )}
          {error && <div className="error-message">❌ {error}</div>}
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
