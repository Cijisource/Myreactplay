import { useState, useEffect, useMemo } from 'react';
import { apiService, getFileUrl } from '../api';
import TenantForm from './TenantForm';
import './TenantManagement.css';

export interface Tenant {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  photoUrl: string | null;
  photo2Url?: string | null;
  photo3Url?: string | null;
  photo4Url?: string | null;
  photo5Url?: string | null;
  photo6Url?: string | null;
  photo7Url?: string | null;
  photo8Url?: string | null;
  photo9Url?: string | null;
  photo10Url?: string | null;
  proof1Url: string | null;
  proof2Url: string | null;
  proof3Url: string | null;
  proof4Url?: string | null;
  proof5Url?: string | null;
  proof6Url?: string | null;
  proof7Url?: string | null;
  proof8Url?: string | null;
  proof9Url?: string | null;
  proof10Url?: string | null;
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

type SearchField = 'all' | 'name' | 'phone' | 'city' | 'address' | 'room';
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
  const [fullScreenTenant, setFullScreenTenant] = useState<TenantWithOccupancy | null>(null);

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
        case 'room':
          return (tenant.roomNumber || '').toLowerCase().includes(lowerQuery);
        case 'all':
        default: {
          const tenantPhone = tenant.phone || '';
          const normalizedPhone = normalizePhone(tenantPhone);
          const roomNumber = tenant.roomNumber || '';
          
          return (
            tenant.name.toLowerCase().includes(lowerQuery) ||
            tenantPhone.toLowerCase().includes(lowerQuery) ||
            (/^\d+/.test(query) && normalizedPhone.includes(normalizedQuery)) ||
            tenant.city.toLowerCase().includes(lowerQuery) ||
            tenant.address.toLowerCase().includes(lowerQuery) ||
            roomNumber.toLowerCase().includes(lowerQuery)
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
      console.log('Fetched tenants with occupancy details:', response.data);
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
    { value: 'room', label: 'Room Number' },
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
                    src={getFileUrl(tenant.photoUrl)}
                    alt={tenant.name}
                    className="tenant-image"
                    loading="lazy"
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

              {/* Tenant Photos Gallery */}
              {(tenant.photoUrl || tenant.photo2Url || tenant.photo3Url || tenant.photo4Url || tenant.photo5Url || tenant.photo6Url || tenant.photo7Url || tenant.photo8Url || tenant.photo9Url || tenant.photo10Url) && (
                <div className="tenant-photos-section">
                  <div className="section-title-row">
                    <h4>Photos</h4>
                    <span className="file-count-badge">
                      {[tenant.photoUrl, tenant.photo2Url, tenant.photo3Url, tenant.photo4Url, tenant.photo5Url, tenant.photo6Url, tenant.photo7Url, tenant.photo8Url, tenant.photo9Url, tenant.photo10Url].filter(Boolean).length}
                    </span>
                  </div>
                  <div className="photos-gallery">
                    {tenant.photoUrl && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photoUrl)}
                          alt="Photo 1"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 1%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 1</span>
                      </div>
                    )}
                    {tenant.photo2Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo2Url)}
                          alt="Photo 2"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 2%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 2</span>
                      </div>
                    )}
                    {tenant.photo3Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo3Url)}
                          alt="Photo 3"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 3%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 3</span>
                      </div>
                    )}
                    {tenant.photo4Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo4Url)}
                          alt="Photo 4"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 4%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 4</span>
                      </div>
                    )}
                    {tenant.photo5Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo5Url)}
                          alt="Photo 5"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 5%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 5</span>
                      </div>
                    )}
                    {tenant.photo6Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo6Url)}
                          alt="Photo 6"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 6%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 6</span>
                      </div>
                    )}
                    {tenant.photo7Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo7Url)}
                          alt="Photo 7"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 7%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 7</span>
                      </div>
                    )}
                    {tenant.photo8Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo8Url)}
                          alt="Photo 8"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 8%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 8</span>
                      </div>
                    )}
                    {tenant.photo9Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo9Url)}
                          alt="Photo 9"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 9%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 9</span>
                      </div>
                    )}
                    {tenant.photo10Url && (
                      <div className="photo-item-with-label">
                        <img
                          src={getFileUrl(tenant.photo10Url)}
                          alt="Photo 10"
                          className="gallery-photo"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EPhoto 10%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="photo-label">Photo 10</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tenant Documents/Proofs */}
              {(tenant.proof1Url || tenant.proof2Url || tenant.proof3Url || tenant.proof4Url || tenant.proof5Url || tenant.proof6Url || tenant.proof7Url || tenant.proof8Url || tenant.proof9Url || tenant.proof10Url) && (
                <div className="tenant-documents">
                  <div className="section-title-row">
                    <h4>Documents & Proof</h4>
                    <span className="file-count-badge">
                      {[tenant.proof1Url, tenant.proof2Url, tenant.proof3Url, tenant.proof4Url, tenant.proof5Url, tenant.proof6Url, tenant.proof7Url, tenant.proof8Url, tenant.proof9Url, tenant.proof10Url].filter(Boolean).length}
                    </span>
                  </div>
                  <div className="documents-gallery">
                    {tenant.proof1Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof1Url)}
                            alt="Proof Document 1"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 1%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 1</span>
                      </div>
                    )}
                    {tenant.proof2Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof2Url)}
                            alt="Proof Document 2"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 2%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 2</span>
                      </div>
                    )}
                    {tenant.proof3Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof3Url)}
                            alt="Proof Document 3"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 3%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 3</span>
                      </div>
                    )}
                    {tenant.proof4Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof4Url)}
                            alt="Proof Document 4"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 4%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 4</span>
                      </div>
                    )}
                    {tenant.proof5Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof5Url)}
                            alt="Proof Document 5"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 5%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 5</span>
                      </div>
                    )}
                    {tenant.proof6Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof6Url)}
                            alt="Proof Document 6"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 6%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 6</span>
                      </div>
                    )}
                    {tenant.proof7Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof7Url)}
                            alt="Proof Document 7"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 7%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 7</span>
                      </div>
                    )}
                    {tenant.proof8Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof8Url)}
                            alt="Proof Document 8"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 8%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 8</span>
                      </div>
                    )}
                    {tenant.proof9Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof9Url)}
                            alt="Proof Document 9"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 9%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 9</span>
                      </div>
                    )}
                    {tenant.proof10Url && (
                      <div className="document-item">
                        <div className="document-image-wrapper">
                          <img
                            src={getFileUrl(tenant.proof10Url)}
                            alt="Proof Document 10"
                            className="document-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e0e0"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EDocument 10%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <span className="document-label">Proof 10</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  className="btn-primary"
                  onClick={() => setFullScreenTenant(tenant)}
                >
                  👁 View
                </button>
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

      {/* Full Screen Tenant View */}
      {fullScreenTenant && (
        <div className="fullscreen-overlay" onClick={() => setFullScreenTenant(null)}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="fullscreen-close-btn"
              onClick={() => setFullScreenTenant(null)}
              title="Close (ESC)"
            >
              ✕
            </button>

            <div className="fullscreen-header">
              <div className="fullscreen-title-section">
                <h1>{fullScreenTenant.name}</h1>
                {fullScreenTenant.photoUrl && (
                  <div className="fullscreen-main-photo">
                    <img
                      src={getFileUrl(fullScreenTenant.photoUrl)}
                      alt={fullScreenTenant.name}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="fullscreen-body">
              {/* Basic Information */}
              <div className="fullscreen-section">
                <h3>Personal Information</h3>
                <div className="fullscreen-grid">
                  <div className="fullscreen-field">
                    <label>Phone</label>
                    <p>{fullScreenTenant.phone}</p>
                  </div>
                  <div className="fullscreen-field">
                    <label>City</label>
                    <p>{fullScreenTenant.city}</p>
                  </div>
                  <div className="fullscreen-field">
                    <label>Address</label>
                    <p>{fullScreenTenant.address}</p>
                  </div>
                  {fullScreenTenant.isCurrentlyOccupied && (
                    <>
                      <div className="fullscreen-field">
                        <label>Room Number</label>
                        <p>{fullScreenTenant.roomNumber || 'N/A'}</p>
                      </div>
                      <div className="fullscreen-field">
                        <label>Check-in Date</label>
                        <p>{fullScreenTenant.checkInDate ? new Date(fullScreenTenant.checkInDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      {fullScreenTenant.rentFixed && (
                        <div className="fullscreen-field">
                          <label>Rent Fixed</label>
                          <p>₹{fullScreenTenant.rentFixed.toLocaleString()}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* All Photos Gallery */}
              {(fullScreenTenant.photoUrl || fullScreenTenant.photo2Url || fullScreenTenant.photo3Url || fullScreenTenant.photo4Url || fullScreenTenant.photo5Url || fullScreenTenant.photo6Url || fullScreenTenant.photo7Url || fullScreenTenant.photo8Url || fullScreenTenant.photo9Url || fullScreenTenant.photo10Url) && (
                <div className="fullscreen-section">
                  <h3>Photos</h3>
                  <div className="fullscreen-photos-grid">
                    {fullScreenTenant.photoUrl && (
                      <img src={getFileUrl(fullScreenTenant.photoUrl)} alt="Photo 1" loading="lazy" />
                    )}
                    {fullScreenTenant.photo2Url && (
                      <img src={getFileUrl(fullScreenTenant.photo2Url)} alt="Photo 2" loading="lazy" />
                    )}
                    {fullScreenTenant.photo3Url && (
                      <img src={getFileUrl(fullScreenTenant.photo3Url)} alt="Photo 3" loading="lazy" />
                    )}
                    {fullScreenTenant.photo4Url && (
                      <img src={getFileUrl(fullScreenTenant.photo4Url)} alt="Photo 4" loading="lazy" />
                    )}
                    {fullScreenTenant.photo5Url && (
                      <img src={getFileUrl(fullScreenTenant.photo5Url)} alt="Photo 5" loading="lazy" />
                    )}
                    {fullScreenTenant.photo6Url && (
                      <img src={getFileUrl(fullScreenTenant.photo6Url)} alt="Photo 6" loading="lazy" />
                    )}
                    {fullScreenTenant.photo7Url && (
                      <img src={getFileUrl(fullScreenTenant.photo7Url)} alt="Photo 7" loading="lazy" />
                    )}
                    {fullScreenTenant.photo8Url && (
                      <img src={getFileUrl(fullScreenTenant.photo8Url)} alt="Photo 8" loading="lazy" />
                    )}
                    {fullScreenTenant.photo9Url && (
                      <img src={getFileUrl(fullScreenTenant.photo9Url)} alt="Photo 9" loading="lazy" />
                    )}
                    {fullScreenTenant.photo10Url && (
                      <img src={getFileUrl(fullScreenTenant.photo10Url)} alt="Photo 10" loading="lazy" />
                    )}
                  </div>
                </div>
              )}

              {/* All Proofs Gallery */}
              {(fullScreenTenant.proof1Url || fullScreenTenant.proof2Url || fullScreenTenant.proof3Url || fullScreenTenant.proof4Url || fullScreenTenant.proof5Url || fullScreenTenant.proof6Url || fullScreenTenant.proof7Url || fullScreenTenant.proof8Url || fullScreenTenant.proof9Url || fullScreenTenant.proof10Url) && (
                <div className="fullscreen-section">
                  <h3>Documents & Proofs</h3>
                  <div className="fullscreen-proofs-grid">
                    {fullScreenTenant.proof1Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof1Url)} alt="Proof 1" loading="lazy" />
                        <span>Proof 1</span>
                      </div>
                    )}
                    {fullScreenTenant.proof2Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof2Url)} alt="Proof 2" loading="lazy" />
                        <span>Proof 2</span>
                      </div>
                    )}
                    {fullScreenTenant.proof3Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof3Url)} alt="Proof 3" loading="lazy" />
                        <span>Proof 3</span>
                      </div>
                    )}
                    {fullScreenTenant.proof4Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof4Url)} alt="Proof 4" loading="lazy" />
                        <span>Proof 4</span>
                      </div>
                    )}
                    {fullScreenTenant.proof5Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof5Url)} alt="Proof 5" loading="lazy" />
                        <span>Proof 5</span>
                      </div>
                    )}
                    {fullScreenTenant.proof6Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof6Url)} alt="Proof 6" loading="lazy" />
                        <span>Proof 6</span>
                      </div>
                    )}
                    {fullScreenTenant.proof7Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof7Url)} alt="Proof 7" loading="lazy" />
                        <span>Proof 7</span>
                      </div>
                    )}
                    {fullScreenTenant.proof8Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof8Url)} alt="Proof 8" loading="lazy" />
                        <span>Proof 8</span>
                      </div>
                    )}
                    {fullScreenTenant.proof9Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof9Url)} alt="Proof 9" loading="lazy" />
                        <span>Proof 9</span>
                      </div>
                    )}
                    {fullScreenTenant.proof10Url && (
                      <div className="proof-item">
                        <img src={getFileUrl(fullScreenTenant.proof10Url)} alt="Proof 10" loading="lazy" />
                        <span>Proof 10</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="fullscreen-footer">
              <button 
                className="btn-secondary"
                onClick={() => setFullScreenTenant(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
