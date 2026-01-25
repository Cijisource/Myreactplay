import { useState } from 'react'
import { API_BASE_URL } from './constants'

function UploadVideo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 100MB');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedVideo(`${API_BASE_URL}/uploads/${data.filename}`);
        setSelectedFile(null);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setError('Upload failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="video/*" 
        onChange={handleFileChange}
        disabled={uploading}
      />
      {selectedFile && <p>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
      <button onClick={handleUpload} disabled={!selectedFile || uploading}>
        {uploading ? 'Uploading...' : 'Upload Video'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {uploadedVideo && (
        <div style={{ marginTop: '20px' }}>
          <h2>Uploaded Video:</h2>
          <video 
            src={uploadedVideo} 
            controls 
            style={{ maxWidth: '100%', maxHeight: '400px' }}
          />
        </div>
      )}
    </div>
  )
}

export default UploadVideo
