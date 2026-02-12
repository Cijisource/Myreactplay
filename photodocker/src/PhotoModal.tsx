interface PhotoModalProps {
  imageUrl: string;
  filename: string;
  onClose: () => void;
  onDelete?: () => void;
}

function PhotoModal({ imageUrl, filename, onClose, onDelete }: PhotoModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>
        <img
          src={imageUrl}
          alt={filename}
          className="modal-image"
        />
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>📄 {filename}</strong>
          </p>
          {onDelete && (
            <button
              className="modal-delete-btn"
              onClick={() => {
                onDelete();
                onClose();
              }}
              title="Delete this photo"
            >
              🗑️ Delete Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoModal;
