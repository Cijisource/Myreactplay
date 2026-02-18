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
      setVideoReady(false);
      
      // Request camera with fallback constraints
      try {
        var stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e) {
        // Fallback to basic video request if constrained request fails
        console.warn('Constrained getUserMedia failed, trying basic request:', e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Handle play promise
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Video playback started');
              // Set a timeout to enable capture if metadata doesn't load
              setTimeout(() => {
                if (videoRef.current && videoRef.current.videoWidth > 0) {
                  setVideoReady(true);
                }
              }, 300);
            })
            .catch(error => {
              console.error('Error playing video:', error);
              setPermissionError('Failed to play video stream. Check your browser permissions.');
            });
        }
      }
      setIsCameraActive(true);
    } catch (error: any) {
      console.error('Camera error details:', error);
      let errorMsg = 'Failed to access camera';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = '❌ Camera permission denied. Please allow camera access when prompted by your browser, or check your browser/system settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg = '❌ No camera device found. Please ensure a camera is connected.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = '❌ Camera is in use by another application. Please close other apps using the camera.';
      } else if (error instanceof DOMException) {
        errorMsg = '❌ Camera access denied. Please allow camera access in your browser settings.';
      }
      
      setPermissionError(errorMsg);
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
            onLoadedMetadata={() => {
              console.log('Video metadata loaded:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
              setVideoReady(true);
            }}
            onCanPlay={() => {
              console.log('Video can play');
              if (!videoReady) setVideoReady(true);
            }}
            onError={(e) => {
              console.error('Video element error:', e);
              setPermissionError('Error loading video stream');
            }}
            style={{
              width: '100%',
              maxWidth: '500px',
              borderRadius: '8px',
              backgroundColor: '#000',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
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
