import { TenantWithOccupancy } from './TenantManagement';
import { getFileUrl } from '../api';
import { useState } from 'react';

interface TenantFullScreenViewProps {
  tenant: TenantWithOccupancy;
  onClose?: () => void;
  onViewPhoto?: (photoIndex: number) => void;
  onViewProof?: (proofIndex: number) => void;
  useAzurePhotos?: boolean; // Enable Azure Blob Storage for main photo
}

export default function TenantFullScreenView({
  tenant,
  onClose,
  onViewPhoto,
  onViewProof,
  // useAzurePhotos is declared in props interface but always defaults to using Azure photo from tenant.azurePhotoUrl
}: TenantFullScreenViewProps) {
  const [azurePhotoUrl, setAzurePhotoUrl] = useState<string | null>(tenant.azurePhotoUrl || null);

  // Use pre-fetched Azure photo URL from tenant data
  const mainPhotoUrl = azurePhotoUrl || (tenant.photoUrl ? getFileUrl(tenant.photoUrl) : null);

  const getTenantPhotos = (tenant: TenantWithOccupancy): string[] => {
    return [
      tenant.photoUrl,
      tenant.photo2Url,
      tenant.photo3Url,
      tenant.photo4Url,
      tenant.photo5Url,
      tenant.photo6Url,
      tenant.photo7Url,
      tenant.photo8Url,
      tenant.photo9Url,
      tenant.photo10Url,
    ].filter((url): url is string => !!url);
  };

  const getTenantProofs = (tenant: TenantWithOccupancy): string[] => {
    return [
      tenant.proof1Url,
      tenant.proof2Url,
      tenant.proof3Url,
      tenant.proof4Url,
      tenant.proof5Url,
      tenant.proof6Url,
      tenant.proof7Url,
      tenant.proof8Url,
      tenant.proof9Url,
      tenant.proof10Url,
    ].filter((url): url is string => !!url);
  };

  return (
    <div className="fullscreen-container">
      <div className="fullscreen-content">
        <div className="fullscreen-header">
          <div className="fullscreen-title-section">
            <h1>{tenant.name}</h1>
            {mainPhotoUrl && (
              <div className="fullscreen-main-photo">
                <img
                  src={mainPhotoUrl}
                  alt={tenant.name}
                  loading="lazy"
                  onError={(e) => {
                    console.error('Failed to load image:', e);
                    if (azurePhotoUrl && tenant.photoUrl) {
                      // Fallback to local file if Azure fails
                      setAzurePhotoUrl(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="fullscreen-close-btn"
            aria-label="Close full screen view"
            onClick={() => onClose?.()}
          >
            ✕
          </button>
        </div>

        <div className="fullscreen-body">
          {/* Occupancy Status Badge */}
          {tenant.isCurrentlyOccupied !== undefined && (
            <div className="fullscreen-status-section">
              <div className={`occupancy-status-badge ${tenant.isCurrentlyOccupied ? 'occupied' : 'vacant'}`}>
                {tenant.isCurrentlyOccupied ? '✓ Currently Occupied' : '◯ Vacant'}
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="fullscreen-section">
            <h3>Personal Information</h3>
            <div className="fullscreen-grid">
              <div className="fullscreen-field">
                <label>Phone</label>
                <p>{tenant.phone}</p>
              </div>
              <div className="fullscreen-field">
                <label>City</label>
                <p>{tenant.city}</p>
              </div>
              <div className="fullscreen-field">
                <label>Address</label>
                <p>{tenant.address}</p>
              </div>
            </div>
          </div>

          {/* Occupancy Details */}
          {tenant.isCurrentlyOccupied && (
            <div className="fullscreen-section">
              <h3>Occupancy & Room Details</h3>
              <div className="fullscreen-grid">
                <div className="fullscreen-field">
                  <label>Room Number</label>
                  <p>{tenant.roomNumber || 'N/A'}</p>
                </div>
                <div className="fullscreen-field">
                  <label>Check-in Date</label>
                  <p>{tenant.checkInDate ? new Date(tenant.checkInDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                {tenant.checkOutDate && (
                  <div className="fullscreen-field">
                    <label>Check-out Date</label>
                    <p>{new Date(tenant.checkOutDate).toLocaleDateString()}</p>
                  </div>
                )}
                {tenant.rentFixed && (
                  <div className="fullscreen-field">
                    <label>Rent Fixed</label>
                    <p>₹{tenant.rentFixed.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Information */}
          {tenant.isCurrentlyOccupied && (
            <div className="fullscreen-section">
              <h3>Current Month Payment</h3>
              <div className="fullscreen-payment-grid">
                <div className="fullscreen-field">
                  <label>Amount Received</label>
                  <p className="payment-received">₹{tenant.currentRentReceived?.toLocaleString() || '0'}</p>
                </div>
                <div className="fullscreen-field">
                  <label>Amount Pending</label>
                  <p className={tenant.currentPendingPayment && tenant.currentPendingPayment > 0 ? 'payment-pending' : 'payment-cleared'}>
                    ₹{tenant.currentPendingPayment?.toLocaleString() || '0'}
                  </p>
                </div>
                {tenant.lastPaymentDate && (
                  <div className="fullscreen-field">
                    <label>Last Payment Date</label>
                    <p>{new Date(tenant.lastPaymentDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Photos Gallery */}
          {getTenantPhotos(tenant).length > 0 && (
            <div className="fullscreen-section">
              <h3>Photos</h3>
              <div className="fullscreen-photos-grid">
                {getTenantPhotos(tenant).map((photo, idx) => (
                  <img
                    key={idx}
                    src={getFileUrl(photo)}
                    alt={`Photo ${idx + 1}`}
                    loading="lazy"
                    onClick={() => onViewPhoto?.(idx)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full size"
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Proofs Gallery */}
          {getTenantProofs(tenant).length > 0 && (
            <div className="fullscreen-section">
              <h3>Documents & Proofs</h3>
              <div className="fullscreen-proofs-grid">
                {getTenantProofs(tenant).map((proof, idx) => (
                  <div 
                    key={idx} 
                    className="proof-item"
                    onClick={() => onViewProof?.(idx)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full size"
                  >
                    <img
                      src={getFileUrl(proof)}
                      alt={`Proof ${idx + 1}`}
                      loading="lazy"
                    />
                    <span>Proof {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
