import { useState, useEffect } from 'react';
import { apiService, getRentalPaymentProofUrl } from '../api';
import { useAuth } from './AuthContext';
import SearchableDropdown from './SearchableDropdown';
import LoadingSpinner from './LoadingSpinner';
import TransactionManagement from './TransactionManagement';
import PaymentTracking from './PaymentTracking';
import './RentalCollectionDetails.css';

interface OccupancyInfo {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  rentFixed: number;
  proRataRent: number;
  totalRentReceived: number;
  totalCharges: number;
  paymentRecordsCount: number;
  lastPaymentDate: string | null;
  checkInDate: string;
  checkOutDate: string | null;
}

interface MonthlyPaymentStatus {
  occupancyId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  rentFixed: number;
  rentReceivedOn: string | null;
  rentReceived: number;
  charges: number;
  month: number;
  year: number;
  checkInDate: string;
  checkOutDate: string | null;
  screenshotUrl: string | null;
  folder: string | null;
  modeOfPayment?: string | null;
  paymentStatus: 'paid' | 'partial' | 'pending' | 'merged';
  proRataRent: number;
  rentBalance: number;
  occupancyDays: number;
  reviewDecision: TenantReviewDecision;
  reviewComment: string | null;
  reviewVerifiedBy: string | null;
  reviewVerifiedOn: string | null;
}

type TenantReviewDecision = 'approved' | 'rejected' | null;
type PaymentStatusFilter = 'paid' | 'pending' | 'partial' | 'merged' | 'approved' | 'rejected' | null;

interface TenantReviewState {
  decision: TenantReviewDecision;
  comment: string;
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
  roomNumber: string;
}

interface FormData {
  rentFixed: string;
  rentReceived: string;
  charges: string;
  modeOfPayment: string;
  rentReceivedOn: string;
  screenshot: File | null;
}

function getDefaultMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const getPreviousMonthValue = (monthValue?: string): string => {
  if (!monthValue) {
    return '';
  }

  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) {
    return '';
  }

  let previousYear = year;
  let previousMonth = month - 1;

  if (previousMonth === 0) {
    previousMonth = 12;
    previousYear -= 1;
  }

  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
};

