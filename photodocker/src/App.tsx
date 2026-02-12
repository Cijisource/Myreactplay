import { useState } from 'react'
import './App.css'
import { API_BASE_URL } from './constants'
import ListPhotos from './ListPhotos'
import UploadVideo from './UploadVideo'
import ListVideos from './ListVideos'
import CapturePhoto from './CapturePhoto'
import CaptureVideo from './CaptureVideo'
import { useUploadProgress } from './hooks/useUploadProgress'

function App() {
  const [currentView, setCurrentView] = useState<'upload-photo' | 'capture-photo' | 'list-photos' | 'upload-video' | 'capture-video' | 'list-videos'>('upload-photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { progress, uploading, uploadFile } = useUploadProgress();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadFile(selectedFile, `${API_BASE_URL}/upload`);

    if (result.success) {
      setUploadedImage(`${API_BASE_URL}/uploads/${result.filename}`);
      setSelectedFile(null);
      setUploadError(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      setUploadError(result.error);
    }
  };

  return (
    <div className="App">
      <h1>📱 MediaHub</h1>
      <nav className="navigation">
        <div className="nav-group">
          <h3>Photos</h3>
          <button 
            className={`nav-button ${currentView === 'upload-photo' ? 'active-photo' : ''}`}
            onClick={() => setCurrentView('upload-photo')}
          >
            📤 Upload Photo
          </button>
          <button 
            className={`nav-button ${currentView === 'capture-photo' ? 'active-photo' : ''}`}
            onClick={() => setCurrentView('capture-photo')}
          >
            📸 Capture Photo
          </button>
          <button 
            className={`nav-button ${currentView === 'list-photos' ? 'active-photo' : ''}`}
            onClick={() => setCurrentView('list-photos')}
          >
            🖼️ View Photos
          </button>
        </div>
        <div className="nav-group">
          <h3>Videos</h3>
          <button 
            className={`nav-button ${currentView === 'upload-video' ? 'active-video' : ''}`}
            onClick={() => setCurrentView('upload-video')}
          >
            📤 Upload Video
          </button>
          <button 
            className={`nav-button ${currentView === 'capture-video' ? 'active-video' : ''}`}
            onClick={() => setCurrentView('capture-video')}
          >
            🎬 Capture Video
          </button>
          <button 
            className={`nav-button ${currentView === 'list-videos' ? 'active-video' : ''}`}
            onClick={() => setCurrentView('list-videos')}
          >
            📹 View Videos
          </button>
        </div>
      </nav>

      {currentView === 'upload-photo' ? (
        <div className="upload-section">
          <h2>📤 Upload Photo</h2>
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
          {uploadError && <div className="error-message">❌ {uploadError}</div>}
          {uploadedImage && (
            <div className="preview-section">
              <h2>✅ Uploaded Image</h2>
              <img src={uploadedImage} alt="Uploaded" />
            </div>
          )}
        </div>
      ) : currentView === 'capture-photo' ? (
        <CapturePhoto />
      ) : currentView === 'list-photos' ? (
        <ListPhotos />
      ) : currentView === 'upload-video' ? (
        <UploadVideo />
      ) : currentView === 'capture-video' ? (
        <CaptureVideo />
      ) : (
        <ListVideos />
      )}
    </div>
  )
}

export default App
