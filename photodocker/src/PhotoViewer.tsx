import { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from './constants';
import './PhotoViewer.css';

interface Photo {
  filename: string;
  size: number;
  sizeKB: string;
  uploadedAt: string;
}

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}

function PhotoViewer({ photos, initialIndex, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentPhoto = photos[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="photo-viewer-backdrop" onClick={handleBackdropClick}>
      <div className="photo-viewer-container">
        <button className="viewer-close-btn" onClick={onClose}>✕</button>
        
        <div className="photo-viewer-main">
          <button className="viewer-nav-btn prev-btn" onClick={handlePrevious}>
            ❮
          </button>
          
          <div className="photo-display">
            <img
              src={`${API_BASE_URL}/uploads/${currentPhoto.filename}`}
              alt={currentPhoto.filename}
            />
          </div>
          
          <button className="viewer-nav-btn next-btn" onClick={handleNext}>
            ❯
          </button>
        </div>

        <div className="photo-info-panel">
          <div className="photo-details">
            <h3>{currentPhoto.filename}</h3>
            <div className="photo-metadata">
              <div className="metadata-item">
                <span className="label">📊 Size:</span>
                <span className="value">{currentPhoto.sizeKB} KB</span>
              </div>
              <div className="metadata-item">
                <span className="label">📅 Uploaded:</span>
                <span className="value">{new Date(currentPhoto.uploadedAt).toLocaleString()}</span>
              </div>
              <div className="metadata-item">
                <span className="label">🔢 Photo:</span>
                <span className="value">{currentIndex + 1} / {photos.length}</span>
              </div>
            </div>
          </div>
          
          <div className="thumbnails">
            {photos.map((photo, index) => (
              <button
                key={photo.filename}
                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
                title={photo.filename}
              >
                <img
                  src={`${API_BASE_URL}/uploads/${photo.filename}`}
                  alt={photo.filename}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="viewer-keyboard-hints">
          <span>← / → Arrow keys to navigate</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}

export default PhotoViewer;
