import { useState, useEffect, useMemo, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { apiService, downloadFileData, getFileUrl, getOccupancyLinks, getRentalPaymentProofUrl } from '../api';
import SearchableDropdown from './SearchableDropdown';
import CheckoutModal from './CheckoutModal';
import TenantFullScreenView from './TenantFullScreenView';
import TenantPhotoGalleryModal from './TenantPhotoGalleryModal';
import type { TenantWithOccupancy } from './TenantManagement';
import type { TenantStayPdfFile } from '../tenantStayPdf';
import './OccupancyLinks.css';

interface OccupancyLink {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
  tenantCity: string;
  tenantPhoto?: string;
  azurePhotoUrl?: string;
  roomId: number;
  roomNumber: string;
  roomRent: number;
  beds: number;
  checkInDate: string;
  checkOutDate: string | null;
  rentFixed: number;
  advanceCollected: number;
  depositRefunded: number;
  charges: number;
  isActive: boolean;
  currentRentReceived: number;
  currentPendingPayment: number;
  lastPaymentDate?: string;
}

interface TenantStayPaymentRecord {
  occupancyId: number;
  rentReceivedOn: string;
  rentReceived: number;
  charges: number;
  rentBalance?: number | null;
  modeOfPayment?: string | null;
  screenshotUrl?: string | null;
  folder?: string | null;
}

interface TenantStayElectricityRecord {
  billingYear: number;
  billingMonth: number;
  checkInDate: string;
  checkOutDate?: string | null;
  occupancyDaysInMonth?: number;
  totalDaysInMonth?: number;
  serviceName?: string;
  meterNo?: string;
  totalUnitsForRoom?: number;
  proRataUnits?: number;
  chargePerUnit?: number;
  totalCharge?: number;
  status?: string;
}

interface Stats {
  totalOccupancies: number;
  activeOccupancies: number;
  inactiveOccupancies: number;
  totalRentsCollected: number;
  totalPendingPayments: number;
}

interface OccupancyLinksProps {
  showHeading?: boolean;
}

const WhatsAppIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.05 2.25A9.65 9.65 0 0 0 3.8 16.9L2.5 21.75l4.98-1.31A9.72 9.72 0 1 0 12.05 2.25Zm0 17.72c-1.43 0-2.82-.38-4.04-1.1l-.29-.17-2.96.78.79-2.88-.19-.3A7.99 7.99 0 1 1 12.05 19.97Zm4.38-5.98c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.79-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32 1 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.15 1.51.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

const PdfIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 2.5h7l5 5V21H6a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z" fill="#fff" />
    <path d="M13 2.5v5h5" fill="#e9edf2" />
    <path d="M13 2.5v5h5" fill="none" stroke="#b42318" strokeWidth="1.2" />
    <rect x="4.5" y="12" width="15" height="6.5" rx="1.5" fill="#b42318" />
    <text x="12" y="16.9" fill="#fff" fontSize="5.8" fontWeight="800" textAnchor="middle" fontFamily="Arial, sans-serif">PDF</text>
  </svg>
);

