import React from 'react';
import { TenantWithOccupancy } from './TenantManagement';
import { getFileUrl } from '../api';

interface TenantCardProps {
  tenant: TenantWithOccupancy;
  onView: (tenant: TenantWithOccupancy) => void;
  onEdit: (tenant: TenantWithOccupancy) => void;
  onDeleteClick: (tenantId: number | null) => void;
  onDeleteConfirm: (tenantId: number) => Promise<void>;
  showDeleteConfirm: number | null;
}

export default function TenantCard({
  tenant,
  onView,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  showDeleteConfirm,
}: TenantCardProps) {
  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView(tenant);
  };

  const hasAdditionalMedia = Boolean(
    tenant.photo2Url ||
      tenant.photo3Url ||
      tenant.photo4Url ||
      tenant.photo5Url ||
      tenant.proof1Url
  );

  const renderActionIcons = () => (
    <div className="tenant-action-icons">
      {hasAdditionalMedia && (
        <button
          className="action-icon-btn action-view"
          onClick={handlePhotoClick}
          title="View all photos and proofs"
          aria-label="View photos"
        >
          👁
        </button>
      )}
      <button
        className="action-icon-btn action-edit"
        onClick={() => onEdit(tenant)}
        title="Edit tenant"
        aria-label="Edit"
      >
        ✎
      </button>
      <button
        className="action-icon-btn action-delete"
        // onClick={() => onDeleteClick(tenant.id)}
        title="Delete tenant"
        aria-label="Delete"
      >
        🗑
      </button>
    </div>
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Ccircle cx="100" cy="70" r="40" fill="%23ccc"/%3E%3Cpath d="M20 200 Q20 140 100 140 Q180 140 180 200" fill="%23ccc"/%3E%3C/svg%3E';
  };

  return (
    <div className="tenant-card">
      {/* Tenant Image */}
      <div className="tenant-image-container">
        {tenant.photoUrl ? (
          <>
            <img
              src={getFileUrl(tenant.photoUrl)}
              alt={tenant.name}
              className="tenant-image"
              loading="lazy"
              onError={handleImageError}
            />
            {renderActionIcons()}
          </>
        ) : (
          <>
            <div className="tenant-avatar">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            {renderActionIcons()}
          </>
        )}
        <div
          className={`occupancy-badge ${
            tenant.isCurrentlyOccupied ? 'occupied' : 'vacant'
          }`}
        >
          {tenant.isCurrentlyOccupied ? 'Occupied' : 'Vacant'}
        </div>
      </div>

      {/* Tenant Info */}
      <div className="tenant-info">
        <h3 className="tenant-name">{tenant.name}</h3>
        <div className="tenant-detail">
          <span className="detail-label">Phone:</span>
          <span className="detail-value">{tenant.phone}</span>
        </div>
        <div className="tenant-detail">
          <span className="detail-label">City:</span>
          <span className="detail-value">{tenant.city}</span>
        </div>
        <div className="tenant-detail">
          <span className="detail-label">Address:</span>
          <span className="detail-value">{tenant.address}</span>
        </div>
      </div>

      {/* Room Details (if occupied) */}
      {tenant.isCurrentlyOccupied && (
        <div className="room-details">
          <h4>Room & Payment Details</h4>
          <div className="room-info">
            <div className="room-item">
              <span className="room-label">Room:</span>
              <span className="room-value">{tenant.roomNumber}</span>
            </div>
            <div className="room-item">
              <span className="room-label">Rent Fixed:</span>
              <span className="room-value">
                ₹{tenant.rentFixed?.toLocaleString() ?? '0'}
              </span>
            </div>
            <div className="room-item">
              <span className="room-label">Check-in:</span>
              <span className="room-value">
                {tenant.checkInDate
                  ? new Date(tenant.checkInDate).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            {tenant.checkOutDate && (
              <div className="room-item">
                <span className="room-label">Check-out:</span>
                <span className="room-value">
                  {new Date(tenant.checkOutDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="payment-status">
            <h5>Current Month Payment</h5>
            <div className="payment-row">
              <div className="payment-item received">
                <span className="payment-label">Received</span>
                <span className="payment-amount">
                  ₹{tenant.currentRentReceived?.toLocaleString() ?? '0'}
                </span>
              </div>
              <div
                className={`payment-item ${
                  tenant.currentPendingPayment &&
                  tenant.currentPendingPayment > 0
                    ? 'pending'
                    : 'cleared'
                }`}
              >
                <span className="payment-label">Pending</span>
                <span className="payment-amount">
                  ₹{tenant.currentPendingPayment?.toLocaleString() ?? '0'}
                </span>
              </div>
            </div>
            {tenant.lastPaymentDate && (
              <div className="last-payment">
                <span className="payment-label">Last Payment:</span>
                <span className="payment-date">
                  {new Date(tenant.lastPaymentDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm === tenant.id && (
        <div className="delete-confirmation">
          <p>Are you sure you want to delete this tenant?</p>
          <div className="confirmation-buttons">
            <button
              className="btn-confirm"
              onClick={() => onDeleteConfirm(tenant.id)}
            >
              Yes, Delete
            </button>
            <button
              className="btn-cancel"
              onClick={() => onDeleteClick(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}