import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../api';
import SearchableDropdown from './SearchableDropdown';
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
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to normalize phone numbers
  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/[\s\-()+.]/g, '').toLowerCase();
  };

  // Fetch tenants with occupancy details
  useEffect(() => {
    fetchTenants();
  }, []);

  // Filter tenants based on search query and room filter
  useEffect(() => {
    const filtered = tenants.filter((tenant) => {
      // Apply room filter first
      if (selectedRoom) {
        // Normalize room numbers for comparison: remove whitespace, handle numbers
        const tenantRoom = tenant.roomNumber ? String(tenant.roomNumber).trim() : '';
        const selectedRoomValue = String(selectedRoom).trim();
        
        // Try exact match first
        let isMatch = tenantRoom === selectedRoomValue;
        
        // Also try numeric comparison if both are numeric
        if (!isMatch && !isNaN(Number(tenantRoom)) && !isNaN(Number(selectedRoomValue))) {
          isMatch = Number(tenantRoom) === Number(selectedRoomValue);
        }
        
        if (!isMatch) {
          return false;  // Exclude if room doesn't match
        }
      }

      // If no search query, include tenant (already passed room filter if applicable)
      if (!searchQuery.trim()) return true;
      
      // Apply search filters only if search query exists
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
          return (tenant.roomNumber || '').toString().toLowerCase().includes(lowerQuery);
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
            roomNumber.toString().toLowerCase().includes(lowerQuery)
          );
        }
      }
    });
    setFilteredTenants(filtered);
  }, [searchQuery, searchField, tenants, selectedRoom]);

  // Generate available room options
  const roomOptions = useMemo(() => {
    const uniqueRooms = new Set<string>();
    tenants.forEach((t) => {
      if (t.roomNumber) {
        // Convert to string and trim to ensure consistent format
        const room = String(t.roomNumber).trim();
        if (room) {  // Also check that it's not an empty string after trimming
          uniqueRooms.add(room);
        }
      }
    });
    
    // Sort rooms numerically if they're all numbers, otherwise alphabetically
    const sortedRooms = Array.from(uniqueRooms).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      // If both can be parsed as numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Otherwise sort alphabetically
      return a.localeCompare(b);
    });

    // Create dropdown options with room, and count tenants in each room
    return sortedRooms.map((room) => {
      const tenantCount = tenants.filter(t => {
        const tenantRoom = t.roomNumber ? String(t.roomNumber).trim() : '';
        return tenantRoom === room;
      }).length;
      
      return {
        id: room,
        label: `Room ${room} (${tenantCount})`,
      };
    });
  }, [tenants]);

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
      // Normalize room numbers by trimming whitespace - ensures consistency
      const normalizedTenants = response.data.map((tenant: TenantWithOccupancy) => ({
        ...tenant,
        roomNumber: tenant.roomNumber ? String(tenant.roomNumber).trim() : tenant.roomNumber,
      }));
      
      // Remove duplicate tenant IDs (keep first occurrence)
      const seenIds = new Set<number>();
      const uniqueTenants = normalizedTenants.filter((tenant: TenantWithOccupancy) => {
        if (seenIds.has(tenant.id)) {
          console.warn(`Duplicate tenant ID found: ${tenant.id} (${tenant.name}). Filtering out duplicate.`);
          return false;
        }
        seenIds.add(tenant.id);
        return true;
      });
      
      setTenants(uniqueTenants);
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

  const handleViewPhoto = (photoIndex: number) => {
    setFullscreenPhotoIndex(photoIndex);
    setFullscreenProofIndex(null);
    setFullscreenMediaTab('photos');
  };

  const handleViewProof = (proofIndex: number) => {
    setFullscreenPhotoIndex(null);
    setFullscreenProofIndex(proofIndex);
    setFullscreenMediaTab('proofs');
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
        isFormVisible={showForm}
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

      {/* Add Tenant Form Card */}
      {showForm && !editingTenant && (
        <div className="tenant-form-card">
          <h3>Add New Tenant</h3>
          <TenantForm
            tenant={null}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            cardMode={true}
          />
        </div>
      )}

      {/* Edit Tenant Form Card */}
      {showForm && editingTenant && (
        <div className="tenant-form-card">
          <h3>Edit Tenant - {editingTenant.name}</h3>
          <TenantForm
            tenant={editingTenant}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            cardMode={true}
          />
        </div>
      )}

      {/* Filter Toggle Button */}
      <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
        {showFilters ? '▼' : '▶'} {showFilters ? 'Hide' : 'Show'} Filters
      </button>

      {/* Search and Filter Sections */}
      {showFilters && (
        <>
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

          {/* Room Filter Section */}
          <div className="room-filter">
            <SearchableDropdown
              options={roomOptions}
              value={selectedRoom}
              onChange={(option) => {
                setSelectedRoom(option.id as string);
              }}
              placeholder="Filter by Room"
            />
            {selectedRoom && (
              <button
                onClick={() => setSelectedRoom('')}
                className="clear-room-filter"
              >
                Clear Room Filter
              </button>
            )}
          </div>
        </>
      )}

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

      {/* Full Screen Tenant View */}
      {fullScreenTenant && (
        <>
          {/* Main Tenant View */}
          <TenantFullScreenView
            tenant={fullScreenTenant}
            onClose={handleCloseFullscreen}
            onViewPhoto={handleViewPhoto}
            onViewProof={handleViewProof}
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

      {/* Edit Tenant Form Card */}
      {showForm && editingTenant && (
        <div className="tenant-form-card">
          <h3>Edit Tenant - {editingTenant.name}</h3>
          <TenantForm
            tenant={editingTenant}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            cardMode={true}
          />
        </div>
      )}
    </div>
  );
}
