import { useState, useEffect, useMemo } from 'react';
import { apiService, getFileUrl, getRentalPaymentProofUrl } from '../api';
import { getOccupancyLinks } from '../api';
import LoadingSpinner from './LoadingSpinner';
import RoomOccupancy from './RoomOccupancy';
import './RoomManagement.css';

interface Room {
  id: number;
  roomNumber: string;
  beds: number;
  roomRent: number;
}

interface TenantHistory {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  tenantAddress?: string;
  tenantCity: string;
  tenantPhoto?: string;
  checkInDate: string;
  checkOutDate: string | null;
  rentFixed: number;
  advanceCollected: number;
  isActive: boolean;
  currentRentReceived: number;
  currentPendingPayment: number;
}

interface TenantDetailTabState {
  loading: boolean;
  error: string | null;
  summary: any | null;
  payments: any[];
  ebRecords: any[];
}

interface TenantDetails {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  photoUrl?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

interface RoomWithHistory extends Room {
  tenantHistory: TenantHistory[];
}

export default function RoomManagement(): JSX.Element {
  const [rooms, setRooms] = useState<RoomWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [selectedTenantOccupancyId, setSelectedTenantOccupancyId] = useState<number | ''>('');
  const [occupancyFilter, setOccupancyFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [showStatsGrid, setShowStatsGrid] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetails | null>(null);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [tenantModalLoading] = useState(false);
  const [tenantModalError, setTenantModalError] = useState<string | null>(null);
  const [tenantDetailTabs, setTenantDetailTabs] = useState<Record<number, 'overview' | 'rental' | 'deposit' | 'eb'>>({});
  const [tenantDetailData, setTenantDetailData] = useState<Record<number, TenantDetailTabState>>({});
  const [editingRoomValues, setEditingRoomValues] = useState<Record<number, { rent: string; advance: string }>>({});
  const [savingRoomDetails, setSavingRoomDetails] = useState<Record<number, boolean>>({});
  const [roomDetailError, setRoomDetailError] = useState<string | null>(null);
  const [roomDetailSuccess, setRoomDetailSuccess] = useState<string | null>(null);
  const [activeManagementTab, setActiveManagementTab] = useState<'details' | 'vacancy' | 'analysis'>('details');

  // Fetch rooms and occupancy data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get rooms data
        const roomsResponse = await apiService.getRooms();
        const roomsList = roomsResponse.data || [];

        // Get occupancy links (includes all tenant history)
        const occupancyData = await getOccupancyLinks();

        // Group occupancy data by room
        const roomsWithHistory: RoomWithHistory[] = roomsList.map((room: any) => {
          const tenantHistory = occupancyData.filter(
            (occ: any) => Number(occ.roomId) === Number(room.id)
          );

          return {
            id: room.id,
            roomNumber: String(room.roomNumber || room.number || ''),
            beds: room.beds || 0,
            roomRent: room.roomRent || room.rent || 0,
            tenantHistory: tenantHistory
          };
        });

        // Sort rooms by number
        roomsWithHistory.sort((a, b) => {
          const roomNumA = String(a.roomNumber || '');
          const roomNumB = String(b.roomNumber || '');
          const numA = parseInt(roomNumA, 10);
          const numB = parseInt(roomNumB, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return roomNumA.localeCompare(roomNumB);
        });

        setRooms(roomsWithHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room management data');
        console.error('Error fetching room data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.tenantHistory.some(t => t.isActive)).length;
    
    // Count vacant rooms using the same logic as getVacancyStatus
    const vacantRooms = rooms.filter(room => {
      const hasActiveTenant = room.tenantHistory.some(t => t.isActive);
      if (hasActiveTenant) return false;
      
      // Room is vacant if it has no active tenants
      return true;
    }).length;
    
    const totalMonthlyRent = rooms.reduce((sum, r) => sum + r.roomRent, 0);

    return {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      totalMonthlyRent
    };
  }, [rooms]);

  // Filter rooms based on occupancy status only
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (occupancyFilter === 'occupied') {
        return room.tenantHistory.some(t => t.isActive);
      }

      if (occupancyFilter === 'vacant') {
        return !room.tenantHistory.some(t => t.isActive);
      }

      return true;
    });
  }, [rooms, occupancyFilter]);

  useEffect(() => {
    if (!filteredRooms.length) {
      setSelectedRoomId('');
      return;
    }

    const hasSelectedRoom = typeof selectedRoomId === 'number' && filteredRooms.some(room => room.id === selectedRoomId);
    if (!hasSelectedRoom) {
      setSelectedRoomId(filteredRooms[0].id);
    }
  }, [filteredRooms, selectedRoomId]);

  const selectedRoom = useMemo(() => {
    if (typeof selectedRoomId !== 'number') return null;
    return rooms.find(room => room.id === selectedRoomId) ?? null;
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom || selectedRoom.tenantHistory.length === 0) {
      setSelectedTenantOccupancyId('');
      return;
    }

    const roomTenantIds = selectedRoom.tenantHistory.map(tenant => tenant.occupancyId);
    const hasCurrentSelection = typeof selectedTenantOccupancyId === 'number' && roomTenantIds.includes(selectedTenantOccupancyId);

    if (!hasCurrentSelection) {
      const preferredTenant = selectedRoom.tenantHistory.find(tenant => tenant.isActive) ?? selectedRoom.tenantHistory[0];
      setSelectedTenantOccupancyId(preferredTenant.occupancyId);
    }
  }, [selectedRoom, selectedTenantOccupancyId]);

  const selectedRoomTenant = selectedRoom?.tenantHistory?.find(tenant => tenant.occupancyId === selectedTenantOccupancyId)
    ?? selectedRoom?.tenantHistory?.find(tenant => tenant.isActive)
    ?? selectedRoom?.tenantHistory?.[0]
    ?? null;

  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getMonthLabel = (dateValue: string | null | undefined): string => {
    if (!dateValue) return 'N/A';
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return 'N/A';
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const buildEbHistoryRows = (records: any[] = []): any[] => {
    return [...records]
      .filter((record) => record && record.readingTakenDate)
      .sort((left, right) => new Date(right.readingTakenDate).getTime() - new Date(left.readingTakenDate).getTime())
      .slice(0, 6)
      .map((record) => {
        const startReading = Number(record.startingMeterReading ?? 0);
        const endReading = Number(record.endingMeterReading ?? 0);
        const unitRate = Number(record.unitRate ?? record.chargePerUnit ?? 0);
        const consumedUnits = Number.isFinite(endReading - startReading) ? endReading - startReading : 0;
        const charge = Number((consumedUnits * unitRate).toFixed(2));

        return {
          ...record,
          meterName: record.consumerName || record.meterNo || 'EB Service',
          monthLabel: getMonthLabel(record.readingTakenDate),
          startReading,
          endReading,
          consumedUnits,
          unitRate,
          charge
        };
      });
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTenantEntryLabel = (tenant: any): string => {
    const tenantName = tenant?.tenantName || 'Tenant';
    const checkIn = tenant?.checkInDate ? formatDate(tenant.checkInDate) : 'N/A';
    const checkOut = tenant?.checkOutDate ? formatDate(tenant.checkOutDate) : 'Open';
    const status = tenant?.isActive ? 'Active' : 'Ended';
    return `${tenantName} (${status}) | In: ${checkIn} | Out: ${checkOut}`;
  };

  const getRoomEntryLabel = (room: RoomWithHistory): string => {
    const activeTenant = room.tenantHistory.find((tenant) => tenant.isActive);

    if (!activeTenant) {
      return `Room #${room.roomNumber} — Vacant`;
    }

    const checkIn = activeTenant.checkInDate ? formatDate(activeTenant.checkInDate) : 'N/A';
    const checkOut = activeTenant.checkOutDate ? formatDate(activeTenant.checkOutDate) : 'Open';
    return `Room #${room.roomNumber} — ${activeTenant.tenantName || 'Tenant'} | In: ${checkIn} | Out: ${checkOut}`;
  };

  const getRoomCategory = (beds: number): string => {
    if (beds === 0) return 'Shop';
    return `${beds} bed${beds > 1 ? 's' : ''}`;
  };

  const getRoomAdvanceTotal = (tenantHistory: TenantHistory[]): number => {
    return tenantHistory
      .filter((tenant) => tenant.isActive)
      .reduce((sum, tenant) => sum + (tenant.advanceCollected || 0), 0);
  };

  const getVacancyStatus = (tenantHistory: TenantHistory[]): { isVacant: boolean; daysVacant: number; lastCheckoutDate: string | null } => {
    // Check if the room has any active tenants
    const hasActiveTenant = tenantHistory.some(t => t.isActive);
    
    if (hasActiveTenant) {
      return { isVacant: false, daysVacant: 0, lastCheckoutDate: null };
    }

    // If no active tenant, find the most recent checkout date
    if (tenantHistory.length === 0) {
      return { isVacant: true, daysVacant: 0, lastCheckoutDate: null };
    }

    // Get the most recent checkout date
    const checkouts = tenantHistory
      .filter(t => t.checkOutDate)
      .map(t => ({ ...t, checkOutDateTime: new Date(t.checkOutDate!).getTime() }));

    if (checkouts.length === 0) {
      // No checkout date means it's never been occupied or still occupied
      return { isVacant: false, daysVacant: 0, lastCheckoutDate: null };
    }

    const lastCheckout = checkouts.reduce((max, current) => 
      current.checkOutDateTime > max.checkOutDateTime ? current : max
    );

    const lastCheckoutDate = lastCheckout.checkOutDate!;
    const today = new Date();
    const lastCheckoutDateObj = new Date(lastCheckoutDate);
    
    // Calculate days vacant
    const daysVacant = Math.floor((today.getTime() - lastCheckoutDateObj.getTime()) / (1000 * 60 * 60 * 24));

    return { isVacant: true, daysVacant, lastCheckoutDate: lastCheckoutDate };
  };

  const handleRoomSelect = (roomId: number | '') => {
    setSelectedRoomId(roomId);
    setSelectedTenantOccupancyId('');
  };

  const handleTenantSelect = (occupancyId: number | '') => {
    setSelectedTenantOccupancyId(occupancyId);
  };

  const startEditingRoomValues = (room: RoomWithHistory) => {
    const targetTenant = room.tenantHistory.find((tenant) => tenant.occupancyId === selectedTenantOccupancyId)
      ?? room.tenantHistory.find((tenant) => tenant.isActive)
      ?? room.tenantHistory[0];

    setEditingRoomValues(prev => ({
      ...prev,
      [room.id]: {
        rent: String(room.roomRent || 0),
        advance: String(targetTenant?.advanceCollected ?? 0)
      }
    }));
  };

  const updateEditingRoomValue = (roomId: number, field: 'rent' | 'advance', value: string) => {
    setEditingRoomValues(prev => ({
      ...prev,
      [roomId]: {
        rent: prev[roomId]?.rent ?? String(rooms.find(room => room.id === roomId)?.roomRent ?? 0),
        advance: prev[roomId]?.advance ?? '0',
        [field]: value
      }
    }));
  };

  const saveRoomDetailEdit = async (room: RoomWithHistory) => {
    const targetTenant = room.tenantHistory.find((tenant) => tenant.occupancyId === selectedTenantOccupancyId)
      ?? room.tenantHistory.find((tenant) => tenant.isActive)
      ?? room.tenantHistory[0];

    const roomRentValue = Number(editingRoomValues[room.id]?.rent ?? room.roomRent);
    const advanceValue = Number(editingRoomValues[room.id]?.advance ?? targetTenant?.advanceCollected ?? 0);

    if (!Number.isFinite(roomRentValue) || roomRentValue < 0) {
      setRoomDetailError('Room rent must be a valid non-negative number');
      return;
    }

    if (!Number.isFinite(advanceValue) || advanceValue < 0) {
      setRoomDetailError('Advance must be a valid non-negative number');
      return;
    }

    setSavingRoomDetails(prev => ({ ...prev, [room.id]: true }));
    setRoomDetailError(null);
    setRoomDetailSuccess(null);

    try {
      if (targetTenant) {
        await apiService.updateOccupancy(targetTenant.occupancyId, {
          roomId: room.id,
          rentFixed: roomRentValue,
          roomRent: roomRentValue,
          depositReceived: advanceValue,
          advanceAmount: advanceValue
        });
      }

      await apiService.updateRoom(room.id, { rent: roomRentValue });

      setRooms(prev => prev.map(item => item.id === room.id
        ? {
            ...item,
            roomRent: roomRentValue,
            tenantHistory: item.tenantHistory.map(tenant => tenant.occupancyId === targetTenant?.occupancyId
              ? { ...tenant, rentFixed: roomRentValue, advanceCollected: advanceValue }
              : tenant)
          }
        : item));

      setRoomDetailSuccess('Room rent and advance updated successfully');
      setEditingRoomValues(prev => {
        const next = { ...prev };
        delete next[room.id];
        return next;
      });
    } catch (err) {
      setRoomDetailError(err instanceof Error ? err.message : 'Failed to update room details');
    } finally {
      setSavingRoomDetails(prev => ({ ...prev, [room.id]: false }));
    }
  };

  const closeTenantModal = () => {
    setSelectedTenant(null);
    setTenantModalError(null);
  };

  const openReceiptPopup = (imageUrl: string) => {
    setSelectedReceiptImage(imageUrl);
  };

  const closeReceiptPopup = () => {
    setSelectedReceiptImage(null);
  };

  const handleTenantDetailTab = async (occupancyId: number, roomId: number, tab: 'overview' | 'rental' | 'deposit' | 'eb') => {
    setTenantDetailTabs(prev => ({ ...prev, [occupancyId]: tab }));

    if (tab === 'overview') {
      return;
    }

    if (tenantDetailData[occupancyId] && !tenantDetailData[occupancyId].loading && tenantDetailData[occupancyId].summary !== null) {
      return;
    }

    try {
      setTenantDetailData(prev => ({
        ...prev,
        [occupancyId]: {
          loading: true,
          error: null,
          summary: prev[occupancyId]?.summary ?? null,
          payments: prev[occupancyId]?.payments ?? [],
          ebRecords: prev[occupancyId]?.ebRecords ?? []
        }
      }));

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [summaryResponse, rentalResponse, ebResponse] = await Promise.all([
        apiService.getRentalSummaryByOccupancy(occupancyId),
        apiService.getRentalCollectionByOccupancy(occupancyId),
        apiService.getServiceConsumption({
          roomId,
          startDate: sixMonthsAgo.toISOString().split('T')[0],
          endDate: lastDayOfMonth.toISOString().split('T')[0]
        })
      ]);

      const ebRecords = Array.isArray(ebResponse.data)
        ? ebResponse.data
        : [];

      setTenantDetailData(prev => ({
        ...prev,
        [occupancyId]: {
          loading: false,
          error: null,
          summary: summaryResponse.data || null,
          payments: rentalResponse.data || [],
          ebRecords
        }
      }));
    } catch (err) {
      setTenantDetailData(prev => ({
        ...prev,
        [occupancyId]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load tenant detail data',
          summary: prev[occupancyId]?.summary ?? null,
          payments: prev[occupancyId]?.payments ?? [],
          ebRecords: prev[occupancyId]?.ebRecords ?? []
        }
      }));
    }
  };

  const renderTenantDetailPanel = (tenant: TenantHistory, room: RoomWithHistory): JSX.Element => {
    const activeTab = tenantDetailTabs[tenant.occupancyId] || 'overview';
    const detailData = tenantDetailData[tenant.occupancyId] || { loading: false, error: null, summary: null, payments: [], ebRecords: [] };
    const tenantPhoto = tenant.tenantPhoto || selectedTenant?.photoUrl || '';
    const depositReceiptPhoto = detailData.payments.find((payment: any) => payment.screenshotUrl && Number(payment.rentReceived || 0) >= 0)?.screenshotUrl || null;
    const paymentDates = (detailData.payments || [])
      .map((payment: any) => payment.rentReceivedOn)
      .filter((date: string | null | undefined) => !!date && !Number.isNaN(new Date(date).getTime()));
    const latestPaymentDate = paymentDates.length > 0
      ? paymentDates.sort((left: string, right: string) => new Date(right).getTime() - new Date(left).getTime())[0]
      : null;
    const summaryLastPaymentDate = detailData.summary?.lastPaymentDate;
    const rentalLastPaymentDate = latestPaymentDate || (
      summaryLastPaymentDate && tenant.checkOutDate
        ? (summaryLastPaymentDate === tenant.checkOutDate ? null : summaryLastPaymentDate)
        : summaryLastPaymentDate || null
    );

    return (
      <div className="tenant-detail-card">
        <div className="tenant-detail-header">
          <div className="tenant-detail-avatar-wrap">
            {tenantPhoto ? (
              <img
                src={getFileUrl(tenantPhoto)}
                alt={tenant.tenantName || 'Tenant'}
                className="tenant-detail-avatar"
              />
            ) : (
              <div className="tenant-detail-avatar-placeholder">
                {(tenant.tenantName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="tenant-detail-heading">
            <strong>{tenant.tenantName || 'Tenant'}</strong>
            <span>{tenant.tenantCity || 'Unknown city'}</span>
          </div>
        </div>

        <div className="tenant-detail-tabs">
          {(['overview', 'rental', 'deposit', 'eb'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tenant-detail-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTenantDetailTab(tenant.occupancyId, room.id, tab)}
            >
              {tab === 'overview' ? 'Overview' : tab === 'rental' ? 'Rental' : tab === 'deposit' ? 'Deposit' : 'EB'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="tenant-detail-body tenant-overview-layout">
            <div className="tenant-overview-content">
              <div className="tenant-overview-grid">
                <div className="tenant-detail-field">
                  <span>Phone</span>
                  <strong>{tenant.tenantPhone || '-'}</strong>
                </div>
                <div className="tenant-detail-field">
                  <span>Address</span>
                  <strong>{tenant.tenantAddress || 'Not available'}</strong>
                </div>
                <div className="tenant-detail-field">
                  <span>Check-in</span>
                  <strong>{formatDate(tenant.checkInDate)}</strong>
                </div>
                <div className="tenant-detail-field">
                  <span>Check-out</span>
                  <strong>{tenant.checkOutDate ? formatDate(tenant.checkOutDate) : 'Ongoing'}</strong>
                </div>
                <div className="tenant-detail-field">
                  <span>Fixed rent</span>
                  <strong>{formatCurrency(tenant.rentFixed)}</strong>
                </div>
                <div className="tenant-detail-field">
                  <span>Advance</span>
                  <strong>{formatCurrency(tenant.advanceCollected)}</strong>
                </div>
              </div>
            </div>

            {tenantPhoto && (
              <div className="tenant-overview-photo-wrap">
                <img
                  src={getFileUrl(tenantPhoto)}
                  alt={tenant.tenantName || 'Tenant'}
                  className="tenant-overview-photo"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'rental' && (
          <div className="tenant-detail-body">
            {detailData.loading ? (
              <p className="tenant-detail-empty">Loading rental details...</p>
            ) : detailData.error ? (
              <p className="tenant-detail-error">{detailData.error}</p>
            ) : (
              <>
                <div className="tenant-detail-metrics">
                  <div className="tenant-detail-field">
                    <span>Received</span>
                    <strong>{formatCurrency(Number(detailData.summary?.totalRentReceived || tenant.currentRentReceived || 0))}</strong>
                  </div>
                  <div className="tenant-detail-field">
                    <span>Pending</span>
                    <strong>{formatCurrency(Number(detailData.summary?.currentMonthPending || tenant.currentPendingPayment || 0))}</strong>
                  </div>
                  <div className="tenant-detail-field">
                    <span>Last payment</span>
                    <strong>{rentalLastPaymentDate ? formatDate(rentalLastPaymentDate) : '-'}</strong>
                  </div>
                </div>

                {detailData.payments.filter((payment: any) => {
                  const paymentDate = payment.rentReceivedOn;
                  const isCheckoutLikeDate = !!tenant.checkOutDate && paymentDate && paymentDate === tenant.checkOutDate;
                  return !isCheckoutLikeDate;
                }).length > 0 ? (
                  <div className="rental-table-wrap">
                    <table className="rental-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Mode</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.payments
                          .filter((payment: any) => {
                            const paymentDate = payment.rentReceivedOn;
                            const isCheckoutLikeDate = !!tenant.checkOutDate && paymentDate && paymentDate === tenant.checkOutDate;
                            return !isCheckoutLikeDate;
                          })
                          .slice(0, 6)
                          .map((payment: any) => {
                            const receiptUrl = payment.screenshotUrl ? getRentalPaymentProofUrl(payment.screenshotUrl, payment.rentReceivedOn, payment.folder) : '';
                            return (
                              <tr key={payment.id || payment.rentReceivedOn}>
                                <td>{payment.rentReceivedOn ? formatDate(payment.rentReceivedOn) : 'Date unavailable'}</td>
                                <td className="rental-amount">{formatCurrency(Number(payment.rentReceived || 0))}</td>
                                <td>{payment.modeOfPayment || '-'}</td>
                                <td>
                                  {receiptUrl ? (
                                    <img
                                      src={receiptUrl}
                                      alt={`Rental receipt for ${payment.rentReceivedOn || 'payment'}`}
                                      className="rental-table-image clickable-receipt-image"
                                      onClick={() => openReceiptPopup(receiptUrl)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          openReceiptPopup(receiptUrl);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="rental-no-image">No photo</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="tenant-detail-empty">No rental payment records found for this tenant.</p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="tenant-detail-body tenant-deposit-layout">
            <div className="tenant-deposit-content">
              {detailData.loading ? (
                <p className="tenant-detail-empty">Loading deposit details...</p>
              ) : detailData.error ? (
                <p className="tenant-detail-error">{detailData.error}</p>
              ) : (
                <>
                  <div className="tenant-detail-metrics">
                    <div className="tenant-detail-field">
                      <span>Deposit</span>
                      <strong>{formatCurrency(Number(detailData.summary?.depositReceived || tenant.advanceCollected || 0))}</strong>
                    </div>
                    <div className="tenant-detail-field">
                      <span>Mode</span>
                      <strong>{detailData.payments[0]?.modeOfPayment || 'Not available'}</strong>
                    </div>
                    <div className="tenant-detail-field">
                      <span>Receipt date</span>
                      <strong>{detailData.payments[0]?.rentReceivedOn ? formatDate(detailData.payments[0].rentReceivedOn) : '-'}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            {depositReceiptPhoto ? (
              <div className="tenant-detail-receipt-wrap tenant-deposit-photo-wrap">
                <img
                  src={getRentalPaymentProofUrl(depositReceiptPhoto, detailData.payments[0]?.rentReceivedOn, detailData.payments[0]?.folder)}
                  alt="Deposit receipt"
                  className="tenant-detail-receipt-photo large tenant-deposit-photo clickable-receipt-image"
                  onClick={() => openReceiptPopup(getRentalPaymentProofUrl(depositReceiptPhoto, detailData.payments[0]?.rentReceivedOn, detailData.payments[0]?.folder))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openReceiptPopup(getRentalPaymentProofUrl(depositReceiptPhoto, detailData.payments[0]?.rentReceivedOn, detailData.payments[0]?.folder));
                    }
                  }}
                />
              </div>
            ) : (
              <div className="tenant-detail-receipt-wrap tenant-deposit-photo-wrap">
                <div className="tenant-detail-receipt-placeholder tenant-deposit-placeholder">No deposit receipt photo available for this tenant.</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'eb' && (
          <div className="tenant-detail-body">
            {detailData.loading ? (
              <p className="tenant-detail-empty">Loading EB readings...</p>
            ) : detailData.error ? (
              <p className="tenant-detail-error">{detailData.error}</p>
            ) : (
              <>
                {(() => {
                  const ebHistoryRows = buildEbHistoryRows(detailData.ebRecords.filter((record: any) => Number(record.roomId) === Number(room.id)));

                  return ebHistoryRows.length > 0 ? (
                    <div className="rental-table-wrap">
                      <table className="rental-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Service</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Units</th>
                            <th>Rate</th>
                            <th>Charge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ebHistoryRows.map((row: any, index: number) => {
                            const isLatest = index === 0;
                            return (
                              <tr
                                key={`${row.id || row.serviceAllocId || row.readingTakenDate}-${row.readingTakenDate}`}
                                className={isLatest ? 'eb-history-row latest' : 'eb-history-row'}
                              >
                                <td className="eb-history-month">{row.monthLabel}</td>
                                <td className="eb-history-service">{row.meterName}</td>
                                <td>{row.startReading}</td>
                                <td>{row.endReading}</td>
                                <td className="eb-history-units">{row.consumedUnits}</td>
                                <td className="eb-history-rate">{formatCurrency(Number(row.unitRate || 0))}/unit</td>
                                <td className="eb-history-amount">{formatCurrency(Number(row.charge || 0))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="tenant-detail-empty">No EB meter readings for this room in the last 6 months.</p>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderManagementTabs = () => (
    <div className="room-occupancy-tabs" role="tablist" aria-label="Room management views">
      <button
        type="button"
        className={`room-occupancy-tab ${activeManagementTab === 'details' ? 'active' : ''}`}
        onClick={() => setActiveManagementTab('details')}
        role="tab"
        aria-selected={activeManagementTab === 'details'}
      >
        Room Details
      </button>
      <button
        type="button"
        className={`room-occupancy-tab ${activeManagementTab === 'vacancy' ? 'active' : ''}`}
        onClick={() => setActiveManagementTab('vacancy')}
        role="tab"
        aria-selected={activeManagementTab === 'vacancy'}
      >
        Room Vacancy Status
      </button>
      <button
        type="button"
        className={`room-occupancy-tab ${activeManagementTab === 'analysis' ? 'active' : ''}`}
        onClick={() => setActiveManagementTab('analysis')}
        role="tab"
        aria-selected={activeManagementTab === 'analysis'}
      >
        Room Wise Analysis
      </button>
    </div>
  );

  if (loading) {
    return <LoadingSpinner overlay text="Loading room management data" />;
  }

  if (activeManagementTab === 'vacancy' || activeManagementTab === 'analysis') {
    return (
      <div className="room-management-container">
        <h2 className="section-heading">Room Management</h2>
        {renderManagementTabs()}
        <RoomOccupancy
          key={activeManagementTab}
          mode={activeManagementTab === 'analysis' ? 'analysis' : 'occupancy'}
          hideHeaderAndTabs
        />
      </div>
    );
  }

  return (
    <div className="room-management-container">
      <h2 className="section-heading">Room Management</h2>
      {renderManagementTabs()}
      {/* Error Message */}
      {error && (
        <div className="error-card">
          <span>❌</span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="success-card">
          <span>✅</span>
          <div>
            <strong>Success</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="section-header">
        <h2>Room Statistics</h2>
        <button 
          className={`toggle-btn ${showStatsGrid ? 'expanded' : 'collapsed'}`}
          onClick={() => setShowStatsGrid(!showStatsGrid)}
          aria-expanded={showStatsGrid}
        >
          {showStatsGrid ? '▼' : '▶'}
        </button>
      </div>

      <div className={`collapsible-content ${showStatsGrid ? 'open' : 'closed'}`}>
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">🏠</div>
            <div className="stat-content">
              <h3>Total Rooms</h3>
              <p className="stat-value">{stats.totalRooms}</p>
            </div>
          </div>

          <div 
            className={`stat-card occupied ${occupancyFilter === 'occupied' ? 'active-filter' : ''}`}
            onClick={() => setOccupancyFilter(occupancyFilter === 'occupied' ? 'all' : 'occupied')}
            style={{ cursor: 'pointer' }}
            title="Click to filter by occupied rooms"
          >
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <h3>Occupied</h3>
              <p className="stat-value">{stats.occupiedRooms}</p>
            </div>
          </div>

          <div 
            className={`stat-card vacant ${occupancyFilter === 'vacant' ? 'active-filter' : ''}`}
            onClick={() => setOccupancyFilter(occupancyFilter === 'vacant' ? 'all' : 'vacant')}
            style={{ cursor: 'pointer' }}
            title="Click to filter by vacant rooms"
          >
            <div className="stat-icon">⊗</div>
            <div className="stat-content">
              <h3>Vacant</h3>
              <p className="stat-value">{stats.vacantRooms}</p>
            </div>
          </div>

          <div className="stat-card monthly-rent">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <h3>Total Monthly Rent</h3>
              <p className="stat-value">{formatCurrency(stats.totalMonthlyRent)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="room-selector-panel">
        <div className="room-selector-header">
          <label className="search-label">Select Room</label>
          <span className="selected-room-meta">{filteredRooms.length} room(s)</span>
        </div>
        <select
          className="room-select"
          value={selectedRoomId}
          onChange={(e) => handleRoomSelect(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label="Select a room"
        >
          {filteredRooms.length === 0 ? (
            <option value="">No rooms match your filters</option>
          ) : (
            filteredRooms.map(room => (
              <option key={room.id} value={room.id}>
                {getRoomEntryLabel(room)}
              </option>
            ))
          )}
        </select>
      </div>

      {(tenantModalLoading || tenantModalError || selectedTenant) && (
        <div className="tenant-view-modal-overlay" onClick={closeTenantModal}>
          <div className="tenant-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-view-modal-header">
              <h3>Tenant Details</h3>
              <button className="tenant-view-close" onClick={closeTenantModal} aria-label="Close tenant details">✕</button>
            </div>

            {tenantModalLoading && <p className="tenant-view-loading">Loading tenant details...</p>}

            {!tenantModalLoading && tenantModalError && (
              <p className="tenant-view-error">{tenantModalError}</p>
            )}

            {!tenantModalLoading && !tenantModalError && selectedTenant && (
              <div className="tenant-view-content">
                <div className="tenant-view-photo-wrap">
                  {selectedTenant.photoUrl ? (
                    <img
                      src={getFileUrl(selectedTenant.photoUrl)}
                      alt={selectedTenant.name || 'Tenant'}
                      className="tenant-view-photo"
                    />
                  ) : (
                    <div className="tenant-view-photo-placeholder">
                      {(selectedTenant.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="tenant-view-fields">
                  <p><strong>Name:</strong> {selectedTenant.name || '-'}</p>
                  <p><strong>Phone:</strong> {selectedTenant.phone || '-'}</p>
                  <p><strong>City:</strong> {selectedTenant.city || '-'}</p>
                  <p><strong>Address:</strong> {selectedTenant.address || '-'}</p>
                  <p><strong>Current Room:</strong> {selectedTenant.roomNumber || '-'}</p>
                  <p><strong>Check-In:</strong> {selectedTenant.checkInDate ? formatDate(selectedTenant.checkInDate) : '-'}</p>
                  <p><strong>Check-Out:</strong> {selectedTenant.checkOutDate ? formatDate(selectedTenant.checkOutDate) : '-'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredRooms.length > 0 ? (
        selectedRoom ? (
          <div className="selected-room-panel">
            <div className="selected-room-header">
              <div>
                <p className="selected-room-kicker">Selected room</p>
                <h3>Room #{selectedRoom.roomNumber}</h3>
              </div>
              <div className="selected-room-summary">
                <span className="room-beds">{getRoomCategory(selectedRoom.beds || 0)}</span>
                <span className="advance-total-badge">Advance: {formatCurrency(getRoomAdvanceTotal(selectedRoom.tenantHistory))}</span>
                <span className={`badge ${selectedRoom.tenantHistory.some(t => t.isActive) ? 'active' : 'vacant'}`}>
                  {selectedRoom.tenantHistory.some(t => t.isActive) ? '🟢 Occupied' : '🔴 Vacant'}
                </span>
              </div>
            </div>

            <div className="tenant-selector-panel">
              <div className="room-selector-header">
                <label className="search-label">Select Tenant</label>
                <span className="selected-room-meta">{selectedRoom.tenantHistory.length} tenant(s)</span>
              </div>
              <select
                className="room-select"
                value={selectedRoomTenant?.occupancyId ?? ''}
                onChange={(e) => handleTenantSelect(e.target.value === '' ? '' : Number(e.target.value))}
                aria-label="Select a tenant for this room"
              >
                {selectedRoom.tenantHistory.length === 0 ? (
                  <option value="">No tenants for this room</option>
                ) : (
                  selectedRoom.tenantHistory
                    .slice()
                    .sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime())
                    .map((tenant) => (
                      <option key={tenant.occupancyId} value={tenant.occupancyId}>
                        {getTenantEntryLabel(tenant)}
                      </option>
                    ))
                )}
              </select>
            </div>

            <div className="selected-room-metrics">
              <div className="selected-room-stat">
                <span>Rent</span>
                {editingRoomValues[selectedRoom.id] ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingRoomValues[selectedRoom.id].rent}
                    onChange={(e) => updateEditingRoomValue(selectedRoom.id, 'rent', e.target.value)}
                    className="inline-edit-input"
                  />
                ) : (
                  <strong>{formatCurrency(selectedRoom.roomRent)}</strong>
                )}
              </div>
              <div className="selected-room-stat">
                <span>Advance</span>
                {editingRoomValues[selectedRoom.id] ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingRoomValues[selectedRoom.id].advance}
                    onChange={(e) => updateEditingRoomValue(selectedRoom.id, 'advance', e.target.value)}
                    className="inline-edit-input"
                  />
                ) : (
                  <strong>{formatCurrency(selectedRoom.tenantHistory.find(t => t.isActive)?.advanceCollected ?? selectedRoom.tenantHistory[0]?.advanceCollected ?? 0)}</strong>
                )}
              </div>
              <div className="selected-room-stat">
                <span>Tenants</span>
                <strong>{selectedRoom.tenantHistory.length}</strong>
              </div>
              <div className="selected-room-stat">
                <span>Vacancy</span>
                <strong>{getVacancyStatus(selectedRoom.tenantHistory).isVacant ? 'Vacant' : 'Occupied'}</strong>
              </div>
            </div>

            {roomDetailError && (
              <div className="error-card small-error-card">
                <span>❌</span>
                <div>
                  <strong>Error</strong>
                  <p>{roomDetailError}</p>
                </div>
              </div>
            )}

            {roomDetailSuccess && (
              <div className="success-card small-success-card">
                <span>✅</span>
                <div>
                  <strong>Success</strong>
                  <p>{roomDetailSuccess}</p>
                </div>
              </div>
            )}

            <div className="room-edit-actions">
              {editingRoomValues[selectedRoom.id] ? (
                <>
                  <button type="button" className="primary-btn" onClick={() => saveRoomDetailEdit(selectedRoom)} disabled={savingRoomDetails[selectedRoom.id]}>
                    {savingRoomDetails[selectedRoom.id] ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => {
                    setEditingRoomValues(prev => {
                      const next = { ...prev };
                      delete next[selectedRoom.id];
                      return next;
                    });
                    setRoomDetailError(null);
                    setRoomDetailSuccess(null);
                  }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="primary-btn" onClick={() => startEditingRoomValues(selectedRoom)}>
                  Edit Rent & Advance
                </button>
              )}
            </div>

            {selectedRoomTenant ? (
              renderTenantDetailPanel(selectedRoomTenant, selectedRoom)
            ) : (
              <div className="tenant-detail-empty">No tenant history for this room yet.</div>
            )}
          </div>
        ) : (
          <div className="no-results">
            <p>📭 No room selected</p>
          </div>
        )
      ) : (
        <div className="no-results">
          <p>📭 No rooms found matching your search criteria</p>
        </div>
      )}

      {selectedReceiptImage && (
        <div className="receipt-image-modal-overlay" onClick={closeReceiptPopup}>
          <div className="receipt-image-modal" onClick={(event) => event.stopPropagation()}>
            <button className="receipt-image-close" type="button" onClick={closeReceiptPopup} aria-label="Close receipt image">
              ✕
            </button>
            <img src={selectedReceiptImage} alt="Receipt preview" className="receipt-image-preview" />
          </div>
        </div>
      )}
    </div>
  );
}
