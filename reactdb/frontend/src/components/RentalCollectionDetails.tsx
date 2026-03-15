import { useState, useEffect } from 'react';
import { apiService, getFileUrl } from '../api';
import SearchableDropdown from './SearchableDropdown';
import './RentalCollectionDetails.css';

interface OccupancyInfo {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  rentFixed: number;
  totalRentReceived: number;
  totalCharges: number;
  paymentRecordsCount: number;
  lastPaymentDate: string | null;
  checkInDate: string;
  checkOutDate: string | null;
}

interface RentalRecord {
  id: number;
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  rentFixed: number;
  rentReceivedOn: string;
  rentReceived: number;
  charges: number;
  rentBalance: number;
  modeOfPayment: string | null;
  screenshotUrl: string | null;
  folder: string | null;
  createdDate: string;
  updatedDate: string | null;
}

interface OccupancyOption {
  id: number;
  label: string;
}

interface FormData {
  rentReceived: string;
  charges: string;
  modeOfPayment: string;
  rentReceivedOn: string;
  screenshot: File | null;
}

export default function RentalCollectionDetails() {
  const [occupancyOptions, setOccupancyOptions] = useState<OccupancyOption[]>([]);
  const [selectedOccupancyId, setSelectedOccupancyId] = useState<number | null>(null);
  const [occupancyInfo, setOccupancyInfo] = useState<OccupancyInfo | null>(null);
  const [rentalRecords, setRentalRecords] = useState<RentalRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<RentalRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<RentalRecord & { screenshot: File | null }>>({});
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    rentReceived: '',
    charges: '',
    modeOfPayment: 'cash',
    rentReceivedOn: new Date().toISOString().split('T')[0],
    screenshot: null
  });

  // Load occupancy options on mount
  useEffect(() => {
    fetchOccupancies();
  }, []);

  const fetchOccupancies = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOccupancyLinks();
      const occupancies = response.data || response;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const optionsWithDates = occupancies.map((occupancy: any) => {
        const checkInDate = new Date(occupancy.checkInDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        });
        
        let checkOutDate = 'Active';
        let checkOutTime = Infinity; // Active tenants sort first (highest value)
        
        if (occupancy.checkOutDate) {
          const checkOut = new Date(occupancy.checkOutDate);
          checkOut.setHours(0, 0, 0, 0);
          checkOutTime = checkOut.getTime();
          
          if (checkOut < today) {
            checkOutDate = checkOut.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: '2-digit'
            });
          }
        }
        
        return {
          id: occupancy.occupancyId,
          label: `${occupancy.tenantName.trim()} - Room ${occupancy.roomNumber.trim()} (In: ${checkInDate}, Out: ${checkOutDate})`,
          sortKey: checkOutTime
        };
      });
      
      // Sort by checkout date descending (active first, then most recent checkouts)
      const sortedOptions = optionsWithDates.sort((a: any, b: any) => b.sortKey - a.sortKey);
      
      const options = sortedOptions.map(({ id, label }: { id: string; label: string }) => ({ id, label }));
      setOccupancyOptions(options);
    } catch (err) {
      console.error('Error fetching occupancies:', err);
      setError('Failed to load occupancies. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch rental details when occupancy is selected
  useEffect(() => {
    if (selectedOccupancyId) {
      fetchRentalDetails();
    }
  }, [selectedOccupancyId]);

  const fetchRentalDetails = async () => {
    if (!selectedOccupancyId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, recordsRes] = await Promise.all([
        apiService.getRentalSummaryByOccupancy(selectedOccupancyId),
        apiService.getRentalCollectionByOccupancy(selectedOccupancyId)
      ]);
      
      setOccupancyInfo(summaryRes.data || summaryRes);
      setRentalRecords(recordsRes.data || recordsRes || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch rental details';
      setError(errorMsg);
      console.error('Error fetching rental details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        screenshot: file
      }));
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOccupancyId) {
      setError('Please select an occupancy');
      return;
    }

    if (!formData.rentReceived) {
      setError('Rent received amount is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const formDataToSend = new FormData();
      formDataToSend.append('occupancyId', selectedOccupancyId.toString());
      formDataToSend.append('rentReceived', formData.rentReceived);
      formDataToSend.append('charges', formData.charges || '0');
      formDataToSend.append('modeOfPayment', formData.modeOfPayment);
      formDataToSend.append('rentReceivedOn', formData.rentReceivedOn);
      
      if (formData.screenshot) {
        formDataToSend.append('screenshot', formData.screenshot);
      }

      const response = await apiService.uploadPaymentScreenshot(
        formDataToSend,
        setUploadProgress
      );

      // Reset form and refresh data
      setFormData({
        rentReceived: '',
        charges: '',
        modeOfPayment: 'cash',
        rentReceivedOn: new Date().toISOString().split('T')[0],
        screenshot: null
      });
      
      setPreviewUrl(null);
      setShowForm(false);
      setUploadProgress(0);
      
      // Refresh rental details
      await fetchRentalDetails();
      
      // Show success message
      console.log('Payment recorded successfully:', response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload payment';
      setError(errorMsg);
      console.error('Error uploading payment:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const calculateBalance = (index: number): number => {
    const monthlyRecords = rentalRecords.slice(0, index + 1);
    const totalReceived = monthlyRecords.reduce((sum, r) => sum + r.rentReceived, 0);
    const totalCharges = monthlyRecords.reduce((sum, r) => sum + r.charges, 0);
    const totalBalance = occupancyInfo ? (occupancyInfo.rentFixed * (index + 1)) - totalReceived - totalCharges : 0;
    return Math.max(0, totalBalance);
  };

  const handleEditClick = (record: RentalRecord) => {
    setEditingRecord(record);
    setEditFormData({
      rentReceived: record.rentReceived,
      charges: record.charges,
      modeOfPayment: record.modeOfPayment || 'cash',
      rentReceivedOn: new Date(record.rentReceivedOn).toISOString().split('T')[0]
    });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditFormData({});
    setEditPreviewUrl(null);
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFormData(prev => ({
        ...prev,
        screenshot: file
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    try {
      setLoading(true);
      
      // Create FormData for potential file upload
      const updateData = new FormData();
      updateData.append('rentReceived', editFormData.rentReceived?.toString() || '0');
      updateData.append('charges', editFormData.charges?.toString() || '0');
      updateData.append('modeOfPayment', editFormData.modeOfPayment?.toString() || 'cash');
      updateData.append('rentReceivedOn', editFormData.rentReceivedOn?.toString() || '');
      
      if (editFormData.screenshot) {
        updateData.append('screenshot', editFormData.screenshot);
      }

      // Use the updateRentalRecord method with FormData
      const response = await fetch(
        `/api/rental/record/${editingRecord.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: updateData
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update payment record');
      }

      // Refresh rental details
      await fetchRentalDetails();
      
      // Close modal
      handleCancelEdit();
      
      // Show success
      alert('Payment updated successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update payment';
      setError(errorMsg);
      alert(errorMsg);
      console.error('Error updating payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (loading && !occupancyInfo) {
    return (
      <div className="rental-collection-details">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading rental collection details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rental-collection-details">
      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Occupancy Selector */}
      <div className="selector-card">
        <div className="selector-wrapper">
          <label className="selector-label">Select Tenant & Room</label>
          <SearchableDropdown
            value={selectedOccupancyId?.toString() || ''}
            onChange={(option) => setSelectedOccupancyId(parseInt(option.id.toString()))}
            options={occupancyOptions.map(opt => ({
              id: opt.id.toString(),
              label: opt.label
            }))}
            placeholder="Search by tenant name or room number..."
          />
        </div>
      </div>

      {occupancyInfo && (
        <>
          {/* Occupancy Information Card */}
          <div className="occupancy-info-card">
            <div className="info-header">
              <h2>{occupancyInfo.tenantName}</h2>
              <span className="room-badge">Room {occupancyInfo.roomNumber}</span>
            </div>
            
            <div className="info-grid">
              <div className="info-item">
                <label>Check-In Date</label>
                <p>{new Date(occupancyInfo.checkInDate).toLocaleDateString()}</p>
              </div>
              <div className="info-item">
                <label>Check-Out Date</label>
                <p>{occupancyInfo.checkOutDate ? new Date(occupancyInfo.checkOutDate).toLocaleDateString() : 'Active'}</p>
              </div>
              <div className="info-item">
                <label>Monthly Rent</label>
                <p className="amount">{formatCurrency(occupancyInfo.rentFixed)}</p>
              </div>
              <div className="info-item">
                <label>Last Payment Date</label>
                <p>{occupancyInfo.lastPaymentDate ? new Date(occupancyInfo.lastPaymentDate).toLocaleDateString() : 'No payments'}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="summary-cards-grid">
            <div className="summary-card">
              <div className="card-label">Total Rent Received</div>
              <div className="card-value received">{formatCurrency(occupancyInfo.totalRentReceived)}</div>
              <div className="card-subtext">{occupancyInfo.paymentRecordsCount} payment(s)</div>
            </div>
            
            <div className="summary-card">
              <div className="card-label">Total Charges</div>
              <div className="card-value charges">{formatCurrency(occupancyInfo.totalCharges)}</div>
            </div>
            
            <div className="summary-card">
              <div className="card-label">Outstanding Balance (Est.)</div>
              <div className="card-value balance">
                {formatCurrency(Math.max(0, occupancyInfo.rentFixed - (occupancyInfo.totalRentReceived + occupancyInfo.totalCharges)))}
              </div>
            </div>
          </div>

          {/* Add Payment Button */}
          <div className="action-section">
            <button
              className="btn btn-primary btn-large"
              onClick={() => setShowForm(!showForm)}
              disabled={loading}
            >
              {showForm ? '✕ Cancel' : '+ Add Payment'}
            </button>
          </div>

          {/* Payment Form */}
          {showForm && (
            <div className="payment-form-card">
              <h3>Record Payment</h3>
              <form onSubmit={handleSubmit} className="payment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="rentReceivedOn">Payment Date</label>
                    <input
                      type="date"
                      id="rentReceivedOn"
                      name="rentReceivedOn"
                      value={formData.rentReceivedOn}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="rentReceived">Rent Received (₹)</label>
                    <input
                      type="number"
                      id="rentReceived"
                      name="rentReceived"
                      value={formData.rentReceived}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="charges">Charges/Adjustments (₹)</label>
                    <input
                      type="number"
                      id="charges"
                      name="charges"
                      value={formData.charges}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="modeOfPayment">Payment Mode</label>
                    <select
                      id="modeOfPayment"
                      name="modeOfPayment"
                      value={formData.modeOfPayment}
                      onChange={handleInputChange}
                    >
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="upi">UPI</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="screenshot">Payment Proof (Screenshot)</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="screenshot"
                      name="screenshot"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <div className="file-label">
                      {formData.screenshot ? (
                        <>
                          <span className="upload-icon">✓</span>
                          <span className="file-name">{formData.screenshot.name}</span>
                        </>
                      ) : (
                        <>
                          <span className="upload-icon">📷</span>
                          <span>Click to upload or drag and drop</span>
                          <span className="file-hint">PNG, JPG, GIF up to 50MB</span>
                        </>
                      )}
                    </div>
                  </div>

                  {previewUrl && (
                    <div className="preview-container">
                      <p className="preview-label">Preview</p>
                      <img src={previewUrl} alt="Payment proof preview" className="preview-image" />
                    </div>
                  )}
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="progress-text">Uploading... {uploadProgress}%</p>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading || uploadProgress > 0}
                  >
                    {loading ? 'Saving...' : 'Save Payment'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        rentReceived: '',
                        charges: '',
                        modeOfPayment: 'cash',
                        rentReceivedOn: new Date().toISOString().split('T')[0],
                        screenshot: null
                      });
                      setPreviewUrl(null);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payment History Table */}
          <div className="payment-history-section">
            <h3>Payment History & Details Breakdown</h3>
            
            {rentalRecords.length > 0 ? (
              <div className="payment-records-container">
                {rentalRecords.map((record, index) => (
                  <div key={record.id} className="payment-record-card">
                    <div className="payment-record-header">
                      <div className="payment-date">
                        <span className="label">Payment Date</span>
                        <span className="value">
                          {new Date(record.rentReceivedOn).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="payment-mode">
                        <span className="label">Mode</span>
                        {record.modeOfPayment ? (
                          <span className="badge-mode">{record.modeOfPayment}</span>
                        ) : (
                          <span className="badge-mode gray">—</span>
                        )}
                      </div>
                      <button 
                        className="payment-record-edit-btn"
                        title="Edit payment record"
                        onClick={() => handleEditClick(record)}
                      >
                        ✏️ Edit
                      </button>
                    </div>

                    <div className="payment-record-details">
                      <div className="detail-item">
                        <span className="label">Fixed Rent</span>
                        <span className="value">{formatCurrency(record.rentFixed)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Charges</span>
                        <span className="value">{formatCurrency(record.charges)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Received</span>
                        <span className="value received">{formatCurrency(record.rentReceived)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Balance</span>
                        <span className="value balance">{formatCurrency(calculateBalance(index))}</span>
                      </div>
                    </div>

                    {record.screenshotUrl && (
                      <div className="payment-screenshot">
                        <div className="screenshot-label">Payment Proof</div>
                        <a
                          href={getFileUrl(record.screenshotUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="screenshot-link"
                        >
                          <img
                            src={getFileUrl(record.screenshotUrl)}
                            alt="Payment proof screenshot"
                            className="screenshot-thumbnail"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No payment records yet. {showForm ? '' : 'Click "Add Payment" to record the first payment.'}</p>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedOccupancyId && !loading && (
        <div className="empty-state">
          <p>👆 Select a tenant and room to view rental collection details</p>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingRecord && (
        <div className="edit-payment-modal-overlay">
          <div className="edit-payment-modal">
            <button 
              className="modal-close-btn"
              onClick={handleCancelEdit}
              aria-label="Close"
            >
              ✕
            </button>
            
            <h2>Edit Payment Record</h2>
            <p className="modal-subtitle">Occupancy: {editingRecord.tenantName} - Room {editingRecord.roomNumber}</p>
            
            <div className="edit-form-container">
              <div className="edit-form-group">
                <label htmlFor="editRentReceived">Rent Received (₹)</label>
                <input
                  type="number"
                  id="editRentReceived"
                  value={editFormData.rentReceived || ''}
                  onChange={(e) => handleEditFormChange('rentReceived', parseFloat(e.target.value))}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="editCharges">Charges (₹)</label>
                <input
                  type="number"
                  id="editCharges"
                  value={editFormData.charges || ''}
                  onChange={(e) => handleEditFormChange('charges', parseFloat(e.target.value))}
                  placeholder="Enter charges"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="editPaymentDate">Payment Date</label>
                <input
                  type="date"
                  id="editPaymentDate"
                  value={editFormData.rentReceivedOn || ''}
                  onChange={(e) => handleEditFormChange('rentReceivedOn', e.target.value)}
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="editPaymentMode">Mode of Payment</label>
                <select
                  id="editPaymentMode"
                  value={editFormData.modeOfPayment || 'cash'}
                  onChange={(e) => handleEditFormChange('modeOfPayment', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online_payment">Online Payment</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              {editingRecord.screenshotUrl && !editFormData.screenshot && (
                <div className="current-image-section">
                  <h3>Current Payment Proof</h3>
                  <img 
                    src={getFileUrl(editingRecord.screenshotUrl)} 
                    alt="Current payment proof" 
                    className="current-image"
                  />
                  <p className="image-note">Upload a new image below to replace it</p>
                </div>
              )}

              <div className="edit-form-group full-width">
                <label htmlFor="editScreenshot">
                  {editingRecord.screenshotUrl ? 'Replace Payment Proof' : 'Add Payment Proof (Screenshot)'}
                </label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="editScreenshot"
                    name="editScreenshot"
                    accept="image/*"
                    onChange={handleEditFileChange}
                  />
                  <div className="file-label">
                    {editFormData.screenshot ? (
                      <>
                        <span>✓ {editFormData.screenshot.name}</span>
                        <small>Click to change</small>
                      </>
                    ) : (
                      <>
                        <span>📎 {editingRecord.screenshotUrl ? 'Replace' : 'Attach'} Payment Proof</span>
                        <small>JPG, PNG up to 5MB</small>
                      </>
                    )}
                  </div>
                </div>
                {editPreviewUrl && (
                  <div className="file-preview">
                    <h4>New Image Preview</h4>
                    <img src={editPreviewUrl} alt="Payment proof preview" />
                    <button
                      type="button"
                      className="remove-preview-btn"
                      onClick={() => {
                        setEditFormData(prev => ({ ...prev, screenshot: null }));
                        setEditPreviewUrl(null);
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="edit-modal-buttons">
              <button 
                className="edit-save-btn"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
              <button 
                className="edit-cancel-btn"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
