import { useState, useRef, useEffect } from 'react'
import { API_BASE_URL } from './constants'
import { useUploadProgress } from './hooks/useUploadProgress'

function CapturePhoto() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const { progress, uploading, uploadFile } = useUploadProgress();
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure the video element actually plays the stream
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
          setPermissionError('Failed to play video stream');
        });
      }
      setIsCameraActive(true);
    } catch (error) {
      setPermissionError(
        error instanceof DOMException 
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : 'Failed to access camera'
      );
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setVideoReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setUploadError('Camera not ready');
      return;
    }

    // Check if video has valid dimensions
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setUploadError('Video stream not ready. Please wait a moment and try again.');
      return;
    }

    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) {
        setUploadError('Failed to get canvas context');
        return;
      }

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      
      if (!imageData || imageData.length < 100) {
        setUploadError('Failed to capture photo. Please try again.');
        return;
      }

      setCapturedImage(imageData);
      setUploadError(null);
    } catch (error) {
      console.error('Error capturing photo:', error);
      setUploadError('Failed to capture photo. Please try again.');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const result = await uploadFile(file, `${API_BASE_URL}/upload`);

      if (result.success) {
        setUploadedImage(`${API_BASE_URL}/uploads/${result.filename}`);
        setCapturedImage(null);
        setUploadError(null);
      } else {
        setUploadError(result.error);
      }
    } catch (error) {
      setUploadError('Failed to upload photo');
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="capture-section">
      <h2>📸 Capture Photo</h2>
      
      {permissionError && <div className="error-message">❌ {permissionError}</div>}

      {!isCameraActive && !capturedImage ? (
        <button onClick={startCamera} className="capture-button">
          🎥 Start Camera
        </button>
      ) : null}

      {isCameraActive && !capturedImage && (
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={() => setVideoReady(true)}
            style={{
              borderRadius: '8px',
              backgroundColor: '#000',
            }}
          />
          {!videoReady && (
            <div className="loading-indicator" style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9em' }}>
              Loading camera...
            </div>
          )}
          <div className="camera-controls">
            <button onClick={capturePhoto} disabled={!videoReady} className="capture-button primary">
              📷 Take Photo
            </button>
            <button onClick={stopCamera} className="capture-button secondary">
              ❌ Stop Camera
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="preview-section">
          <img src={capturedImage} alt="Captured" style={{ maxWidth: '500px', borderRadius: '8px' }} />
          <div className="capture-controls">
            <button onClick={retakePhoto} disabled={uploading} className="capture-button secondary">
              🔄 Retake
            </button>
            <button onClick={uploadPhoto} disabled={uploading} className="capture-button primary">
              {uploading ? '⏳ Uploading...' : '📤 Upload Photo'}
            </button>
          </div>
          {uploading && (
            <div style={{ marginTop: '1rem' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{Math.round(progress)}%</div>
            </div>
          )}
          {uploadError && <div className="error-message">❌ {uploadError}</div>}
        </div>
      )}

      {uploadedImage && (
        <div className="preview-section">
          <h3>✅ Photo Uploaded Successfully!</h3>
          <img src={uploadedImage} alt="Uploaded" style={{ maxWidth: '500px', borderRadius: '8px' }} />
          <button onClick={() => { setUploadedImage(null); startCamera(); }} className="capture-button primary">
            📸 Capture Another
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default CapturePhoto;
