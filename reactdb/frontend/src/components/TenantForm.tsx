import { useState, useRef } from 'react';
import { apiService } from '../api';
import { TenantWithOccupancy } from './TenantManagement';
import './TenantForm.css';

interface TenantFormProps {
  tenant?: TenantWithOccupancy | null;
  onSubmit: (data: Omit<TenantWithOccupancy, 'id'>) => Promise<void>;
  onCancel: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
  name: string;
}

const MAX_PHOTOS = 10;
const MAX_PROOFS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function TenantForm({ tenant, onSubmit, onCancel }: TenantFormProps) {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    city: tenant?.city || '',
  });

  const [photos, setPhotos] = useState<FilePreview[]>([]);
  const [proofs, setProofs] = useState<FilePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} exceeds 10MB limit`;
    }
    if (!file.type.startsWith('image/')) {
      return `File ${file.name} is not an image`;
    }
    return null;
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: FilePreview[] = [];
    for (let i = 0; i < files.length; i++) {
      if (photos.length + newPhotos.length >= MAX_PHOTOS) {
        setError(`Maximum ${MAX_PHOTOS} photos allowed`);
        break;
      }

      const file = files[i];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setPhotos((prev) => [
          ...prev,
          {
            file,
            preview,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleProofsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newProofs: FilePreview[] = [];
    for (let i = 0; i < files.length; i++) {
      if (proofs.length + newProofs.length >= MAX_PROOFS) {
        setError(`Maximum ${MAX_PROOFS} proofs allowed`);
        break;
      }

      const file = files[i];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setProofs((prev) => [
          ...prev,
          {
            file,
            preview,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    if (proofInputRef.current) {
      proofInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeProof = (index: number) => {
    setProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    // Validate phone format (basic)
    if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Phone number should be 10-15 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Start with existing file URLs (for edit mode)
      let photoUrls: string[] = [
        tenant?.photoUrl || null,
        tenant?.photo2Url || null,
        tenant?.photo3Url || null,
        tenant?.photo4Url || null,
        tenant?.photo5Url || null,
        tenant?.photo6Url || null,
        tenant?.photo7Url || null,
        tenant?.photo8Url || null,
        tenant?.photo9Url || null,
        tenant?.photo10Url || null,
      ].filter((url): url is string => url !== null);

      let proofUrls: string[] = [
        tenant?.proof1Url || null,
        tenant?.proof2Url || null,
        tenant?.proof3Url || null,
        tenant?.proof4Url || null,
        tenant?.proof5Url || null,
        tenant?.proof6Url || null,
        tenant?.proof7Url || null,
        tenant?.proof8Url || null,
        tenant?.proof9Url || null,
        tenant?.proof10Url || null,
      ].filter((url): url is string => url !== null);

      // If new files are provided (create or update with new files)
      if (photos.length > 0 || proofs.length > 0) {
        const formDataFiles = new FormData();
        
        photos.forEach((photo) => {
          formDataFiles.append('photos', photo.file);
        });

        proofs.forEach((proof) => {
          formDataFiles.append('proofs', proof.file);
        });

        console.log(`[Tenant ${tenant ? 'Update' : 'Creation'}] Uploading files...`, {
          photoCount: photos.length,
          proofCount: proofs.length,
        });

        try {
          const uploadResponse = await apiService.uploadTenantFiles(formDataFiles);
          console.log(`[Tenant ${tenant ? 'Update' : 'Creation'}] Upload response:`, uploadResponse);
          
          if (uploadResponse.data) {
            // Replace with newly uploaded files
            photoUrls = uploadResponse.data.photoUrls || [];
            proofUrls = uploadResponse.data.proofUrls || [];
          }
        } catch (uploadErr) {
          const uploadError = uploadErr instanceof Error ? uploadErr.message : 'File upload failed';
          setError(`Upload failed: ${uploadError}`);
          setLoading(false);
          return;
        }
      }

      // Create submit data with all 10 photo and proof URLs
      const submitData: Omit<TenantWithOccupancy, 'id'> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        photoUrl: photoUrls[0] || null,
        photo2Url: photoUrls[1] || null,
        photo3Url: photoUrls[2] || null,
        photo4Url: photoUrls[3] || null,
        photo5Url: photoUrls[4] || null,
        photo6Url: photoUrls[5] || null,
        photo7Url: photoUrls[6] || null,
        photo8Url: photoUrls[7] || null,
        photo9Url: photoUrls[8] || null,
        photo10Url: photoUrls[9] || null,
        proof1Url: proofUrls[0] || null,
        proof2Url: proofUrls[1] || null,
        proof3Url: proofUrls[2] || null,
        proof4Url: proofUrls[3] || null,
        proof5Url: proofUrls[4] || null,
        proof6Url: proofUrls[5] || null,
        proof7Url: proofUrls[6] || null,
        proof8Url: proofUrls[7] || null,
        proof9Url: proofUrls[8] || null,
        proof10Url: proofUrls[9] || null,
      };

      console.log(`[Tenant ${tenant ? 'Update' : 'Creation'}] Submitting data:`, submitData);
      await onSubmit(submitData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save tenant';
      setError(errorMsg);
      console.error('[Tenant Form] Error:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
          <button className="btn-close" onClick={onCancel} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tenant-form">
          {error && <div className="form-error">{error}</div>}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}

          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter tenant name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number (10-15 digits)"
                disabled={loading}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Tenant Photos {tenant && '(Click to update)'}</h3>
              <span className="count-badge">{photos.length} / {MAX_PHOTOS}</span>
            </div>

            {tenant && (photos.length === 0) && (
              <div className="existing-files-notice">
                <p>Current photos will be kept unless you upload new ones</p>
              </div>
            )}
            
            <div className="file-upload-area">
              <div
                className="upload-placeholder"
                onClick={() => photoInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="upload-icon">📸</div>
                <p>Click to {tenant && photos.length === 0 ? 'add or update' : 'upload'} photos (up to {MAX_PHOTOS})</p>
                <span className="upload-hint">PNG, JPG, GIF up to 10MB each</span>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotosChange}
                className="file-input"
                disabled={loading || photos.length >= MAX_PHOTOS}
                multiple
              />
            </div>

            {photos.length > 0 && (
              <div className="file-gallery">
                {photos.map((photo, index) => (
                  <div key={index} className="gallery-item">
                    <img src={photo.preview} alt={`Photo ${index + 1}`} />
                    <div className="file-name" title={photo.name}>{photo.name}</div>
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={() => removePhoto(index)}
                      disabled={loading}
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proof Upload Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Proof Documents {tenant && '(Click to update)'}</h3>
              <span className="count-badge">{proofs.length} / {MAX_PROOFS}</span>
            </div>

            {tenant && (proofs.length === 0) && (
              <div className="existing-files-notice">
                <p>Current proofs will be kept unless you upload new ones</p>
              </div>
            )}

            <div className="file-upload-area">
              <div
                className="upload-placeholder"
                onClick={() => proofInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="upload-icon">📄</div>
                <p>Click to {tenant && proofs.length === 0 ? 'add or update' : 'upload'} proof documents (up to {MAX_PROOFS})</p>
                <span className="upload-hint">PNG, JPG, GIF up to 10MB each</span>
              </div>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*"
                onChange={handleProofsChange}
                className="file-input"
                disabled={loading || proofs.length >= MAX_PROOFS}
                multiple
              />
            </div>

            {proofs.length > 0 && (
              <div className="file-gallery">
                {proofs.map((proof, index) => (
                  <div key={index} className="gallery-item">
                    <img src={proof.preview} alt={`Proof ${index + 1}`} />
                    <div className="file-name" title={proof.name}>{proof.name}</div>
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={() => removeProof(index)}
                      disabled={loading}
                      title="Remove proof"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading
                ? `Saving... ${uploadProgress > 0 ? uploadProgress + '%' : ''}`
                : tenant
                ? 'Update Tenant'
                : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
