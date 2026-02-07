interface VideoModalProps {
  videoUrl: string;
  filename: string;
  onClose: () => void;
}

function VideoModal({ videoUrl, filename, onClose }: VideoModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>
        <video
          src={videoUrl}
          className="modal-video"
          controls
          autoPlay
        />
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>📹 {filename}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VideoModal;
