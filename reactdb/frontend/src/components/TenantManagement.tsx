import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import TenantForm from './TenantForm';
import './TenantManagement.css';

export interface Tenant {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  photoUrl: string | null;
  proof1Url: string | null;
  proof2Url: string | null;
  proof3Url: string | null;
}

export interface TenantWithOccupancy extends Tenant {
  occupancyId?: number;
  roomNumber?: string;
  roomId?: number;
  checkInDate?: string;
  checkOutDate?: string | null;
  rentFixed?: number;
  isCurrentlyOccupied?: boolean;
  currentPendingPayment?: number;
  currentRentReceived?: number;
  lastPaymentDate?: string;
}

type SearchField = 'all' | 'name' | 'phone' | 'city' | 'address';
type SortOption = 'name-asc' | 'name-desc' | 'phone-asc' | 'city-asc' | 'recently-added';

export default function TenantManagement() {
  const [tenants, setTenants] = useState<TenantWithOccupancy[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<TenantWithOccupancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithOccupancy | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper function to normalize phone numbers
  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/[\s\-()+.]/g, '').toLowerCase();
  };

  // Fetch tenants with occupancy details
  useEffect(() => {
    fetchTenants();
  }, []);

  // Filter tenants based on search query
  useEffect(() => {
    const filtered = tenants.filter((tenant) => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.trim();
      const lowerQuery = query.toLowerCase();
      const normalizedQuery = normalizePhone(query);
      
      switch (searchField) {
        case 'name':
          return tenant.name.toLowerCase().includes(lowerQuery);
        case 'phone': {
          // Phone search: both normalized (digits only) and as-is with case-insensitive
          const tenantPhone = tenant.phone || '';
          const normalizedPhone = normalizePhone(tenantPhone);
          
          // Try normalized search if query contains mostly digits
          if (/^\d+/.test(query)) {
            if (normalizedPhone.includes(normalizedQuery)) return true;
          }
          
          // Also try case-insensitive literal search
          return tenantPhone.toLowerCase().includes(lowerQuery);
        }
        case 'city':
          return tenant.city.toLowerCase().includes(lowerQuery);
        case 'address':
          return tenant.address.toLowerCase().includes(lowerQuery);
        case 'all':
        default: {
          const tenantPhone = tenant.phone || '';
          const normalizedPhone = normalizePhone(tenantPhone);
          
          return (
            tenant.name.toLowerCase().includes(lowerQuery) ||
            tenantPhone.toLowerCase().includes(lowerQuery) ||
            (/^\d+/.test(query) && normalizedPhone.includes(normalizedQuery)) ||
            tenant.city.toLowerCase().includes(lowerQuery) ||
            tenant.address.toLowerCase().includes(lowerQuery)
          );
        }
      }
    });
    setFilteredTenants(filtered);
  }, [searchQuery, searchField, tenants]);

  // Sort filtered tenants
  const sortedAndFilteredTenants = useMemo(() => {
    const sorted = [...filteredTenants];
    
    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'phone-asc':
        return sorted.sort((a, b) => a.phone.localeCompare(b.phone));
      case 'city-asc':
        return sorted.sort((a, b) => a.city.localeCompare(b.city));
      case 'recently-added':
        return sorted;
      default:
        return sorted;
    }
  }, [filteredTenants, sortBy]);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAllTenantsWithOccupancy();
      setTenants(response.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch tenants';
      setError(errorMsg);
      console.error('Error fetching tenants:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = () => {
    setEditingTenant(null);
    setShowForm(true);
  };

  const handleEditTenant = (tenant: TenantWithOccupancy) => {
    setEditingTenant(tenant);
    setShowForm(true);
  };

  const handleDeleteTenant = async (tenantId: number) => {
    try {
      await apiService.deleteTenant(tenantId);
      setShowDeleteConfirm(null);
      setSuccessMessage('Tenant deleted successfully');
      await fetchTenants();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete tenant';
      setError(errorMsg);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTenant(null);
  };

  const handleFormSubmit = async (
    formData: Omit<TenantWithOccupancy, 'id'>
  ) => {
    try {
      if (editingTenant) {
        await apiService.updateTenant(editingTenant.id, formData);
        setSuccessMessage('Tenant updated successfully');
      } else {
        await apiService.createTenant(formData);
        setSuccessMessage('Tenant created successfully');
      }
      handleFormClose();
      await fetchTenants();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save tenant';
      setError(errorMsg);
    }
  };

  const searchFieldOptions: { value: SearchField; label: string }[] = [
    { value: 'all', label: 'All Fields' },
    { value: 'name', label: 'Name' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'city', label: 'City' },
    { value: 'address', label: 'Address' },
  ];

  const stats = useMemo(() => {
    return {
      totalTenants: tenants.length,
      occupiedTenants: tenants.filter((t) => t.isCurrentlyOccupied).length,
      vacantTenants: tenants.filter((t) => !t.isCurrentlyOccupied).length,
    };
  }, [tenants]);

  return (
    <div className="tenant-management-container">
      {/* Header with Stats and Create Button */}
      <div className="tenant-header">
        <div className="tenant-stats">
          <div className="stat-card">
            <div className="stat-label">Total Tenants</div>
            <div className="stat-value">{stats.totalTenants}</div>
          </div>
          <div className="stat-card occupied">
            <div className="stat-label">Occupied Rooms</div>
            <div className="stat-value">{stats.occupiedTenants}</div>
          </div>
          <div className="stat-card vacant">
            <div className="stat-label">Vacant Rooms</div>
            <div className="stat-value">{stats.vacantTenants}</div>
          </div>
        </div>
        <button className="btn-primary btn-create" onClick={handleAddTenant}>
          + Add New Tenant
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder={searchField === 'phone' ? 'Search phone numbers...' : 'Search tenants...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="filter-container">
          <label htmlFor="search-field">Search by:</label>
          <select
            id="search-field"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
            className="search-field-select"
          >
            {searchFieldOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sort-container">
          <label htmlFor="sort-by">Sort by:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="sort-select"
          >
            <option value="name-asc">Name (A→Z)</option>
            <option value="name-desc">Name (Z→A)</option>
            <option value="phone-asc">Phone Number</option>
            <option value="city-asc">City</option>
            <option value="recently-added">Recently Added</option>
          </select>
        </div>
        {searchQuery && (
          <button
            className="btn-secondary btn-clear"
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading tenants...</p>
        </div>
      )}

      {/* Tenants Grid */}
      {!loading && sortedAndFilteredTenants.length > 0 && (
        <div className="tenants-grid">
          {sortedAndFilteredTenants.map((tenant) => (
            <div key={tenant.id} className="tenant-card">
              {/* Tenant Image */}
              <div className="tenant-image-container">
                {tenant.photoUrl ? (
                  <img
                    src={tenant.photoUrl}
                    alt={tenant.name}
                    className="tenant-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Ccircle cx="100" cy="70" r="40" fill="%23ccc"/%3E%3Cpath d="M20 200 Q20 140 100 140 Q180 140 180 200" fill="%23ccc"/%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="tenant-avatar">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
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
                      <span className="room-value">₹{tenant.rentFixed?.toLocaleString()}</span>
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
                        <span className="payment-amount">₹{tenant.currentRentReceived?.toLocaleString() || '0'}</span>
                      </div>
                      <div className={`payment-item ${tenant.currentPendingPayment && tenant.currentPendingPayment > 0 ? 'pending' : 'cleared'}`}>
                        <span className="payment-label">Pending</span>
                        <span className="payment-amount">₹{tenant.currentPendingPayment?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                    {tenant.lastPaymentDate && (
                      <div className="last-payment">
                        <span className="payment-label">Last Payment:</span>
                        <span className="payment-date">{new Date(tenant.lastPaymentDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="tenant-actions">
                <button
                  className="btn-secondary btn-edit"
                  onClick={() => handleEditTenant(tenant)}
                >
                  ✎ Edit
                </button>
                <button
                  className="btn-danger btn-delete"
                  onClick={() => setShowDeleteConfirm(tenant.id)}
                >
                  🗑 Delete
                </button>
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm === tenant.id && (
                <div className="delete-confirmation">
                  <p>Are you sure you want to delete this tenant?</p>
                  <div className="confirmation-buttons">
                    <button
                      className="btn-confirm"
                      onClick={() => handleDeleteTenant(tenant.id)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedAndFilteredTenants.length === 0 && tenants.length > 0 && (
        <div className="empty-state">
          <p>No tenants found matching your search criteria</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setSearchField('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* No Tenants State */}
      {!loading && tenants.length === 0 && !error && (
        <div className="empty-state">
          <p>No tenants found. Start by adding a new tenant.</p>
          <button className="btn-primary" onClick={handleAddTenant}>
            + Add First Tenant
          </button>
        </div>
      )}

      {/* Tenant Form Modal */}
      {showForm && (
        <TenantForm
          tenant={editingTenant}
          onSubmit={handleFormSubmit}
          onCancel={handleFormClose}
        />
      )}
    </div>
  );
}
