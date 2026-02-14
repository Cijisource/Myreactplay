import { useState } from 'react'
import { API_BASE_URL } from './constants'
import { useUploadProgress } from './hooks/useUploadProgress'

function UploadVideo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { progress, uploading, uploadFile } = useUploadProgress();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('File size must be less than 500MB');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadFile(selectedFile, `${API_BASE_URL}/upload-video`);

    if (result.success) {
      setUploadedVideo(`${API_BASE_URL}/uploads/${result.filename}`);
      setSelectedFile(null);
      setUploadError(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      setUploadError(result.error);
    }
  };

  return (
    <div>
      <div className="upload-section">
        <h2>🎥 Upload Video</h2>
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileChange}
          disabled={uploading}
        />
        {selectedFile && (
          <p className="file-info">
            📹 {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        <button onClick={handleUpload} disabled={!selectedFile || uploading}>
          {uploading ? '⏳ Uploading Video...' : '📤 Upload Video'}
        </button>
        {uploading && (
          <div style={{ marginTop: '1rem' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">{Math.round(progress)}%</div>
          </div>
        )}
        {(uploadError) && <div className="error-message">❌ {uploadError}</div>}
      </div>
      {uploadedVideo && (
        <div className="preview-section">
          <h2>✅ Uploaded Video</h2>
          <video 
            src={uploadedVideo} 
            controls 
          />
        </div>
      )}
    </div>
  )
}

export default UploadVideo
