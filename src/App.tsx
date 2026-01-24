import { useState } from 'react'
import './App.css'
import { API_BASE_URL } from './constants'

function App() {
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
  )
}

export default App
