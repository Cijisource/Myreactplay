import { useState, useRef, useEffect } from 'react'
import { API_BASE_URL } from './constants'
import { useUploadProgress } from './hooks/useUploadProgress'

function CaptureVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const { progress, uploading, uploadFile } = useUploadProgress();
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
    try {
      setPermissionError(null);
      setVideoReady(false);
      
      // Request camera and audio with fallback constraints
      try {
        var stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch (e) {
        // Fallback to basic request if constrained request fails
        console.warn('Constrained getUserMedia failed, trying basic request:', e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
              // Set a timeout to enable recording if metadata doesn't load
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
        errorMsg = '❌ Camera/Microphone permission denied. Please allow access when prompted by your browser, or check your browser/system settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg = '❌ No camera or microphone device found. Please ensure they are connected.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = '❌ Camera/Microphone is in use by another application. Please close other apps using them.';
      } else if (error instanceof DOMException) {
        errorMsg = '❌ Camera/Microphone access denied. Please allow access in your browser settings.';
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
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      setUploadError('Camera stream not available');
      return;
    }

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setCapturedVideo(url);
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setUploadError(`Recording error: ${event.error}`);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      setUploadError(null);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setUploadError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const retakeVideo = () => {
    if (capturedVideo) {
      URL.revokeObjectURL(capturedVideo);
    }
    setCapturedVideo(null);
    setRecordingTime(0);
  };

  const uploadVideo = async () => {
    if (!capturedVideo) return;

    try {
      const response = await fetch(capturedVideo);
      const blob = await response.blob();
      const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });

      // Check file size (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('Video size must be less than 500MB');
        return;
      }

      const result = await uploadFile(file, `${API_BASE_URL}/upload-video`);

      if (result.success) {
        setUploadedVideo(`${API_BASE_URL}/uploads/${result.filename}`);
        setCapturedVideo(null);
        setUploadError(null);
      } else {
        setUploadError(result.error);
      }
    } catch (error) {
      setUploadError('Failed to upload video');
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="capture-section">
      <h2>🎬 Capture Video</h2>

      {permissionError && <div className="error-message">❌ {permissionError}</div>}

      {!isCameraActive && !capturedVideo ? (
        <button onClick={startCamera} className="capture-button">
          🎥 Start Camera
        </button>
      ) : null}

      {isCameraActive && !capturedVideo && (
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
          <div className="recording-info">
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                Recording: {formatTime(recordingTime)}
              </div>
            )}
          </div>
          <div className="camera-controls">
            {!isRecording ? (
              <button onClick={startRecording} disabled={!videoReady} className="capture-button primary">
                🔴 Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} className="capture-button danger">
                ⏹️ Stop Recording
              </button>
            )}
            <button onClick={stopCamera} className="capture-button secondary">
              ❌ Stop Camera
            </button>
          </div>
        </div>
      )}

      {capturedVideo && (
        <div className="preview-section">
          <video
            src={capturedVideo}
            controls
            style={{ maxWidth: '500px', borderRadius: '8px', width: '100%' }}
          />
          <div className="capture-controls">
            <button onClick={retakeVideo} disabled={uploading} className="capture-button secondary">
              🔄 Retake
            </button>
            <button onClick={uploadVideo} disabled={uploading} className="capture-button primary">
              {uploading ? '⏳ Uploading...' : '📤 Upload Video'}
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

      {uploadedVideo && (
        <div className="preview-section">
          <h3>✅ Video Uploaded Successfully!</h3>
          <video
            src={uploadedVideo}
            controls
            style={{ maxWidth: '500px', borderRadius: '8px', width: '100%' }}
          />
          <button onClick={() => { setUploadedVideo(null); startCamera(); }} className="capture-button primary">
            🎬 Record Another
          </button>
        </div>
      )}
    </div>
  );
}

export default CaptureVideo;
