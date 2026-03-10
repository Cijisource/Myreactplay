import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import TenantForm from './TenantForm';
import TenantCard from './TenantCard';
import TenantHeader from './TenantHeader';
import TenantSearchFilters, { SearchField, SortOption } from './TenantSearchFilters';
import TenantFullScreenView from './TenantFullScreenView';
import TenantPhotoGalleryModal from './TenantPhotoGalleryModal';
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
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);
  const [fullscreenProofIndex, setFullscreenProofIndex] = useState<number | null>(null);
  const [fullscreenMediaTab, setFullscreenMediaTab] = useState<'photos' | 'proofs'>('photos');

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
          const tenantPhone = tenant.phone || '';
          const normalizedPhone = normalizePhone(tenantPhone);
          
          if (/^\d+/.test(query)) {
            if (normalizedPhone.includes(normalizedQuery)) return true;
          }
          
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

  const handleViewTenant = (tenant: TenantWithOccupancy) => {
    setFullScreenTenant(tenant);
    setFullscreenPhotoIndex(null);
    setFullscreenProofIndex(null);
    setFullscreenMediaTab('photos');
  };

  const handleCloseFullscreen = () => {
    setFullScreenTenant(null);
    setFullscreenPhotoIndex(null);
    setFullscreenProofIndex(null);
    setFullscreenMediaTab('photos');
  };

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
      <TenantHeader
        totalTenants={stats.totalTenants}
        occupiedTenants={stats.occupiedTenants}
        vacantTenants={stats.vacantTenants}
        onAddTenant={handleAddTenant}
      />

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
      <TenantSearchFilters
        searchQuery={searchQuery}
        searchField={searchField}
        sortBy={sortBy}
        onSearchQueryChange={setSearchQuery}
        onSearchFieldChange={setSearchField}
        onSortByChange={setSortBy}
        onClearSearch={() => setSearchQuery('')}
      />

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
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onView={handleViewTenant}
              onEdit={handleEditTenant}
              onDeleteClick={setShowDeleteConfirm}
              onDeleteConfirm={handleDeleteTenant}
              showDeleteConfirm={showDeleteConfirm}
            />
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
        <>
          {/* Main Tenant View */}
          <TenantFullScreenView
            tenant={fullScreenTenant}
          />

          {/* Photo Gallery Modal (overlays on top) */}
          {(fullscreenPhotoIndex !== null || fullscreenProofIndex !== null) && (
            <TenantPhotoGalleryModal
              tenant={fullScreenTenant}
              onClose={handleCloseFullscreen}
              initialPhotoIndex={fullscreenPhotoIndex}
              initialProofIndex={fullscreenProofIndex}
              initialTab={fullscreenMediaTab}
            />
          )}
        </>
      )}
    </div>
  );
}