export default function OccupancyLinks({ showHeading = true }: OccupancyLinksProps): JSX.Element {
  const occupancyPageSize = 5;
  const [occupancies, setOccupancies] = useState<OccupancyLink[]>([]);
  const [visibleOccupancyCount, setVisibleOccupancyCount] = useState(occupancyPageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'tenant' | 'room' | 'checkIn'>('checkIn');
  const [showStatsGrid, setShowStatsGrid] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [checkInDateFrom, setCheckInDateFrom] = useState<string>('');
  const [checkInDateTo, setCheckInDateTo] = useState<string>('');
  const [checkOutDateFrom, setCheckOutDateFrom] = useState<string>('');
  const [checkOutDateTo, setCheckOutDateTo] = useState<string>('');
  const [selectedOccupancy, setSelectedOccupancy] = useState<OccupancyLink | null>(null);
  const [pdfDownloadOccupancyId, setPdfDownloadOccupancyId] = useState<number | null>(null);
  const [openActionsOccupancyId, setOpenActionsOccupancyId] = useState<number | null>(null);
  const [fullScreenTenant, setFullScreenTenant] = useState<TenantWithOccupancy | null>(null);
  const [galleryTenant, setGalleryTenant] = useState<TenantWithOccupancy | null>(null);
  const [galleryInitialPhotoIndex, setGalleryInitialPhotoIndex] = useState<number | null>(0);
  const galleryInitialProofIndex: number | null = null;
  const [galleryInitialTab, setGalleryInitialTab] = useState<'photos' | 'proofs'>('photos');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeActionsMenu = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-actions-popup]')) {
        setOpenActionsOccupancyId(null);
      }
    };

    document.addEventListener('pointerdown', closeActionsMenu);
    return () => document.removeEventListener('pointerdown', closeActionsMenu);
  }, []);

  const buildTenantFromOccupancy = (occ: OccupancyLink): TenantWithOccupancy => ({
    id: occ.tenantId,
    name: occ.tenantName,
    phone: occ.tenantPhone,
    address: occ.tenantAddress,
    city: occ.tenantCity,
    photoUrl: occ.tenantPhoto || null,
    azurePhotoUrl: (occ as any).azurePhotoUrl || (occ.tenantPhoto && (occ.tenantPhoto.startsWith('http://') || occ.tenantPhoto.startsWith('https://')) ? occ.tenantPhoto : null),
    proof1Url: null,
    proof2Url: null,
    proof3Url: null,
    occupancyId: occ.occupancyId,
    roomNumber: occ.roomNumber,
    roomId: occ.roomId,
    checkInDate: occ.checkInDate,
    checkOutDate: occ.checkOutDate || null,
    rentFixed: occ.rentFixed,
    isCurrentlyOccupied: occ.isActive,
    currentPendingPayment: occ.currentPendingPayment,
    currentRentReceived: occ.currentRentReceived,
    lastPaymentDate: occ.lastPaymentDate,
  });

  useEffect(() => {
    const fetchOccupancies = async () => {
      try {
        setLoading(true);
        const data = await getOccupancyLinks();
        setOccupancies(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load occupancy links');
        console.error('Error fetching occupancies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancies();
  }, []);

  // Calculate statistics
  const stats = useMemo((): Stats => {
    const active = occupancies.filter(o => o.isActive).length;
    const inactive = occupancies.length - active;
    const totalCollected = occupancies.reduce((sum, o) => sum + (o.currentRentReceived || 0), 0);
    const totalPending = occupancies.reduce((sum, o) => sum + (o.currentPendingPayment || 0), 0);

    return {
      totalOccupancies: occupancies.length,
      activeOccupancies: active,
      inactiveOccupancies: inactive,
      totalRentsCollected: totalCollected,
      totalPendingPayments: totalPending
    };
  }, [occupancies]);

  // Generate room options
  const roomOptions = useMemo(() => {
    const roomStatusMap = new Map<string, boolean>(); // room -> has active occupancy
    occupancies.forEach((o) => {
      if (o.roomNumber) {
        const room = String(o.roomNumber).trim();
        if (o.isActive) {
          roomStatusMap.set(room, true);
        } else if (!roomStatusMap.has(room)) {
          roomStatusMap.set(room, false);
        }
      }
    });
    
    const uniqueRooms = Array.from(roomStatusMap.keys());
    const sortedRooms = uniqueRooms.sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    return sortedRooms.map((room) => ({
      id: room,
      label: roomStatusMap.get(room) ? `Room ${room} (Occupied)` : `Room ${room} (Vacant)`,
    }));
  }, [occupancies]);

  // Generate tenant options
  const tenantOptions = useMemo(() => {
    // Count rooms per tenant
    const tenantRoomCount = new Map<string, Set<string>>();
    occupancies.forEach((o) => {
      if (o.tenantName) {
        const tenantName = o.tenantName.trim();
        if (!tenantRoomCount.has(tenantName)) {
          tenantRoomCount.set(tenantName, new Set<string>());
        }
        if (o.roomNumber) {
          tenantRoomCount.get(tenantName)!.add(String(o.roomNumber).trim());
        }
      }
    });

    // Get unique tenants and create options
    const uniqueTenants = new Set<string>();
    occupancies.forEach((o) => {
      if (o.tenantName) {
        uniqueTenants.add(o.tenantName.trim());
      }
    });
    
    const sortedTenants = Array.from(uniqueTenants).sort((a, b) => a.localeCompare(b));
    return sortedTenants.map((tenant) => ({
      id: tenant,
      label: tenantRoomCount.get(tenant)!.size > 1 ? `${tenant} +` : tenant,
    }));
  }, [occupancies]);

  // Generate phone options
  const phoneOptions = useMemo(() => {
    const uniquePhones = new Set<string>();
    occupancies.forEach((o) => {
      if (o.tenantPhone) {
        uniquePhones.add(o.tenantPhone.trim());
      }
    });
    
    const sortedPhones = Array.from(uniquePhones).sort();
    return sortedPhones.map((phone) => ({
      id: phone,
      label: phone,
    }));
  }, [occupancies]);

  // Filter and sort occupancies
  const filteredAndSorted = useMemo(() => {
    let filtered = occupancies.filter(occ => {
      // Filter by status
      if (filterStatus === 'active' && !occ.isActive) return false;
      if (filterStatus === 'inactive' && occ.isActive) return false;

      // Filter by room
      if (selectedRoom && String(occ.roomNumber).trim() !== selectedRoom) return false;

      // Filter by tenant
      if (selectedTenant && occ.tenantName.trim() !== selectedTenant) return false;

      // Filter by phone
      if (selectedPhone && occ.tenantPhone.trim() !== selectedPhone) return false;

      // Filter by check-in date range
      if (checkInDateFrom || checkInDateTo) {
        const checkInDate = new Date(occ.checkInDate);
        checkInDate.setHours(0, 0, 0, 0);
        if (checkInDateFrom) {
          const fromDate = new Date(checkInDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (checkInDate < fromDate) return false;
        }
        if (checkInDateTo) {
          const toDate = new Date(checkInDateTo);
          toDate.setHours(0, 0, 0, 0);
          if (checkInDate > toDate) return false;
        }
      }

      // Filter by check-out date range
      if ((checkOutDateFrom || checkOutDateTo) && occ.checkOutDate) {
        const checkOutDate = new Date(occ.checkOutDate);
        checkOutDate.setHours(0, 0, 0, 0);
        if (checkOutDateFrom) {
          const fromDate = new Date(checkOutDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (checkOutDate < fromDate) return false;
        }
        if (checkOutDateTo) {
          const toDate = new Date(checkOutDateTo);
          toDate.setHours(0, 0, 0, 0);
          if (checkOutDate > toDate) return false;
        }
      }

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          occ.tenantName.toLowerCase().includes(term) ||
          occ.roomNumber.toLowerCase().includes(term) ||
          occ.tenantPhone.toLowerCase().includes(term) ||
          occ.tenantCity.toLowerCase().includes(term)
        );
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'tenant') return a.tenantName.localeCompare(b.tenantName);
      if (sortBy === 'room') return a.roomNumber.localeCompare(b.roomNumber);
      // Default: checkIn
      const checkInDifference = new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
      return checkInDifference || b.occupancyId - a.occupancyId;
    });
  }, [occupancies, filterStatus, searchTerm, sortBy, selectedRoom, selectedTenant, selectedPhone, checkInDateFrom, checkInDateTo, checkOutDateFrom, checkOutDateTo]);

  useEffect(() => {
    setVisibleOccupancyCount(occupancyPageSize);
  }, [filteredAndSorted, occupancyPageSize]);

  useEffect(() => {
    const loadMoreTarget = loadMoreRef.current;
    if (!loadMoreTarget || visibleOccupancyCount >= filteredAndSorted.length) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleOccupancyCount(current =>
          Math.min(current + occupancyPageSize, filteredAndSorted.length)
        );
      }
    }, { rootMargin: '300px' });

    observer.observe(loadMoreTarget);
    return () => observer.disconnect();
  }, [filteredAndSorted.length, occupancyPageSize, visibleOccupancyCount]);

  const visibleOccupancies = filteredAndSorted.slice(0, visibleOccupancyCount);

  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const downloadTenantStayPdf = async (occ: OccupancyLink): Promise<void> => {
    setPdfDownloadOccupancyId(occ.occupancyId);
    setError(null);
    try {
      const { createTenantStayPdf } = await import('../tenantStayPdf');
      const [tenantResponse, paymentResponse] = await Promise.all([
        apiService.getTenantById(occ.tenantId),
        apiService.getRentalCollectionByOccupancy(occ.occupancyId),
      ]);
      const tenant = tenantResponse.data;
      const checkInDate = new Date(`${occ.checkInDate.slice(0, 10)}T00:00:00`);
      const stayEndDate = occ.isActive
        ? new Date()
        : occ.checkOutDate
          ? new Date(`${occ.checkOutDate.slice(0, 10)}T00:00:00`)
          : new Date();
      if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(stayEndDate.getTime())) {
        throw new Error('The occupancy dates are invalid, so the stay report cannot be generated.');
      }

      const months: Array<{ year: number; month: number }> = [];
      const cursor = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1);
      const endMonth = new Date(stayEndDate.getFullYear(), stayEndDate.getMonth(), 1);
      while (cursor <= endMonth) {
        months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const electricityResponses = await Promise.all(
        months.map(({ year, month }) =>
          apiService.getTenantChargesForMonth(year, month, occ.tenantId, occ.roomId)
        )
      );
      const electricity: TenantStayElectricityRecord[] = electricityResponses
        .flatMap((response: { data: unknown }) =>
          Array.isArray(response.data) ? response.data as TenantStayElectricityRecord[] : []
        )
        .sort((left, right) =>
          (left.billingYear - right.billingYear) || (left.billingMonth - right.billingMonth)
        );

      const warnings: string[] = [];
      const loadFile = async (path: string | null | undefined, label: string): Promise<TenantStayPdfFile | null> => {
        if (!path) return null;
        const url = getFileUrl(path);
        const name = new URL(url, window.location.origin).pathname.split('/').pop() || label;
        try {
          const file = await downloadFileData(url);
          return { name, contentType: file.contentType, data: file.data };
        } catch (error) {
          console.error(`Unable to include ${label} in tenant stay PDF`, error);
          warnings.push(`${label} could not be downloaded and is not included.`);
          return null;
        }
      };

      const photoPaths = [
        tenant.azurePhotoUrl,
        tenant.photoUrl,
        occ.azurePhotoUrl,
        occ.tenantPhoto,
        tenant.photo2Url,
        tenant.photo3Url,
        tenant.photo4Url,
        tenant.photo5Url,
        tenant.photo6Url,
        tenant.photo7Url,
        tenant.photo8Url,
        tenant.photo9Url,
        tenant.photo10Url,
      ].filter((path): path is string => typeof path === 'string' && path.length > 0);
      const uniquePhotoPaths = [...new Set(photoPaths)];
      const [mainPhoto, ...additionalPhotoFiles] = await Promise.all(
        uniquePhotoPaths.map((path, index) => loadFile(path, index === 0 ? 'Tenant photo' : `Additional tenant photo ${index}`))
      );

      const proofPaths = [
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
      ].filter((path): path is string => typeof path === 'string' && path.length > 0);
      const documentFiles = (await Promise.all(
        proofPaths.map((path, index) => loadFile(path, `Tenant document ${index + 1}`))
      )).filter((file): file is TenantStayPdfFile => file !== null);

      const paymentRecords: TenantStayPaymentRecord[] = Array.isArray(paymentResponse.data)
        ? paymentResponse.data as TenantStayPaymentRecord[]
        : [];
      const stayPayments = paymentRecords
        .sort((left, right) =>
          new Date(left.rentReceivedOn).getTime() - new Date(right.rentReceivedOn).getTime()
        );

      const paymentProofs = await Promise.all(stayPayments.map(async (payment, index) => {
        if (!payment.screenshotUrl) return null;
        const proofUrl = getRentalPaymentProofUrl(
          payment.screenshotUrl,
          payment.rentReceivedOn,
          payment.folder
        );
        return loadFile(proofUrl, `Payment proof ${index + 1}`);
      }));
      documentFiles.push(...paymentProofs.filter((file): file is TenantStayPdfFile => file !== null));

      const currency = (amount: number | null | undefined): string =>
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(amount || 0);
      const date = (value: string | null | undefined): string =>
        value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) : 'Not set';

      const report = await createTenantStayPdf({
        tenant: {
          name: tenant.name || occ.tenantName,
          phone: tenant.phone || occ.tenantPhone,
          address: tenant.address || occ.tenantAddress,
          city: tenant.city || occ.tenantCity,
        },
        stay: {
          roomNumber: occ.roomNumber,
          checkInDate: date(occ.checkInDate),
          checkOutDate: date(occ.checkOutDate),
          status: occ.isActive ? 'Active' : 'Ended',
          monthlyRent: currency(occ.rentFixed),
          depositReceived: currency(occ.advanceCollected),
          depositRefunded: currency(occ.depositRefunded),
          additionalCharges: currency(occ.charges),
        },
        photo: mainPhoto || null,
        documents: [...additionalPhotoFiles, ...documentFiles].filter(
          (file): file is TenantStayPdfFile => file !== null
        ),
        payments: stayPayments.map((payment) => ({
          date: date(payment.rentReceivedOn),
          received: currency(payment.rentReceived),
          charges: currency(payment.charges),
          balance: currency(payment.rentBalance),
          method: payment.modeOfPayment || 'Not recorded',
        })),
        totalReceived: currency(
          stayPayments.reduce((total, payment) => total + (Number(payment.rentReceived) || 0), 0)
        ),
        electricity: electricity.map((record) => ({
          period: `${record.billingMonth}/${record.billingYear}`,
          serviceName: record.serviceName || 'Electricity',
          meterNumber: record.meterNo || 'N/A',
          roomUnits: `${record.totalUnitsForRoom ?? 0}`,
          tenantUnits: `${record.proRataUnits ?? 0}`,
          occupancyDays: `${record.occupancyDaysInMonth ?? 'N/A'} / ${record.totalDaysInMonth ?? 'N/A'}`,
          chargePerUnit: currency(record.chargePerUnit),
          totalCharge: currency(record.totalCharge),
          status: record.status || 'Not recorded',
        })),
      });

      const pdfBuffer = new ArrayBuffer(report.bytes.byteLength);
      new Uint8Array(pdfBuffer).set(report.bytes);
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Tenant-Stay-${occ.tenantName.trim().replace(/[^a-z0-9]+/gi, '-')}-Room-${occ.roomNumber.trim()}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      const allWarnings = [...warnings, ...report.warnings];
      if (allWarnings.length) {
        window.alert(`The PDF downloaded, but some attachments could not be included:\n\n${allWarnings.join('\n')}`);
      }
    } catch (error) {
      console.error('Failed to generate tenant stay PDF:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate tenant stay PDF.');
    } finally {
      setPdfDownloadOccupancyId(null);
    }
  };

  const buildWhatsAppUrl = (occ: OccupancyLink): string | null => {
    const phoneDigits = occ.tenantPhone.replace(/\D/g, '');
    const whatsappPhone = phoneDigits.length === 10
      ? `91${phoneDigits}`
      : phoneDigits.length === 11 && phoneDigits.startsWith('0')
        ? `91${phoneDigits.slice(1)}`
        : phoneDigits.length === 12 && phoneDigits.startsWith('91')
          ? phoneDigits
          : null;

    if (!whatsappPhone) return null;

    const tenantName = occ.tenantName.trim();
    const formatMessageDate = (date: string | null | undefined): string => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };
    const message = [
      'Gnanabi Mansion, Arasaradi, Madurai',
      `Welcome ${tenantName}, Room ${occ.roomNumber.trim()} is confirmed.`,
      `Check-in: ${formatMessageDate(occ.checkInDate)}`,
      `Check-out: ${formatMessageDate(occ.checkOutDate)}`,
      `Rent: ${formatCurrency(occ.rentFixed)} / month (Fixed)`,
      `Deposit: ${formatCurrency(occ.advanceCollected)} (${occ.advanceCollected > 0 ? 'Collected' : 'Pending'})`,
      'Rent Due Date: 1st - 5th of every month',
      'EB Charges: ₹15 / unit (Collected after usage)',
      `Pending: ${formatCurrency(occ.currentPendingPayment)}`,
      'For Help / Escalation:',
      'Level 1 - Manager: 97872 63901',
      'Level 2 - Owner: 99522 33310, 95973 55973',
      'Level 3 - Emergency: Please call Manager / Owner directly',
      'Thank you. Have a pleasant stay.',
      'Gnanabi Mansion',
    ].join('\n');

    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"%3E%3Crect width="48" height="48" fill="%23f1f5f9"/%3E%3Ctext x="24" y="28" font-size="18" text-anchor="middle" fill="%23718396" font-family="Arial,Helvetica,sans-serif">👤</text%3E%3C/svg%3E';
  };

  if (loading) {
    return <LoadingSpinner overlay text="Loading room-tenant linkages" />;
  }

  return (
    <div className="occupancy-links-container">
      {showHeading && <h2 className="section-heading">Occupancy History</h2>}
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

      {/* Statistics Cards */}
      <div className="section-header">
        <h2>Statistics</h2>
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
            <div className="stat-icon">🔗</div>
            <div className="stat-content">
              <h3>Total Linkages</h3>
              <p className="stat-value">{stats.totalOccupancies}</p>
            </div>
          </div>

          <div className="stat-card active">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <h3>Active</h3>
              <p className="stat-value">{stats.activeOccupancies}</p>
            </div>
          </div>

          <div className="stat-card inactive">
            <div className="stat-icon">⊗</div>
            <div className="stat-content">
              <h3>Inactive</h3>
              <p className="stat-value">{stats.inactiveOccupancies}</p>
            </div>
          </div>

          <div className="stat-card collected">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <h3>Rents Collected</h3>
              <p className="stat-value">{formatCurrency(stats.totalRentsCollected)}</p>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>Pending</h3>
              <p className="stat-value">{formatCurrency(stats.totalPendingPayments)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="section-header">
        <h2>Filters & Search</h2>
        <button 
          className={`toggle-btn ${showFilters ? 'expanded' : 'collapsed'}`}
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          {showFilters ? '▼' : '▶'}
        </button>
      </div>

      <div className={`collapsible-content ${showFilters ? 'open' : 'closed'}`}>
        <div className="filters-section">
          {/* Status & Sort Controls Row */}
          <div className="filter-controls">
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({stats.totalOccupancies})
              </button>
              <button
                className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                Active ({stats.activeOccupancies})
              </button>
              <button
                className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
                onClick={() => setFilterStatus('inactive')}
              >
                Inactive ({stats.inactiveOccupancies})
              </button>
            </div>

            <div className="sort-controls">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
                <option value="checkIn">Check-In Date (Newest)</option>
                <option value="tenant">Tenant Name</option>
                <option value="room">Room Number</option>
              </select>
            </div>
          </div>

          {/* Dropdowns Row */}
          <div className="filter-dropdowns">
            <div className="dropdown-container">
              <label>Room:</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="filter-select"
              >
                <option value="">Select room</option>
                {roomOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-container">
              <label>Tenant:</label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="filter-select"
              >
                <option value="">Select tenant</option>
                {tenantOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-container">
              <label>Phone:</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <SearchableDropdown
                  options={phoneOptions}
                  value={selectedPhone}
                  onChange={(option) => setSelectedPhone(String(option?.id || ''))}
                  placeholder="Select phone"
                />
                {selectedPhone && (
                  <button
                    className="clear-filter-btn"
                    onClick={() => setSelectedPhone('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Date Ranges Row */}
          <div className="filter-date-ranges">
            <div className="date-range-container">
              <label>Check-In Date:</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={checkInDateFrom}
                  onChange={(e) => setCheckInDateFrom(e.target.value)}
                  className="date-input"
                  placeholder="From"
                />
                <span className="date-range-sep">to</span>
                <input
                  type="date"
                  value={checkInDateTo}
                  onChange={(e) => setCheckInDateTo(e.target.value)}
                  className="date-input"
                  placeholder="To"
                />
                {(checkInDateFrom || checkInDateTo) && (
                  <button
                    className="clear-filter-btn"
                    onClick={() => {
                      setCheckInDateFrom('');
                      setCheckInDateTo('');
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="date-range-container">
              <label>Check-Out Date:</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={checkOutDateFrom}
                  onChange={(e) => setCheckOutDateFrom(e.target.value)}
                  className="date-input"
                  placeholder="From"
                />
                <span className="date-range-sep">to</span>
                <input
                  type="date"
                  value={checkOutDateTo}
                  onChange={(e) => setCheckOutDateTo(e.target.value)}
                  className="date-input"
                  placeholder="To"
                />
                {(checkOutDateFrom || checkOutDateTo) && (
                  <button
                    className="clear-filter-btn"
                    onClick={() => {
                      setCheckOutDateFrom('');
                      setCheckOutDateTo('');
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy History Table */}
      <div className="table-wrapper">
        <table className="occupancy-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Room</th>
              <th>Tenant</th>
              <th>Phone</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Rent Fixed</th>
              <th>Last Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length > 0 ? (
              visibleOccupancies.map(occ => {
                const whatsappUrl = buildWhatsAppUrl(occ);
                return (
                <tr key={occ.occupancyId} className={`row ${occ.isActive ? 'active' : 'inactive'}`}>
                  <td className="status-cell" data-label="Status">
                    {occ.tenantPhoto ? (
                      (() => {
                        // Prefer explicit azurePhotoUrl if provided by API, otherwise handle absolute URLs
                        const azureUrl = (occ as any).azurePhotoUrl as string | undefined;
                        let resolved = '';
                        if (azureUrl) {
                          resolved = azureUrl;
                        } else if (occ.tenantPhoto) {
                          if (occ.tenantPhoto.startsWith('http://') || occ.tenantPhoto.startsWith('https://')) {
                            resolved = occ.tenantPhoto;
                          } else {
                            resolved = getFileUrl(occ.tenantPhoto);
                          }
                        }

                        if (import.meta.env.DEV) {
                          // eslint-disable-next-line no-console
                          console.log('[OccupancyLinks] tenantPhoto:', occ.tenantPhoto, 'azurePhotoUrl:', azureUrl, 'resolvedUrl:', resolved);
                        }

                        if (!resolved) {
                          return (
                            <div
                              className="status-thumb placeholder"
                              title={`View photos for ${occ.tenantName}`}
                              onClick={() => {
                                const tenant = buildTenantFromOccupancy(occ);
                                setGalleryInitialPhotoIndex(0);
                                setGalleryInitialTab('photos');
                                setGalleryTenant(tenant);
                              }}
                            >
                              {occ.tenantName ? occ.tenantName.charAt(0).toUpperCase() : '👤'}
                            </div>
                          );
                        }

                        return (
                          <img
                            src={resolved}
                            alt={occ.tenantName}
                            className="status-thumb"
                            loading="lazy"
                            onError={handleImageError}
                            title={`View photos for ${occ.tenantName}`}
                            onClick={() => {
                              const tenant = buildTenantFromOccupancy(occ);
                              setGalleryInitialPhotoIndex(0);
                              setGalleryInitialTab('photos');
                              setGalleryTenant(tenant);
                            }}
                          />
                        );
                      })()
                    ) : (
                      <div className="status-thumb placeholder">{occ.tenantName ? occ.tenantName.charAt(0).toUpperCase() : '👤'}</div>
                    )}
                    <span className={`badge ${occ.isActive ? 'active' : 'inactive'}`}>
                      {occ.isActive ? '🟢 Active' : '🔴 Ended'}
                    </span>
                  </td>
                  <td className="room-cell" data-label="Room">
                    <strong>#{occ.roomNumber.trim()}</strong>
                    <small>{occ.beds} bed{occ.beds > 1 ? 's' : ''}</small>
                  </td>
                  <td className="tenant-cell" data-label="Tenant">
                    <strong>{occ.tenantName.trim()}</strong>
                    <small>{occ.tenantCity.trim()}</small>
                  </td>
                  <td className="phone-cell" data-label="Phone">
                    <a href={`tel:${occ.tenantPhone.trim()}`}>{occ.tenantPhone.trim()}</a>
                  </td>
                  <td data-label="Check-in">{formatDate(occ.checkInDate)}</td>
                  <td data-label="Check-out">{occ.checkOutDate ? formatDate(occ.checkOutDate) : '-'}</td>
                  <td className="currency-cell" data-label="Rent fixed">
                    <strong>{formatCurrency(occ.rentFixed)}</strong>
                  </td>
                  <td data-label="Last payment">{occ.lastPaymentDate ? formatDate(occ.lastPaymentDate) : '-'}</td>
                  <td className="actions-cell" data-label="Actions">
                    <div className="actions-popup-container" data-actions-popup>
                      <button
                        type="button"
                        className="actions-popup-trigger"
                        aria-expanded={openActionsOccupancyId === occ.occupancyId}
                        aria-haspopup="menu"
                        aria-label={`Open actions for ${occ.tenantName.trim()}`}
                        title="Actions"
                        onClick={() => setOpenActionsOccupancyId((current) =>
                          current === occ.occupancyId ? null : occ.occupancyId
                        )}
                      >
                        <span aria-hidden="true">⋮</span>
                      </button>

                      {openActionsOccupancyId === occ.occupancyId && (
                        <div className="actions-popup-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            className="actions-popup-item"
                            onClick={() => {
                              setOpenActionsOccupancyId(null);
                              const tenant = buildTenantFromOccupancy(occ);
                              setFullScreenTenant(tenant);
                            }}
                          >
                            <span className="actions-popup-icon">📜</span>
                            <span>Tenant history</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="actions-popup-item"
                            onClick={() => {
                              setOpenActionsOccupancyId(null);
                              const tenant = buildTenantFromOccupancy(occ);
                              setGalleryInitialPhotoIndex(0);
                              setGalleryInitialTab('photos');
                              setGalleryTenant(tenant);
                            }}
                          >
                            <span className="actions-popup-icon">📷</span>
                            <span>Photos</span>
                          </button>

                          {whatsappUrl ? (
                            <a
                              role="menuitem"
                              className="actions-popup-item"
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenActionsOccupancyId(null)}
                            >
                              <span className="actions-popup-icon whatsapp-popup-icon"><WhatsAppIcon /></span>
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              role="menuitem"
                              className="actions-popup-item"
                              disabled
                            >
                              <span className="actions-popup-icon whatsapp-popup-icon"><WhatsAppIcon /></span>
                              <span>WhatsApp unavailable</span>
                            </button>
                          )}

                          <button
                            type="button"
                            role="menuitem"
                            className="actions-popup-item"
                            onClick={() => {
                              setOpenActionsOccupancyId(null);
                              void downloadTenantStayPdf(occ);
                            }}
                            disabled={pdfDownloadOccupancyId === occ.occupancyId}
                          >
                            <span className="actions-popup-icon pdf-popup-icon"><PdfIcon /></span>
                            <span>{pdfDownloadOccupancyId === occ.occupancyId ? 'Preparing PDF...' : 'Download PDF'}</span>
                          </button>

                          {occ.isActive && (
                            <button
                              type="button"
                              role="menuitem"
                              className="actions-popup-item actions-popup-checkout"
                              onClick={() => {
                                setOpenActionsOccupancyId(null);
                                setSelectedOccupancy(occ);
                              }}
                            >
                              <span className="actions-popup-icon">✓</span>
                              <span>Checkout tenant</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr className="no-data">
                <td colSpan={9}>
                  <p>📭 No occupancy history found matching your criteria</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filteredAndSorted.length > 0 && (
        <div className="occupancy-load-more" ref={loadMoreRef}>
          <span>
            Showing {visibleOccupancies.length} of {filteredAndSorted.length} bookings
          </span>
          {visibleOccupancies.length < filteredAndSorted.length && (
            <button
              type="button"
              onClick={() => setVisibleOccupancyCount(current =>
                Math.min(current + occupancyPageSize, filteredAndSorted.length)
              )}
            >
              Load more
            </button>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {selectedOccupancy && (
        <CheckoutModal
          occupancyId={selectedOccupancy.occupancyId}
          tenantName={selectedOccupancy.tenantName}
          roomNumber={selectedOccupancy.roomNumber}
          checkInDate={selectedOccupancy.checkInDate}
          onClose={() => {
            setSelectedOccupancy(null);
          }}
          onCheckoutSuccess={() => {
            setSelectedOccupancy(null);
            // Refresh the occupancies list
            const fetchOccupancies = async () => {
              try {
                const data = await getOccupancyLinks();
                setOccupancies(data);
              } catch (err) {
                console.error('Error refreshing occupancies:', err);
              }
            };
            fetchOccupancies();
          }}
        />
      )}

      {fullScreenTenant && (
        <TenantFullScreenView
          tenant={fullScreenTenant}
          onClose={() => setFullScreenTenant(null)}
        />
      )}

      {galleryTenant && (
        <TenantPhotoGalleryModal
          tenant={galleryTenant}
          onClose={() => setGalleryTenant(null)}
          initialPhotoIndex={galleryInitialPhotoIndex}
          initialProofIndex={galleryInitialProofIndex}
          initialTab={galleryInitialTab}
        />
      )}
    </div>
  );
}