export default function RentalCollectionDetails() {
  const { hasRole, hasAnyRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'collection' | 'tracking'>('collection');
  const [occupancyOptions, setOccupancyOptions] = useState<OccupancyOption[]>([]);
  const [selectedOccupancyId, setSelectedOccupancyId] = useState<number | null>(null);
  const [occupancyInfo, setOccupancyInfo] = useState<OccupancyInfo | null>(null);
  const [rentalRecords, setRentalRecords] = useState<RentalRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<{ url: string; alt: string } | null>(null);
  const [editingRecord, setEditingRecord] = useState<RentalRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<RentalRecord & { screenshot: File | null }>>({})
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(getDefaultMonthValue());
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    rentFixed: '',
    rentReceived: '',
    charges: '',
    modeOfPayment: 'cash',
    rentReceivedOn: new Date().toISOString().split('T')[0],
    screenshot: null
  });
  const [currentMonthPayments, setCurrentMonthPayments] = useState<MonthlyPaymentStatus[]>([]);
  const [currentMonthLoading, setCurrentMonthLoading] = useState(false);
  const [currentMonthError, setCurrentMonthError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<PaymentStatusFilter>(null);
  const [tenantReviews, setTenantReviews] = useState<Record<number, TenantReviewState>>({});
  const [expandedReviewRows, setExpandedReviewRows] = useState<Record<number, boolean>>({});
  const [savingReviewRows, setSavingReviewRows] = useState<Record<number, boolean>>({});
  const [showIncomeTransactions, setShowIncomeTransactions] = useState(false);
  const [selectedIncomeRoom, setSelectedIncomeRoom] = useState<string | null>(null);
  const [selectedIncomeOccupancyId, setSelectedIncomeOccupancyId] = useState<number | null>(null);
  const [tenantInfoPopup, setTenantInfoPopup] = useState<{
    open: boolean;
    tenantName: string;
    checkInDate: string;
    rentFixed: number | null;
    phoneNumber: string;
    advancePaid: number | null;
    x: number;
    y: number;
  }>({
    open: false,
    tenantName: '',
    checkInDate: '',
    rentFixed: null,
    phoneNumber: '',
    advancePaid: null,
    x: 0,
    y: 0
  });
  const [occupancyDetailMap, setOccupancyDetailMap] = useState<Record<number, {
    checkInDate: string;
    rentFixed: number;
    phoneNumber: string;
    advanceCollected: number;
  }>>({});
  const [ebDetailsPopup, setEbDetailsPopup] = useState<{
    open: boolean;
    roomNumber: string;
    monthLabel: string;
    loading: boolean;
    error: string | null;
    records: any[];
  }>({
    open: false,
    roomNumber: '',
    monthLabel: '',
    loading: false,
    error: null,
    records: []
  });

  const currentMonthYear = selectedMonthFilter;

  const getEffectiveStatus = (
    payment: Pick<MonthlyPaymentStatus, 'rentFixed' | 'proRataRent' | 'paymentStatus'>
  ): 'paid' | 'pending' | 'partial' | 'merged' => {
    if (payment.proRataRent === 0 || payment.rentFixed === 0) return 'merged';
    return payment.paymentStatus;
  };

  const paidOccupancyIds = new Set(
    currentMonthPayments
      .filter((payment) => getEffectiveStatus(payment) === 'paid')
      .map((payment) => payment.occupancyId)
  );

  const roomFilterOptions = Array.from(
    new Set(currentMonthPayments.map((payment) => payment.roomNumber))
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

  const roomFilteredPayments = currentMonthPayments.filter((payment) =>
    selectedRoomFilter === 'all' ? true : payment.roomNumber === selectedRoomFilter
  );

  const getReviewDecision = (item: MonthlyPaymentStatus): TenantReviewDecision => {
    return tenantReviews[item.occupancyId]?.decision ?? item.reviewDecision ?? null;
  };

  const filteredCurrentMonthPayments = roomFilteredPayments.filter((payment) => {
    if (!selectedStatusFilter) return true;
    if (selectedStatusFilter === 'approved' || selectedStatusFilter === 'rejected') {
      return getReviewDecision(payment) === selectedStatusFilter;
    }
    return getEffectiveStatus(payment) === selectedStatusFilter;
  });

  const paidCount = roomFilteredPayments.filter((item) => getEffectiveStatus(item) === 'paid').length;
  const partialCount = roomFilteredPayments.filter((item) => getEffectiveStatus(item) === 'partial').length;
  const pendingCount = roomFilteredPayments.filter((item) => getEffectiveStatus(item) === 'pending').length;
  const mergedCount = roomFilteredPayments.filter((item) => getEffectiveStatus(item) === 'merged').length;
  const approvedCount = roomFilteredPayments.filter((item) => getReviewDecision(item) === 'approved').length;
  const rejectedCount = roomFilteredPayments.filter((item) => getReviewDecision(item) === 'rejected').length;
  const totalReceivedAmount = roomFilteredPayments.reduce((sum, item) => sum + (item.rentReceived || 0), 0);
  const totalChargesAmount = roomFilteredPayments.reduce((sum, item) => sum + Number(item.charges || 0), 0);
  const totalPendingBalanceAmount = roomFilteredPayments.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        item.rentBalance ?? (item.proRataRent - ((item.rentReceived || 0) + Number(item.charges || 0)))
      ),
    0
  );
  const canChangeReviewStatus = hasAnyRole(['admin', 'accountant']) || !hasRole('manager');

  const getProofUrl = (
    screenshotUrl: string | null,
    paymentDate?: string | null,
    containerName?: string | null
  ): string => {
    if (!screenshotUrl) return '';
    return getRentalPaymentProofUrl(screenshotUrl, paymentDate, containerName);
  };

  const openEbDetails = async (roomNumber: string, monthValue?: string) => {
    const selectedMonthValue = monthValue || selectedMonthFilter;
    const previousMonthValue = getPreviousMonthValue(selectedMonthValue);

    if (!previousMonthValue) {
      return;
    }

    const [yearText, monthText] = previousMonthValue.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) {
      return;
    }

    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    setEbDetailsPopup({
      open: true,
      roomNumber,
      monthLabel,
      loading: true,
      error: null,
      records: []
    });

    try {
      const response = await apiService.getRoomMonthlyEbReport(year, month);
      const allRecords = Array.isArray(response.data?.data) ? response.data.data : [];
      const roomRecords = allRecords.filter((record: any) => {
        const sameRoom = String(record.roomNumber ?? '').trim() === String(roomNumber ?? '').trim();
        return sameRoom && (Number(record.totalAmount || 0) > 0 || record.unitsConsumed || record.startingReading || record.endingReading);
      });

      setEbDetailsPopup({
        open: true,
        roomNumber,
        monthLabel,
        loading: false,
        error: roomRecords.length ? null : 'No EB readings found for this room in the previous month.',
        records: roomRecords
      });
    } catch (err) {
      setEbDetailsPopup({
        open: true,
        roomNumber,
        monthLabel,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load previous month EB details.',
        records: []
      });
    }
  };

  const closeEbDetails = () => {
    setEbDetailsPopup({
      open: false,
      roomNumber: '',
      monthLabel: '',
      loading: false,
      error: null,
      records: []
    });
  };

  const renderPaymentModeIcon = (mode?: string | null) => {
    const rawMode = (mode || '').trim();
    const normalizedMode = rawMode.toLowerCase();
    const compactMode = normalizedMode.replace(/\s+|\.|-/g, '');

    if (!rawMode) {
      return <span className="payment-mode-icon placeholder" title="Payment mode not set" aria-label="Payment mode not set">—</span>;
    }

    const isCashMode =
      normalizedMode === 'cash' ||
      normalizedMode === 'பணம்' ||
      compactMode === 'பணம்' ||
      normalizedMode === 'money';

    if (isCashMode) {
      return (
        <span className="payment-mode-icon money" title="Cash" aria-label="Cash">
          <img src="/cash.jpg" alt="Cash" />
        </span>
      );
    }

    const isCheckoutMode =
      normalizedMode === 'checkout' ||
      normalizedMode === 'check out' ||
      compactMode === 'checkout' ||
      compactMode === 'checkoutpayment';

    if (isCheckoutMode) {
      return (
        <span className="payment-mode-icon checkout" title="Checkout" aria-label="Checkout">
          <img src="/checkout.jpg" alt="Checkout" />
        </span>
      );
    }

    const isGpayMode =
      normalizedMode === 'gpay' ||
      normalizedMode === 'google pay' ||
      normalizedMode === 'googlepay' ||
      normalizedMode === 'g-pay' ||
      normalizedMode === 'g. pay' ||
      normalizedMode === 'g.pay' ||
      compactMode === 'gpay' ||
      compactMode === 'googlepay' ||
      compactMode === 'gpay' ||
      normalizedMode === 'g. pay';

    if (isGpayMode) {
      return (
        <span className="payment-mode-icon gpay" title="Google Pay" aria-label="Google Pay">
          <img src="/gpay.png" alt="Google Pay" />
        </span>
      );
    }

    return <span className="payment-mode-icon other" title={rawMode || 'Other'} aria-label={rawMode || 'Other'}>{rawMode}</span>;
  };

  const compareRoomNumbers = (left: string, right: string): number =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getBalanceTooltip = (item: MonthlyPaymentStatus): string => {
    const [filterYear, filterMonth] = selectedMonthFilter.split('-').map(Number);
    const year = item.year || filterYear || new Date().getFullYear();
    const month = item.month || filterMonth || (new Date().getMonth() + 1);
    const daysInMonth = getDaysInMonth(month, year);
    const occupancyDays = item.occupancyDays || daysInMonth;
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });

    return `Occupancy: ${occupancyDays} of ${daysInMonth} days in ${monthName} ${year}\nPro-rata rent balance`;
  };

  const fetchCurrentMonthPayments = async () => {
    try {
      setCurrentMonthLoading(true);
      setCurrentMonthError(null);
      const response = await apiService.getPaymentsByMonth(currentMonthYear);
      const records = ((response.data || response || []) as MonthlyPaymentStatus[]).sort(
        (a: MonthlyPaymentStatus, b: MonthlyPaymentStatus) =>
          compareRoomNumbers(a.roomNumber, b.roomNumber)
      );

      setCurrentMonthPayments(records);
      setTenantReviews(
        records.reduce<Record<number, TenantReviewState>>((accumulator, record) => {
          accumulator[record.occupancyId] = {
            decision: record.reviewDecision || null,
            comment: record.reviewComment || ''
          };

          return accumulator;
        }, {})
      );
    } catch (err) {
      console.error('Error fetching current month payments:', err);
      setCurrentMonthError('Failed to load current month occupied room status.');
    } finally {
      setCurrentMonthLoading(false);
    }
  };

  const formatMonthTitle = (monthYear: string): string => {
    const [year, month] = monthYear.split('-').map(Number);
    if (!year || !month) {
      return monthYear;
    }

    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Load occupancy options on mount
  useEffect(() => {
    fetchOccupancies();
    fetchCurrentMonthPayments();
  }, []);

  // Re-fetch when month filter changes
  useEffect(() => {
    fetchCurrentMonthPayments();
  }, [currentMonthYear]);

  // Reset room filter and status filter when month changes
  useEffect(() => {
    setSelectedRoomFilter('all');
    setSelectedStatusFilter(null);
  }, [currentMonthYear]);

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
          roomNumber: occupancy.roomNumber.trim(),
          sortKey: checkOutTime
        };
      });
      
      const sortedOptions = optionsWithDates.sort((a: any, b: any) =>
        compareRoomNumbers(a.roomNumber, b.roomNumber) || b.sortKey - a.sortKey
      );
      
      const options = sortedOptions.map(
        ({ id, label, roomNumber }: { id: number; label: string; roomNumber: string }) => ({
          id,
          label,
          roomNumber
        })
      );

      type OccupancyDetail = {
        checkInDate: string;
        rentFixed: number;
        phoneNumber: string;
        advanceCollected: number;
      };

      const detailMap = occupancies.reduce(
        (accumulator: Record<number, OccupancyDetail>, occupancy: any) => {
          const occupancyId = Number(occupancy.occupancyId || occupancy.id);
          if (!Number.isFinite(occupancyId)) {
            return accumulator;
          }

          accumulator[occupancyId] = {
            checkInDate: occupancy.checkInDate || '',
            rentFixed: Number(occupancy.rentFixed ?? occupancy.roomRent ?? 0),
            phoneNumber: occupancy.tenantPhone || 'N/A',
            advanceCollected: Number(occupancy.advanceCollected ?? 0)
          };
          return accumulator;
        },
        {} as Record<number, OccupancyDetail>
      );

      setOccupancyOptions(options);
      setOccupancyDetailMap(detailMap);
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
  }, [selectedOccupancyId, currentMonthYear]);

  const fetchRentalDetails = async () => {
    if (!selectedOccupancyId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, recordsRes, chargesRes] = await Promise.all([
        apiService.getRentalSummaryByOccupancy(selectedOccupancyId),
        apiService.getRentalCollectionByOccupancy(selectedOccupancyId),
        apiService.getPreviousMonthCharges(selectedOccupancyId, currentMonthYear)
      ]);
      
      setOccupancyInfo(summaryRes.data || summaryRes);
      setRentalRecords(recordsRes.data || recordsRes || []);
      
      // Auto-populate charges field with previous month's electricity charges
      const previousMonthCharges = chargesRes.data || chargesRes;
      const chargesAmount = previousMonthCharges?.totalCharges || 0;
      
      setFormData(prev => ({
        ...prev,
        rentFixed: summaryRes.data?.rentFixed != null ? String(summaryRes.data.rentFixed) : prev.rentFixed,
        charges: chargesAmount > 0 ? chargesAmount.toString() : ''
      }));
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

      const paymentDate = formData.rentReceivedOn || new Date().toISOString().split('T')[0];
      const selectedPaymentMode = formData.modeOfPayment || 'cash';

      if (selectedPaymentMode === 'checkout') {
        const shouldProceedWithCheckout = window.confirm(
          'This will save payment and check out the room on the selected payment date. Do you want to continue?'
        );

        if (!shouldProceedWithCheckout) {
          setLoading(false);
          return;
        }
      }

      const formDataToSend = new FormData();
      formDataToSend.append('occupancyId', selectedOccupancyId.toString());
      formDataToSend.append('rentFixed', formData.rentFixed || String(occupancyInfo?.rentFixed || 0));
      formDataToSend.append('rentReceived', formData.rentReceived);
      formDataToSend.append('charges', formData.charges || '0');
      formDataToSend.append('modeOfPayment', selectedPaymentMode);
      formDataToSend.append('rentReceivedOn', paymentDate);
      
      if (formData.screenshot) {
        formDataToSend.append('screenshot', formData.screenshot);
      }

      const response = await apiService.uploadPaymentScreenshot(
        formDataToSend,
        setUploadProgress
      );

      let checkoutWarning: string | null = null;
      if (selectedPaymentMode === 'checkout') {
        try {
          const parsedCharges = formData.charges ? parseFloat(formData.charges) : 0;
          await apiService.checkoutOccupancy(
            selectedOccupancyId,
            paymentDate,
            undefined,
            Number.isFinite(parsedCharges) ? parsedCharges : 0
          );
        } catch (checkoutError) {
          checkoutWarning = checkoutError instanceof Error
            ? `Payment saved, but checkout failed: ${checkoutError.message}`
            : 'Payment saved, but checkout failed.';
          console.error('Checkout failed after payment save:', checkoutError);
        }
      }

      // Reset form and refresh data
      setFormData({
        rentFixed: occupancyInfo?.rentFixed != null ? String(occupancyInfo.rentFixed) : '',
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
      await fetchCurrentMonthPayments();
      await fetchOccupancies();

      if (checkoutWarning) {
        setError(checkoutWarning);
      }
      
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

  const handleEditClick = (record: RentalRecord) => {
    setEditingRecord(record);
    setEditFormData({
      rentFixed: record.rentFixed,
      rentReceived: record.rentReceived,
      charges: record.charges,
      modeOfPayment: record.modeOfPayment || 'cash',
      rentReceivedOn: new Date(record.rentReceivedOn).toISOString().split('T')[0]
    });
  };

  const handleDeleteRecord = async (record: RentalRecord) => {
    const paymentDate = new Date(record.rentReceivedOn).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const shouldDelete = window.confirm(
      `Are you sure you want to delete the payment for ${record.tenantName} on ${paymentDate}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiService.deleteRentalRecord(record.id);
      await fetchRentalDetails();
      await fetchCurrentMonthPayments();
      await fetchOccupancies();
      alert('Payment deleted successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete payment';
      setError(errorMsg);
      alert(errorMsg);
      console.error('Error deleting payment record:', err);
    } finally {
      setLoading(false);
    }
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
      setUploadProgress(0);

      const paymentDate = editFormData.rentReceivedOn?.toString() || '';
      const selectedPaymentMode = editFormData.modeOfPayment?.toString() || 'cash';

      if (selectedPaymentMode === 'checkout') {
        const shouldProceedWithCheckout = window.confirm(
          'This will update payment and check out the room on the payment date. Do you want to continue?'
        );

        if (!shouldProceedWithCheckout) {
          setLoading(false);
          return;
        }
      }
      
      // Create FormData for update
      const updateData = new FormData();
      updateData.append('occupancyId', editingRecord.occupancyId.toString());
      updateData.append('rentFixed', editFormData.rentFixed?.toString() || String(editingRecord.rentFixed || 0));
      updateData.append('rentReceived', editFormData.rentReceived?.toString() || '0');
      updateData.append('charges', editFormData.charges?.toString() || '0');
      updateData.append('modeOfPayment', selectedPaymentMode);
      updateData.append('rentReceivedOn', paymentDate);
      
      if (editFormData.screenshot) {
        updateData.append('screenshot', editFormData.screenshot);
      }

      // Use the uploadPaymentScreenshot method which handles both create and update
      // Pass progress callback for file upload feedback
      await apiService.uploadPaymentScreenshot(updateData, (progress) => {
        setUploadProgress(progress);
      });

      let checkoutWarning: string | null = null;
      if (selectedPaymentMode === 'checkout' && paymentDate) {
        try {
          const parsedCharges = Number(editFormData.charges || 0);
          await apiService.checkoutOccupancy(
            editingRecord.occupancyId,
            paymentDate,
            undefined,
            Number.isFinite(parsedCharges) ? parsedCharges : 0
          );
        } catch (checkoutError) {
          checkoutWarning = checkoutError instanceof Error
            ? `Payment updated, but checkout failed: ${checkoutError.message}`
            : 'Payment updated, but checkout failed.';
          console.error('Checkout failed after payment update:', checkoutError);
        }
      }

      // Refresh rental details
      await fetchRentalDetails();
      await fetchCurrentMonthPayments();
      await fetchOccupancies();

      if (checkoutWarning) {
        setError(checkoutWarning);
      }
      
      // Close modal
      handleCancelEdit();
      
      // Show success
      alert(checkoutWarning ? 'Payment updated. Checkout failed; please retry from occupancy checkout.' : 'Payment updated successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update payment';
      setError(errorMsg);
      alert(errorMsg);
      console.error('Error updating payment:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
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

  const getTotalReceived = (rentReceived: number, charges: number): number =>
    Number(rentReceived || 0) + Number(charges || 0);

  const getDisplayBalance = (record: RentalRecord): number => {
    const storedBalance = Number(record.rentBalance || 0);
    if (storedBalance > 0) {
      return storedBalance;
    }

    // Fallback when legacy records have 0 in RentBalance even for partial payments.
    const fallback = Number(record.rentFixed || 0) - (Number(record.rentReceived || 0) + Number(record.charges || 0));
    return Math.max(0, fallback);
  };

  const openProofPreview = (url: string, alt: string) => {
    setProofPreview({ url, alt });
  };

  const openTenantInfoPopup = (event: React.MouseEvent<HTMLButtonElement>, item: MonthlyPaymentStatus) => {
    const occupancyDetails = occupancyDetailMap[item.occupancyId];
    setTenantInfoPopup({
      open: true,
      tenantName: item.tenantName,
      checkInDate: occupancyDetails?.checkInDate || item.checkInDate || 'N/A',
      rentFixed: occupancyDetails?.rentFixed ?? item.rentFixed ?? null,
      phoneNumber: occupancyDetails?.phoneNumber || 'N/A',
      advancePaid: occupancyDetails?.advanceCollected ?? null,
      x: event.clientX,
      y: event.clientY
    });
  };

  const closeTenantInfoPopup = () => {
    setTenantInfoPopup((prev) => ({ ...prev, open: false }));
  };

  const formatReviewSavedDate = (value: string | null): string | null => {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate.toLocaleDateString('en-IN');
  };

  const applySavedReviewToPayments = (
    occupancyId: number,
    review: {
      reviewDecision: TenantReviewDecision;
      reviewComment: string | null;
      reviewVerifiedBy: string | null;
      reviewVerifiedOn: string | null;
    }
  ) => {
    setCurrentMonthPayments((prev) =>
      prev.map((payment) =>
        payment.occupancyId === occupancyId
          ? {
              ...payment,
              ...review
            }
          : payment
      )
    );
  };

  const persistTenantReview = async (occupancyId: number, review: TenantReviewState) => {
    try {
      setSavingReviewRows((prev) => ({
        ...prev,
        [occupancyId]: true
      }));

      const response = await apiService.saveRentalReview(occupancyId, {
        monthYear: currentMonthYear,
        decision: review.decision,
        comment: review.comment.trim() || null
      });

      const savedReview = response.data || response;

      setTenantReviews((prev) => ({
        ...prev,
        [occupancyId]: {
          decision: savedReview.reviewDecision || null,
          comment: savedReview.reviewComment || ''
        }
      }));

      applySavedReviewToPayments(occupancyId, {
        reviewDecision: savedReview.reviewDecision || null,
        reviewComment: savedReview.reviewComment || null,
        reviewVerifiedBy: savedReview.reviewVerifiedBy || null,
        reviewVerifiedOn: savedReview.reviewVerifiedOn || null
      });
    } catch (reviewError) {
      console.error('Error saving tenant review:', reviewError);
      setError(reviewError instanceof Error ? reviewError.message : 'Failed to save rental review.');
    } finally {
      setSavingReviewRows((prev) => ({
        ...prev,
        [occupancyId]: false
      }));
    }
  };

  const handleTenantReviewDecision = async (occupancyId: number, decision: Exclude<TenantReviewDecision, null>) => {
    const existingReview = tenantReviews[occupancyId] || { decision: null, comment: '' };
    const nextReview: TenantReviewState = {
      decision,
      comment: existingReview.comment || ''
    };

    setTenantReviews((prev) => ({
      ...prev,
      [occupancyId]: nextReview
    }));

    setExpandedReviewRows((prev) => ({
      ...prev,
      [occupancyId]: false
    }));

    await persistTenantReview(occupancyId, nextReview);
  };

  const handleTenantReviewComment = (occupancyId: number, comment: string) => {
    setTenantReviews((prev) => ({
      ...prev,
      [occupancyId]: {
        decision: prev[occupancyId]?.decision ?? null,
        comment
      }
    }));
  };

  const handleTenantReviewBlur = async (event: React.FocusEvent<HTMLTextAreaElement>, occupancyId: number) => {
    const nextFocusedElement = event.relatedTarget as HTMLElement | null;

    // If focus moves to approve/reject actions, let that click path handle persistence.
    if (nextFocusedElement?.closest('.tenant-review-actions')) {
      return;
    }

    const review = tenantReviews[occupancyId] || { decision: null, comment: '' };
    await persistTenantReview(occupancyId, review);
  };

  const toggleTenantReviewPanel = (occupancyId: number) => {
    setExpandedReviewRows((prev) => ({
      ...prev,
      [occupancyId]: !prev[occupancyId]
    }));
  };

  if (loading && !occupancyInfo) {
    return (
      <div className="rental-collection-details">
        <LoadingSpinner text="Loading rental collection details" />
      </div>
    );
  }

  return (
    <div className="rental-collection-details">
      <h2 className="section-heading">Rental Collection</h2>
      <div className="rental-collection-tabs" role="tablist" aria-label="Rental collection views">
        <button
          type="button"
          className={`rental-collection-tab ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveTab('collection')}
          role="tab"
          aria-selected={activeTab === 'collection'}
        >
          Collection
        </button>
        {hasAnyRole(['admin', 'manager', 'accountant']) && (
          <button
            type="button"
            className={`rental-collection-tab ${activeTab === 'tracking' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracking')}
            role="tab"
            aria-selected={activeTab === 'tracking'}
          >
            Payment Tracking
          </button>
        )}
      </div>

      {activeTab === 'tracking' ? (
        <PaymentTracking />
      ) : (
        <>
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
              label: opt.label,
              optionClassName: paidOccupancyIds.has(opt.id) ? 'paid-occupancy-option' : '',
              optionBadgeText: paidOccupancyIds.has(opt.id) ? 'Paid' : undefined,
              optionBadgeVariant: paidOccupancyIds.has(opt.id) ? 'success' : undefined
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
              <div className="card-label">Total Received (Rent + Charges)</div>
              <div className="card-value received">{formatCurrency(getTotalReceived(occupancyInfo.totalRentReceived, occupancyInfo.totalCharges))}</div>
              <div className="card-subtext">{occupancyInfo.paymentRecordsCount} payment(s)</div>
            </div>

            <div className="summary-card">
              <div className="card-label">Total Charges</div>
              <div className="card-value charges">{formatCurrency(occupancyInfo.totalCharges)}</div>
            </div>

            <div className="summary-card">
              <div className="card-label">Outstanding Balance (Est.)</div>
              <div className="card-value balance">
                {formatCurrency(Math.max(0, occupancyInfo.proRataRent - (occupancyInfo.totalRentReceived + occupancyInfo.totalCharges)))}
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
                    <label htmlFor="rentFixed">Fixed Rent (₹)</label>
                    <input
                      type="number"
                      id="rentFixed"
                      name="rentFixed"
                      value={formData.rentFixed}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

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
                      <option value="checkout">CheckOut</option>
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
                        rentFixed: occupancyInfo?.rentFixed != null ? String(occupancyInfo.rentFixed) : '',
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
        </>
      )}

      {selectedOccupancyId && (
        <div className="payment-history-section">
          <h3>Payment History & Details Breakdown</h3>

          {rentalRecords.length > 0 ? (
            <div className="payment-records-container">
              {rentalRecords.map((record) => (
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
                    <div className="payment-record-actions">
                      <button
                        className="payment-record-edit-btn"
                        title="Edit payment record"
                        onClick={() => handleEditClick(record)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="payment-record-delete-btn"
                        title="Delete payment record"
                        onClick={() => handleDeleteRecord(record)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
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
                      <span className="value received">{formatCurrency(getTotalReceived(record.rentReceived, record.charges))}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Balance</span>
                      <span className="value balance">{formatCurrency(getDisplayBalance(record))}</span>
                    </div>
                  </div>

                  {record.screenshotUrl && (
                    <div className="payment-screenshot">
                      <div className="screenshot-label">Payment Proof</div>
                      <button
                        type="button"
                        className="screenshot-link"
                        onClick={() =>
                          openProofPreview(
                            getProofUrl(record.screenshotUrl, record.rentReceivedOn, record.folder),
                            `Payment proof screenshot for ${record.tenantName}`
                          )
                        }
                        title="Preview payment proof"
                      >
                        <img
                          src={getProofUrl(record.screenshotUrl, record.rentReceivedOn, record.folder)}
                          alt="Payment proof screenshot"
                          className="screenshot-thumbnail"
                        />
                      </button>
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
      )}

      <div className="current-month-status-card">
        <div className="current-month-header">
          <div>
            <h3>Occupied Rooms Rental Status - {formatMonthTitle(currentMonthYear)}</h3>
            <p>Shows rental payment status for all occupied rooms in the selected period.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchCurrentMonthPayments}
            disabled={currentMonthLoading}
          >
            {currentMonthLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="rental-date-filter-bar">
          <div className="rental-date-filter-group">
            <label htmlFor="selectedMonthFilter">Month</label>
            <input
              type="month"
              id="selectedMonthFilter"
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
            />
          </div>
          <div className="rental-date-filter-group">
            <label htmlFor="selectedRoomFilter">Room</label>
            <select
              id="selectedRoomFilter"
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
            >
              <option value="all">All Rooms</option>
              {roomFilterOptions.map((roomNumber) => (
                <option key={roomNumber} value={roomNumber}>
                  Room {roomNumber}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="rental-reset-filter-btn"
            onClick={() => {
              setSelectedMonthFilter(getDefaultMonthValue());
              setSelectedRoomFilter('all');
              setSelectedStatusFilter(null);
            }}
          >
            Reset to Current Month
          </button>
        </div>

        {/* Status Summary Filters */}
        {!currentMonthLoading && roomFilteredPayments.length > 0 && (
          <div className="status-summary">
            <div 
              className={`status-badge paid ${selectedStatusFilter === 'paid' ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'paid' ? null : 'paid')}
              role="button"
              tabIndex={0}
            >
              <span className="status-label">Paid</span>
              <span className="status-count">{paidCount}</span>
            </div>
            <div 
              className={`status-badge partial ${selectedStatusFilter === 'partial' ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'partial' ? null : 'partial')}
              role="button"
              tabIndex={0}
            >
              <span className="status-label">Partial</span>
              <span className="status-count">{partialCount}</span>
            </div>
            <div 
              className={`status-badge pending ${selectedStatusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'pending' ? null : 'pending')}
              role="button"
              tabIndex={0}
            >
              <span className="status-label">Pending</span>
              <span className="status-count">{pendingCount}</span>
            </div>
            <div 
              className={`status-badge merged ${selectedStatusFilter === 'merged' ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'merged' ? null : 'merged')}
              role="button"
              tabIndex={0}
            >
              <span className="status-label">Merged</span>
              <span className="status-count">{mergedCount}</span>
            </div>
            <div 
              className={`status-badge approved ${selectedStatusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'approved' ? null : 'approved')}
              role="button"
              tabIndex={0}
            >
              <span className="status-label">Approved</span>
              <span className="status-count">{approvedCount}</span>
            </div>
            <div 
              className={`status-badge rejected ${selectedStatusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'rejected' ? null : 'rejected')}
              role="button"
              tabIndex={0}
            >
              <span className="status-label">Rejected</span>
              <span className="status-count">{rejectedCount}</span>
            </div>
          </div>
        )}

        {currentMonthError && (
          <div className="current-month-error">{currentMonthError}</div>
        )}

        {!currentMonthError && roomFilteredPayments.length === 0 && !currentMonthLoading && (
          <div className="empty-state compact">
            <p>No occupied room records found for this filter.</p>
          </div>
        )}

        {!currentMonthError && roomFilteredPayments.length > 0 && filteredCurrentMonthPayments.length === 0 && !currentMonthLoading && (
          <div className="empty-state compact">
            <p>No {selectedStatusFilter || 'matching'} occupied room records found</p>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedStatusFilter(null);
                setSelectedRoomFilter('all');
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {filteredCurrentMonthPayments.length > 0 && (
          <>
            <div className="current-month-summary-grid">
              <div className="current-month-summary-item">
                <span>Total Occupied Rooms</span>
                <strong>{filteredCurrentMonthPayments.length}</strong>
              </div>
              <div className="current-month-summary-item highlight-received">
                <span>Total Pro-Rata Rent Received</span>
                <strong>{formatCurrency(totalReceivedAmount)}</strong>
              </div>
              <div className="current-month-summary-item highlight-charges">
                <span>Total Charges</span>
                <strong>{formatCurrency(totalChargesAmount)}</strong>
              </div>
              <div className="current-month-summary-item highlight-eb">
                <span>Total EB Charges</span>
                <strong>{formatCurrency(totalChargesAmount)}</strong>
              </div>
              <div className="current-month-summary-item highlight-pending-balance">
                <span>Total Pending Balance</span>
                <strong>{formatCurrency(totalPendingBalanceAmount)}</strong>
              </div>
            </div>

            <div className="table-wrapper current-month-table-wrapper">
              <table className="payment-table current-month-table compact-grid">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Room</th>
                    <th>Check-Out</th>
                    <th>Pro-Rata Rent</th>
                    <th>EB Charges</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Last Payment</th>
                    <th>Received</th>
                    <th>Proof</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCurrentMonthPayments.map((item) => {
                    const review = tenantReviews[item.occupancyId] || { decision: null, comment: '' };
                    const isReviewExpanded = expandedReviewRows[item.occupancyId] || false;
                    const isSavingReview = savingReviewRows[item.occupancyId] || false;
                    const savedReviewDate = formatReviewSavedDate(item.reviewVerifiedOn);
                    const effectiveEbCharges = Number(item.charges || 0);
                    const effectiveStatus = getEffectiveStatus(item);
                    const itemBalance = item.rentBalance !== undefined && item.rentBalance !== null
                      ? Number(item.rentBalance)
                      : Math.max(0, item.proRataRent - ((item.rentReceived || 0) + effectiveEbCharges));
                    // Check if this is a shop (room numbers like S1, S2, SHOP-1 etc or any number > 100 can be marked as shop)
                    const isShop = /^[Ss]/.test(item.roomNumber) || /[Ss]hop/i.test(item.roomNumber);

                    return (
                      <tr key={item.occupancyId} className={isShop ? 'shop-row' : ''}>
                        <td>
                          <div className="tenant-name-with-info">
                            <strong>{item.tenantName}</strong>
                            <button
                              type="button"
                              className="tenant-info-button"
                              title="Tenant details"
                              aria-label={`Show tenant details for ${item.tenantName}`}
                              onClick={(event) => openTenantInfoPopup(event, item)}
                            >
                              ℹ
                            </button>
                          </div>
                        </td>
                        <td className={isShop ? 'shop-cell' : ''}><strong>{item.roomNumber}</strong></td>
                        <td>
                          {item.checkOutDate
                            ? new Date(item.checkOutDate).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="amount">{formatCurrency(item.proRataRent)}</td>
                        <td className="amount eb-charges">
                          <div className="eb-charge-content">
                            <span>{effectiveEbCharges > 0 ? formatCurrency(effectiveEbCharges) : '-'}</span>
                            {effectiveEbCharges > 0 && (
                              <button
                                type="button"
                                className="eb-charge-icon"
                                onClick={() => openEbDetails(item.roomNumber, `${item.year}-${String(item.month).padStart(2, '0')}`)}
                                title={`EB details for Room ${item.roomNumber}`}
                                aria-label={`Show EB details for Room ${item.roomNumber}`}
                              >
                                ⚡
                              </button>
                            )}
                          </div>
                        </td>
                        <td
                          className={`amount balance ${itemBalance > 0 ? 'pending' : 'success'}`}
                          title={getBalanceTooltip(item)}
                        >
                          {formatCurrency(itemBalance)}
                        </td>
                        <td>
                          <span className={`payment-status-badge ${effectiveStatus}`}>
                            {effectiveStatus}
                          </span>
                        </td>
                        <td>
                          {item.rentReceivedOn
                            ? new Date(item.rentReceivedOn).toLocaleDateString('en-IN')
                            : 'No payment'}
                        </td>
                        <td className="amount received">
                          <span>{formatCurrency(getTotalReceived(item.rentReceived, item.charges))}</span>
                        </td>
                        <td className="proof-cell">
                          <div className="proof-cell-content">
                            {item.modeOfPayment ? renderPaymentModeIcon(item.modeOfPayment) : null}
                            {(() => {
                              const paymentMode = (item.modeOfPayment || '').trim();
                              const normalizedMode = paymentMode.toLowerCase();
                              const compactMode = normalizedMode.replace(/\s+|\.|-/g, '');
                              const isCashMode =
                                normalizedMode === 'cash' ||
                                normalizedMode === 'பணம்' ||
                                compactMode === 'பணம்' ||
                                normalizedMode === 'money';

                              return isCashMode ? (
                                <button
                                  type="button"
                                  className="view-income-transactions-btn"
                                  onClick={() => {
                                    setSelectedIncomeRoom(item.roomNumber);
                                    setSelectedIncomeOccupancyId(item.occupancyId);
                                    setShowIncomeTransactions(true);
                                  }}
                                  title="View current-month income transactions"
                                  aria-label="View current-month income transactions"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" />
                                  </svg>
                                </button>
                              ) : null;
                            })()}
                            {item.screenshotUrl ? (
                              <button
                                type="button"
                                className="last-proof-link"
                                title="Preview latest payment proof"
                                onClick={() =>
                                  openProofPreview(
                                    getProofUrl(item.screenshotUrl, item.rentReceivedOn, item.folder),
                                    `Payment proof ${item.tenantName}`
                                  )
                                }
                              >
                                <img
                                  src={getProofUrl(item.screenshotUrl, item.rentReceivedOn, item.folder)}
                                  alt={`Payment proof ${item.tenantName}`}
                                  className="last-proof-thumb"
                                />
                              </button>
                            ) : (
                              <span className="no-proof">-</span>
                            )}
                          </div>
                        </td>
                        <td className="review-cell">
                          <div className="tenant-review-panel">
                            <div className="tenant-review-topline">
                              <div className="tenant-review-actions" role="group" aria-label={`Review actions for ${item.tenantName}`}>
                                <button
                                  type="button"
                                  className={`review-icon-button approve ${review.decision === 'approved' ? 'active' : ''}`}
                                  onClick={() => handleTenantReviewDecision(item.occupancyId, 'approved')}
                                  aria-pressed={review.decision === 'approved'}
                                  title={canChangeReviewStatus ? `Approve ${item.tenantName}` : 'Managers can update comments only'}
                                  disabled={isSavingReview || !canChangeReviewStatus}
                                >
                                  <span className="review-icon" aria-hidden="true">✓</span>
                                </button>
                                <button
                                  type="button"
                                  className={`review-icon-button reject ${review.decision === 'rejected' ? 'active' : ''}`}
                                  onClick={() => handleTenantReviewDecision(item.occupancyId, 'rejected')}
                                  aria-pressed={review.decision === 'rejected'}
                                  title={canChangeReviewStatus ? `Reject ${item.tenantName}` : 'Managers can update comments only'}
                                  disabled={isSavingReview || !canChangeReviewStatus}
                                >
                                  <span className="review-icon" aria-hidden="true">✕</span>
                                </button>
                              </div>
                              <button
                                type="button"
                                className={`review-status-trigger ${review.decision || 'unreviewed'}`}
                                onClick={() => toggleTenantReviewPanel(item.occupancyId)}
                                aria-expanded={isReviewExpanded}
                                aria-controls={`review-panel-${item.occupancyId}`}
                                aria-label={review.decision ? `Marked ${review.decision}` : 'Pending review'}
                                title={review.decision ? `Marked ${review.decision}` : 'Pending review'}
                                disabled={isSavingReview}
                              >
                                <span className={`review-status-text ${review.decision || 'unreviewed'}`}>
                                  {review.decision === 'approved' ? (
                                    <span className="review-status-icon approved" aria-hidden="true">✓</span>
                                  ) : review.decision === 'rejected' ? (
                                    <span className="review-status-icon rejected" aria-hidden="true">✕</span>
                                  ) : (
                                    <span className="review-status-icon" aria-hidden="true"></span>
                                  )}
                                </span>
                                <span className={`review-status-caret ${isReviewExpanded ? 'expanded' : ''}`} aria-hidden="true">
                                  ▾
                                </span>
                              </button>
                            </div>
                            {isReviewExpanded && (
                              <div
                                id={`review-panel-${item.occupancyId}`}
                                className="review-panel-body"
                              >
                                <label className="review-comment-label" htmlFor={`review-comment-${item.occupancyId}`}>
                                  Reviewer Comment
                                </label>
                                <textarea
                                  id={`review-comment-${item.occupancyId}`}
                                  className="review-comment-input"
                                  value={review.comment}
                                  onChange={(event) => handleTenantReviewComment(item.occupancyId, event.target.value)}
                                  onBlur={(event) => handleTenantReviewBlur(event, item.occupancyId)}
                                  placeholder={
                                    review.decision === 'approved'
                                      ? 'Add an approval note'
                                      : review.decision === 'rejected'
                                        ? 'Add a rejection reason'
                                        : 'Add an optional review comment'
                                  }
                                  rows={3}
                                  maxLength={240}
                                  disabled={isSavingReview}
                                />
                                <div className="review-comment-footer">
                                  <span className="review-meta-text">
                                    {item.reviewVerifiedBy
                                      ? `Saved by ${item.reviewVerifiedBy}${savedReviewDate ? ` on ${savedReviewDate}` : ''}`
                                      : 'Not saved yet'}
                                  </span>
                                  {!canChangeReviewStatus && (
                                    <span className="review-meta-text">Managers can update comments only.</span>
                                  )}
                                  <span>{isSavingReview ? 'Saving...' : `${review.comment.length}/240`}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!selectedOccupancyId && !loading && (
        <div className="empty-state">
          <p>👆 Select a tenant and room to view rental collection details</p>
        </div>
      )}

      {tenantInfoPopup.open && (
        <div
          className="tenant-info-popover-overlay"
          onClick={closeTenantInfoPopup}
          role="presentation"
        >
          <div
            className="tenant-info-popover"
            style={{ left: tenantInfoPopup.x + 18, top: tenantInfoPopup.y + 18 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="false"
            aria-label={`Tenant details for ${tenantInfoPopup.tenantName}`}
          >
            <div className="tenant-info-popover-header">
              <strong>{tenantInfoPopup.tenantName}</strong>
              <button
                type="button"
                className="tenant-info-popover-close"
                onClick={closeTenantInfoPopup}
                aria-label="Close tenant details"
              >
                ✕
              </button>
            </div>
            <div className="tenant-info-popover-body">
              <div className="tenant-info-row">
                <span className="tenant-info-label">Check-in:</span>
                <span className="tenant-info-value">
                  {tenantInfoPopup.checkInDate && tenantInfoPopup.checkInDate !== 'N/A'
                    ? new Date(tenantInfoPopup.checkInDate).toLocaleDateString('en-IN')
                    : 'N/A'}
                </span>
              </div>
              <div className="tenant-info-row">
                <span className="tenant-info-label">Rent Fixed:</span>
                <span className="tenant-info-value">
                  {tenantInfoPopup.rentFixed != null ? formatCurrency(tenantInfoPopup.rentFixed) : 'N/A'}
                </span>
              </div>
              <div className="tenant-info-row">
                <span className="tenant-info-label">Phone:</span>
                <span className="tenant-info-value">{tenantInfoPopup.phoneNumber || 'N/A'}</span>
              </div>
              <div className="tenant-info-row">
                <span className="tenant-info-label">Advance Paid:</span>
                <span className="tenant-info-value">
                  {tenantInfoPopup.advancePaid != null ? formatCurrency(tenantInfoPopup.advancePaid) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {ebDetailsPopup.open && (
        <div className="eb-details-overlay" onClick={closeEbDetails} role="presentation">
          <div className="eb-details-popup" onClick={(event) => event.stopPropagation()}>
            <div className="eb-details-header">
              <div>
                <h3>EB Details</h3>
                <p>Room {ebDetailsPopup.roomNumber} • {ebDetailsPopup.monthLabel}</p>
              </div>
              <button type="button" className="eb-details-close" onClick={closeEbDetails} aria-label="Close EB details">
                ✕
              </button>
            </div>

            {ebDetailsPopup.loading ? (
              <div className="eb-details-loading">Loading EB details...</div>
            ) : ebDetailsPopup.error ? (
              <div className="eb-details-empty">{ebDetailsPopup.error}</div>
            ) : (
              <div className="eb-details-table-wrap">
                <table className="eb-details-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Meter</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Units</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ebDetailsPopup.records.map((record: any, index: number) => (
                      <tr key={`${record.serviceConsumptionId || index}-${record.serviceName || 'eb'}`}>
                        <td className="eb-table-service">{record.serviceName || 'EB Service'}</td>
                        <td>{record.meterNo || '-'}</td>
                        <td>{record.startingReading ?? '-'}</td>
                        <td>{record.endingReading ?? '-'}</td>
                        <td className="eb-table-units">{record.unitsConsumed ?? 0}</td>
                        <td className="eb-table-amount">₹{Number(record.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {proofPreview && (
        <div
          className="proof-preview-overlay"
          onClick={() => setProofPreview(null)}
          role="presentation"
        >
          <div
            className="proof-preview-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Payment proof preview"
          >
            <button
              type="button"
              className="proof-preview-close"
              onClick={() => setProofPreview(null)}
              aria-label="Close payment proof preview"
            >
              ✕
            </button>
            <img
              src={proofPreview.url}
              alt={proofPreview.alt}
              className="proof-preview-image"
            />
          </div>
        </div>
      )}

      {showIncomeTransactions && (
        <div className="income-transactions-overlay" role="presentation" onClick={() => {
          setShowIncomeTransactions(false);
          setSelectedIncomeRoom(null);
          setSelectedIncomeOccupancyId(null);
        }}>
          <div className="income-transactions-modal" role="dialog" aria-modal="true" aria-label="Current-month income transactions" onClick={(event) => event.stopPropagation()}>
            <div className="income-transactions-header">
              <h2>Current Month Income</h2>
              <button
                type="button"
                className="income-transactions-close"
                onClick={() => {
                  setShowIncomeTransactions(false);
                  setSelectedIncomeRoom(null);
                  setSelectedIncomeOccupancyId(null);
                }}
                aria-label="Close income transactions"
                title="Close"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TransactionManagement
              incomeOnly
              preselectedRoomNumber={selectedIncomeRoom}
              preselectedOccupancyId={selectedIncomeOccupancyId}
              selectedMonth={selectedMonthFilter}
            />
          </div>
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
                <label htmlFor="editRentFixed">Fixed Rent (₹)</label>
                <input
                  type="number"
                  id="editRentFixed"
                  value={editFormData.rentFixed || ''}
                  onChange={(e) => handleEditFormChange('rentFixed', parseFloat(e.target.value))}
                  placeholder="Enter fixed rent"
                  min="0"
                  step="0.01"
                />
              </div>

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
                  disabled
                  title="Payment date cannot be changed. Create a new payment record if the date needs to be corrected."
                />
                <small className="field-note">Payment date cannot be edited (uniquely identifies this payment)</small>
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
                  <option value="checkout">CheckOut</option>
                </select>
              </div>

              {editingRecord.screenshotUrl && !editFormData.screenshot && (
                <div className="current-image-section">
                  <h3>Current Payment Proof</h3>
                  <img 
                    src={getProofUrl(editingRecord.screenshotUrl, editingRecord.rentReceivedOn, editingRecord.folder)} 
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

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="progress-section">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="progress-text">Uploading... {uploadProgress}%</p>
              </div>
            )}

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
        </>
      )}
    </div>
  );
}
