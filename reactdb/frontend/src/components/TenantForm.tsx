import { useState, useRef } from 'react';
import { TenantWithOccupancy } from './TenantManagement';
import './TenantForm.css';

interface TenantFormProps {
  tenant?: TenantWithOccupancy | null;
  onSubmit: (data: Omit<TenantWithOccupancy, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export default function TenantForm({ tenant, onSubmit, onCancel }: TenantFormProps) {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    city: tenant?.city || '',
    photoUrl: tenant?.photoUrl || '',
    proof1Url: tenant?.proof1Url || '',
    proof2Url: tenant?.proof2Url || '',
    proof3Url: tenant?.proof3Url || '',
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(
    tenant?.photoUrl || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotoPreview(dataUrl);
        setFormData((prev) => ({
          ...prev,
          photoUrl: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData((prev) => ({
      ...prev,
      photoUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      const submitData: Omit<TenantWithOccupancy, 'id'> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        photoUrl: formData.photoUrl || null,
        proof1Url: formData.proof1Url || null,
        proof2Url: formData.proof2Url || null,
        proof3Url: formData.proof3Url || null,
      };
      await onSubmit(submitData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save tenant';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
          <button className="btn-close" onClick={onCancel} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tenant-form">
          {error && <div className="form-error">{error}</div>}

          {/* Photo Upload Section */}
          <div className="form-section photo-section">
            <label>Tenant Photo</label>
            <div className="photo-upload-area">
              {photoPreview ? (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Preview" />
                  <button
                    type="button"
                    className="btn-remove-photo"
                    onClick={handleRemovePhoto}
                    disabled={loading}
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <div
                  className="photo-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="upload-icon">📷</div>
                  <p>Click to upload photo</p>
                  <span className="upload-hint">PNG, JPG up to 5MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="photo-input"
                disabled={loading}
              />
            </div>
          </div>

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

          {/* Document URLs */}
          <div className="form-section">
            <h3>Document Links (Optional)</h3>

            <div className="form-group">
              <label htmlFor="proof1Url">Proof 1 URL</label>
              <input
                id="proof1Url"
                type="url"
                name="proof1Url"
                value={formData.proof1Url}
                onChange={handleInputChange}
                placeholder="https://example.com/proof1"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="proof2Url">Proof 2 URL</label>
              <input
                id="proof2Url"
                type="url"
                name="proof2Url"
                value={formData.proof2Url}
                onChange={handleInputChange}
                placeholder="https://example.com/proof2"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="proof3Url">Proof 3 URL</label>
              <input
                id="proof3Url"
                type="url"
                name="proof3Url"
                value={formData.proof3Url}
                onChange={handleInputChange}
                placeholder="https://example.com/proof3"
                disabled={loading}
              />
            </div>
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
                ? 'Saving...'
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
