import { useState } from 'react'
import { API_BASE_URL } from './constants'
import { useUploadProgress } from './hooks/useUploadProgress'

function UploadVideo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { progress, uploading, uploadFile, error } = useUploadProgress();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('File size must be less than 100MB');
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

    if (result) {
      setUploadedVideo(`${API_BASE_URL}/uploads/${result.filename}`);
      setSelectedFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else if (!error) {
      setUploadError('Upload failed');
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
        {(uploadError || error) && <div className="error-message">❌ {uploadError || error}</div>}
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
