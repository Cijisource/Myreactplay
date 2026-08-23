import { TenantWithOccupancy } from './TenantManagement';
import { getFileUrl, apiService } from '../api';
import { useState, useEffect } from 'react';
import './TenantFullScreenView.css';

interface OccupancyHistoryRecord {
  occupancyId: number;
  roomId: number;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string | null;
  rentFixed: number | null;
  depositReceived: number | null;
  depositRefunded: number | null;
  charges: number | null;
}

type TenantDetailTab = 'overview' | 'occupancy' | 'payments' | 'media';

interface TenantFullScreenViewProps {
  tenant: TenantWithOccupancy;
  onClose?: () => void;
  onViewPhoto?: (photoIndex: number) => void;
  onViewProof?: (proofIndex: number) => void;
  useAzurePhotos?: boolean;
}

export default function TenantFullScreenView({
  tenant,
  onClose,
  onViewPhoto,
  onViewProof,
}: TenantFullScreenViewProps) {
  const [occupancyHistory, setOccupancyHistory] = useState<OccupancyHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [azurePhotoUrl, setAzurePhotoUrl] = useState<string | null>(tenant.azurePhotoUrl || null);
  const [activeTab, setActiveTab] = useState<TenantDetailTab>('overview');

  useEffect(() => {
    const fetchOccupancyHistory = async () => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await apiService.getTenantOccupancyHistory(tenant.id);
        setOccupancyHistory(response.data);
      } catch (err) {
        setHistoryError('Failed to load occupancy history');
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchOccupancyHistory();
  }, [tenant.id]);

  const currentOccupancyFallback = tenant.isCurrentlyOccupied
    ? {
        occupancyId: tenant.occupancyId ?? 0,
        roomId: tenant.roomId ?? 0,
        roomNumber: tenant.roomNumber || '',
        checkInDate: tenant.checkInDate || '',
        checkOutDate: tenant.checkOutDate || null,
        rentFixed: tenant.rentFixed ?? null,
        depositReceived: null,
        depositRefunded: null,
        charges: null,
      }
    : null;

  const displayedHistory = occupancyHistory.length > 0
    ? occupancyHistory
    : currentOccupancyFallback
      ? [currentOccupancyFallback]
      : [];

  const mainPhotoUrl = azurePhotoUrl || (tenant.photoUrl ? getFileUrl(tenant.photoUrl) : null);

  const getTenantPhotos = (tenant: TenantWithOccupancy): string[] =>
    [
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

  const getTenantProofs = (tenant: TenantWithOccupancy): string[] =>
    [
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

  const photos = getTenantPhotos(tenant);
  const proofs = getTenantProofs(tenant);

  const formatCurrency = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return '₹0';
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const tabs: { id: TenantDetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'occupancy', label: 'Occupancy' },
    { id: 'payments', label: 'Payments' },
    { id: 'media', label: 'Media' },
  ];

  return (
    <div className="fullscreen-container">
      <div className="fullscreen-content">
        <div className="fullscreen-header">
          <div className="fullscreen-title-section">
            {mainPhotoUrl && (
              <div className="fullscreen-main-photo">
                <img
                  src={mainPhotoUrl}
                  alt={tenant.name}
                  loading="lazy"
                  onError={(e) => {
                    console.error('Failed to load image:', e);
                    if (azurePhotoUrl && tenant.photoUrl) {
                      setAzurePhotoUrl(null);
                    }
                  }}
                />
              </div>
            )}
            <div className="fullscreen-header-copy">
              <span className="fullscreen-kicker">Tenant Profile</span>
              <h1>{tenant.name}</h1>
              <div className="fullscreen-header-meta">
                <span className={`occupancy-status-badge ${tenant.isCurrentlyOccupied ? 'occupied' : 'vacant'}`}>
                  {tenant.isCurrentlyOccupied ? 'Currently Occupied' : 'Vacant'}
                </span>
                <span className="detail-pill">{tenant.roomNumber ? `Room ${tenant.roomNumber}` : 'No room assigned'}</span>
                <span className="detail-pill">{tenant.phone || 'No phone number'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="fullscreen-close-btn"
            aria-label="Close full screen view"
            title="Close"
            onClick={() => onClose?.()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="fullscreen-tabs" role="tablist" aria-label="Tenant details tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`fullscreen-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="fullscreen-body">
          {activeTab === 'overview' && (
            <div className="tab-panel">
              <div className="overview-grid">
                <div className="fullscreen-section">
                  <h3>Personal information</h3>
                  <div className="fullscreen-grid">
                    <div className="fullscreen-field">
                      <label>Phone</label>
                      <p>{tenant.phone || 'N/A'}</p>
                    </div>
                    <div className="fullscreen-field">
                      <label>City</label>
                      <p>{tenant.city || 'N/A'}</p>
                    </div>
                    <div className="fullscreen-field full-width">
                      <label>Address</label>
                      <p>{tenant.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="fullscreen-section">
                  <h3>Current occupancy</h3>
                  <div className="fullscreen-grid">
                    <div className="fullscreen-field">
                      <label>Room</label>
                      <p>{tenant.roomNumber || 'Not assigned'}</p>
                    </div>
                    <div className="fullscreen-field">
                      <label>Check-in</label>
                      <p>{formatDate(tenant.checkInDate)}</p>
                    </div>
                    <div className="fullscreen-field">
                      <label>Check-out</label>
                      <p>{formatDate(tenant.checkOutDate)}</p>
                    </div>
                    <div className="fullscreen-field">
                      <label>Rent fixed</label>
                      <p>{formatCurrency(tenant.rentFixed)}</p>
                    </div>
                    <div className="fullscreen-field">
                      <label>Deposit received</label>
                      <p>{formatCurrency(tenant.depositReceived)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-stat-grid">
                <div className="overview-stat-card">
                  <span className="overview-stat-label">Current status</span>
                  <strong>{tenant.isCurrentlyOccupied ? 'Occupied' : 'Vacant'}</strong>
                </div>
                <div className="overview-stat-card">
                  <span className="overview-stat-label">Amount received</span>
                  <strong>{formatCurrency(tenant.currentRentReceived)}</strong>
                </div>
                <div className="overview-stat-card">
                  <span className="overview-stat-label">Amount pending</span>
                  <strong>{formatCurrency(tenant.currentPendingPayment)}</strong>
                </div>
                <div className="overview-stat-card">
                  <span className="overview-stat-label">Last payment</span>
                  <strong>{formatDate(tenant.lastPaymentDate)}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'occupancy' && (
            <div className="tab-panel">
              <div className="fullscreen-section history-section">
                <div className="history-header">
                  <div>
                    <h3>Room history</h3>
                    <p className="history-note">All check-ins and check-outs for this tenant.</p>
                  </div>
                </div>

                {loadingHistory && <p>Loading occupancy history...</p>}
                {historyError && <p className="form-error">{historyError}</p>}
                {!loadingHistory && !historyError && displayedHistory.length === 0 && (
                  <p>No occupancy history found for this tenant.</p>
                )}

                {!loadingHistory && !historyError && displayedHistory.length > 0 && (
                  <div className="table-wrapper">
                    <table className="occupancy-history-table">
                      <thead>
                        <tr>
                          <th>Room</th>
                          <th>Status</th>
                          <th>Check-in</th>
                          <th>Check-out</th>
                          <th>Rent</th>
                          <th>Deposit</th>
                          <th>Refunded</th>
                          <th>Charges</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedHistory.map((record) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const checkOutDate = record.checkOutDate ? new Date(record.checkOutDate) : null;
                          if (checkOutDate) checkOutDate.setHours(0, 0, 0, 0);
                          const isCurrent = !record.checkOutDate || !record.checkOutDate.trim() || (checkOutDate && checkOutDate > today);

                          return (
                            <tr key={record.occupancyId} className={isCurrent ? 'current-occupancy-row' : undefined}>
                              <td>{record.roomNumber || (record.roomId ? `Room ${record.roomId}` : 'N/A')}</td>
                              <td>
                                <span className={`history-status-badge ${isCurrent ? 'currently-checked-in' : 'checked-out'}`}>
                                  {isCurrent ? 'Currently checked in' : 'Checked out'}
                                </span>
                              </td>
                              <td>{formatDate(record.checkInDate)}</td>
                              <td>{record.checkOutDate ? formatDate(record.checkOutDate) : '—'}</td>
                              <td>{record.rentFixed != null ? formatCurrency(record.rentFixed) : 'N/A'}</td>
                              <td>{record.depositReceived != null ? formatCurrency(record.depositReceived) : 'N/A'}</td>
                              <td>{record.depositRefunded != null ? formatCurrency(record.depositRefunded) : 'N/A'}</td>
                              <td>{record.charges != null ? formatCurrency(record.charges) : 'N/A'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="tab-panel">
              <div className="fullscreen-section">
                <h3>Payment summary</h3>
                <div className="payment-summary-grid">
                  <div className="summary-tile summary-received">
                    <span>Received</span>
                    <strong>{formatCurrency(tenant.currentRentReceived)}</strong>
                  </div>
                  <div className="summary-tile summary-pending">
                    <span>Pending</span>
                    <strong>{formatCurrency(tenant.currentPendingPayment)}</strong>
                  </div>
                  <div className="summary-tile summary-deposit">
                    <span>Deposit</span>
                    <strong>{formatCurrency(tenant.depositReceived)}</strong>
                  </div>
                  <div className="summary-tile summary-date">
                    <span>Last payment</span>
                    <strong>{formatDate(tenant.lastPaymentDate)}</strong>
                  </div>
                </div>
              </div>

              <div className="fullscreen-section">
                <h3>Payment details</h3>
                <div className="fullscreen-grid">
                  <div className="fullscreen-field">
                    <label>Current month received</label>
                    <p className="payment-received">{formatCurrency(tenant.currentRentReceived)}</p>
                  </div>
                  <div className="fullscreen-field">
                    <label>Current month pending</label>
                    <p className={tenant.currentPendingPayment && tenant.currentPendingPayment > 0 ? 'payment-pending' : 'payment-cleared'}>
                      {formatCurrency(tenant.currentPendingPayment)}
                    </p>
                  </div>
                  <div className="fullscreen-field">
                    <label>Rent fixed</label>
                    <p>{formatCurrency(tenant.rentFixed)}</p>
                  </div>
                  <div className="fullscreen-field">
                    <label>Last payment date</label>
                    <p>{formatDate(tenant.lastPaymentDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="tab-panel">
              <div className="fullscreen-section">
                <h3>Photos</h3>
                {photos.length > 0 ? (
                  <div className="fullscreen-photos-grid">
                    {photos.map((photo, idx) => (
                      <img
                        key={`photo-${idx}`}
                        src={getFileUrl(photo)}
                        alt={`Photo ${idx + 1}`}
                        loading="lazy"
                        onClick={() => onViewPhoto?.(idx)}
                        title="Click to view full size"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="empty-media-state">No photos uploaded for this tenant.</p>
                )}
              </div>

              <div className="fullscreen-section">
                <h3>Proofs & documents</h3>
                {proofs.length > 0 ? (
                  <div className="fullscreen-proofs-grid">
                    {proofs.map((proof, idx) => (
                      <div
                        key={`proof-${idx}`}
                        className="proof-item"
                        onClick={() => onViewProof?.(idx)}
                        title="Click to view full size"
                      >
                        <img src={getFileUrl(proof)} alt={`Proof ${idx + 1}`} loading="lazy" />
                        <span>Proof {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-media-state">No proofs or documents uploaded for this tenant.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
