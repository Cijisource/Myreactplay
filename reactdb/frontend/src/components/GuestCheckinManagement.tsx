import { useEffect, useMemo, useRef, useState } from 'react';
import { apiService, getGuestCheckinFileUrl } from '../api';
import { useAuth } from './AuthContext';
import LoadingSpinner from './LoadingSpinner';
import './ManagementStyles.css';

interface CameraCaptureProps {
  label?: string;
  onCapture: (file: File) => void;
  onCancel: () => void;
}

function CameraCapture({ label = 'photo', onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const preferredConstraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: 'environment' } }
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (cancelled) {
            fallbackStream.getTracks().forEach((t) => t.stop());
            return;
          }
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch {
          setCamError('Camera access denied or unavailable');
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `${label}-${Date.now()}.jpg`, { type: 'image/jpeg' });
          stream?.getTracks().forEach((t) => t.stop());
          onCapture(file);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleCancel = () => {
    stream?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem', maxWidth: '90vw', width: 520 }}>
        <h4 style={{ marginTop: 0, textTransform: 'capitalize' }}>Capture {label}</h4>
        {camError ? (
          <p style={{ color: 'red' }}>{camError}</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 4, background: '#000' }} />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel}>Cancel</button>
          {!camError && (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCapture}>Capture</button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DailyStatus {
  id: number;
  date: string;
}

type GuestCheckinFileField =
  | 'proof'
  | 'proof2'
  | 'proof3'
  | 'proof4'
  | 'proof5'
  | 'proof6'
  | 'proof7'
  | 'proof8'
  | 'proof9'
  | 'proof10'
  | 'photo'
  | 'photo2'
  | 'photo3'
  | 'photo4'
  | 'photo5'
  | 'photo6'
  | 'photo7'
  | 'photo8'
  | 'photo9'
  | 'photo10';

interface GuestCheckIn {
  id: number;
  dailyStatusId: number;
  statusDate?: string;
  guestName: string;
  phoneNumber?: string;
  purpose?: string;
  visitingRoomNo?: string;
  rentAmount?: number;
  depositAmount?: number;
  checkInTime: string;
  checkOutTime?: string;
  proofUrl?: string;
  proof2Url?: string;
  proof3Url?: string;
  proof4Url?: string;
  proof5Url?: string;
  proof6Url?: string;
  proof7Url?: string;
  proof8Url?: string;
  proof9Url?: string;
  proof10Url?: string;
  photoUrl?: string;
  photo2Url?: string;
  photo3Url?: string;
  photo4Url?: string;
  photo5Url?: string;
  photo6Url?: string;
  photo7Url?: string;
  photo8Url?: string;
  photo9Url?: string;
  photo10Url?: string;
}

interface Room {
  id: number;
  number: string;
  rent: number;
  beds: number;
}

interface GuestFileUploadSectionProps {
  guest: GuestCheckIn;
  uploading: boolean;
  uploadProgress: number;
  onUpload: (guest: GuestCheckIn, files: Partial<Record<GuestCheckinFileField, File | null>>) => void;
}

const guestCheckinFileSlots: Array<{ key: GuestCheckinFileField; label: string; type: 'proof' | 'photo' }> = [
  { key: 'proof', label: 'Proof 1', type: 'proof' },
  { key: 'proof2', label: 'Proof 2', type: 'proof' },
  { key: 'proof3', label: 'Proof 3', type: 'proof' },
  { key: 'proof4', label: 'Proof 4', type: 'proof' },
  { key: 'proof5', label: 'Proof 5', type: 'proof' },
  { key: 'proof6', label: 'Proof 6', type: 'proof' },
  { key: 'proof7', label: 'Proof 7', type: 'proof' },
  { key: 'proof8', label: 'Proof 8', type: 'proof' },
  { key: 'proof9', label: 'Proof 9', type: 'proof' },
  { key: 'proof10', label: 'Proof 10', type: 'proof' },
  { key: 'photo', label: 'Photo 1', type: 'photo' },
  { key: 'photo2', label: 'Photo 2', type: 'photo' },
  { key: 'photo3', label: 'Photo 3', type: 'photo' },
  { key: 'photo4', label: 'Photo 4', type: 'photo' },
  { key: 'photo5', label: 'Photo 5', type: 'photo' },
  { key: 'photo6', label: 'Photo 6', type: 'photo' },
  { key: 'photo7', label: 'Photo 7', type: 'photo' },
  { key: 'photo8', label: 'Photo 8', type: 'photo' },
  { key: 'photo9', label: 'Photo 9', type: 'photo' },
  { key: 'photo10', label: 'Photo 10', type: 'photo' }
];

function GuestFileUploadSection({ guest, uploading, uploadProgress, onUpload }: GuestFileUploadSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<GuestCheckinFileField, File | null>>>({});
  const [camera, setCamera] = useState<GuestCheckinFileField | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const previewFiles = guestCheckinFileSlots.filter((slot) => {
    const previewValue = guest[`${slot.key}Url` as keyof GuestCheckIn] as string | undefined;
    return Boolean(previewValue);
  });

  const hasFiles = Object.values(selectedFiles).some(Boolean);

  const updateSelectedFile = (field: GuestCheckinFileField, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [field]: file }));
  };

  return (
    <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e0e0e0', paddingTop: '0.75rem' }}>
      {camera && (
        <CameraCapture
          label={camera}
          onCapture={(file) => {
            updateSelectedFile(camera, file);
            setCamera(null);
          }}
          onCancel={() => setCamera(null)}
        />
      )}
      {selectedPreview && (
        <div
          onClick={() => setSelectedPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '82vh',
              borderRadius: 12,
              background: '#fff',
              padding: '0.75rem',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)'
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedPreview(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                border: 'none',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#fff',
                borderRadius: '999px',
                width: 30,
                height: 30,
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1
              }}
            >
              ×
            </button>
            <img
              src={selectedPreview}
              alt="Guest document preview"
              style={{
                display: 'block',
                maxWidth: '90vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                borderRadius: 8,
                background: '#f8fafc'
              }}
              onError={(event) => {
                event.currentTarget.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400"><rect width="500" height="400" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#64748b" font-family="Arial">Image unavailable</text></svg>'
                );
              }}
            />
          </div>
        </div>
      )}
      <strong>Documents</strong>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
        {previewFiles.map((slot) => {
          const previewUrl = guest[`${slot.key}Url` as keyof GuestCheckIn] as string | undefined;
          if (!previewUrl) return null;
          const resolvedPreviewUrl = getGuestCheckinFileUrl(previewUrl);
          const isProofSlot = slot.type === 'proof';
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => setSelectedPreview(resolvedPreviewUrl)}
              style={{
                background: isProofSlot ? '#fff7ed' : '#eff6ff',
                border: isProofSlot ? '1px solid #f59e0b' : '1px solid #60a5fa',
                borderRadius: 8,
                padding: 5,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
                width: '100%'
              }}
            >
              <img
                src={resolvedPreviewUrl}
                alt={slot.label}
                loading="lazy"
                decoding="async"
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: isProofSlot ? '1px solid #f59e0b' : '1px solid #60a5fa', background: '#fff' }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="9" fill="#64748b" font-family="Arial">Image</text></svg>'); }}
              />
              <div style={{ fontSize: '0.66rem', textAlign: 'center', color: isProofSlot ? '#b45309' : '#1d4ed8', fontWeight: 700, lineHeight: 1.2 }}>{slot.label}</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '0.45rem 0.5rem' }}>
        {guestCheckinFileSlots.map((slot) => {
          const existingUrl = guest[`${slot.key}Url` as keyof GuestCheckIn] as string | undefined;
          const selected = selectedFiles[slot.key] ?? null;
          const isProofSlot = slot.type === 'proof';
          return (
            <div
              key={slot.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.35rem 0.4rem',
                border: isProofSlot ? '1px solid #f59e0b' : '1px solid #60a5fa',
                borderRadius: 8,
                background: isProofSlot ? '#fff7ed' : '#eff6ff'
              }}
            >
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: isProofSlot ? '#b45309' : '#1d4ed8' }}>
                {existingUrl ? `Replace ${slot.label}` : `Upload ${slot.label}`}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ fontSize: '0.75rem', maxWidth: '100%' }}
                  onChange={(e) => updateSelectedFile(slot.key, e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCamera(slot.key)}
                >
                  Camera
                </button>
              </div>
              {selected && <span style={{ fontSize: '0.72rem', color: '#555', overflowWrap: 'anywhere' }}>{selected.name}</span>}
            </div>
          );
        })}
        {hasFiles && (
          <>
            <button
              className="btn btn-sm btn-primary"
              style={{ marginTop: '0.25rem', alignSelf: 'flex-start' }}
              disabled={uploading}
              onClick={() => {
                onUpload(guest, selectedFiles);
                setSelectedFiles({});
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            {uploading && (
              <div style={{ marginTop: '0.5rem', width: '100%', maxWidth: 280 }}>
                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                      height: '100%',
                      background: '#0ea5e9',
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#334155' }}>
                  Uploading {Math.max(0, Math.min(100, uploadProgress))}%
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function GuestCheckinManagement() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const guestPhoneFilterListId = 'guest-checkin-phone-filter-options';

  const [statuses, setStatuses] = useState<DailyStatus[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [guestCheckins, setGuestCheckins] = useState<GuestCheckIn[]>([]);
  const [previousGuestHistory, setPreviousGuestHistory] = useState<GuestCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkoutDates, setCheckoutDates] = useState<Record<number, string>>({});
  const [phoneFilter, setPhoneFilter] = useState('');
  const [collapsedGuestIds, setCollapsedGuestIds] = useState<Record<number, boolean>>({});
  const [guestCardTabs, setGuestCardTabs] = useState<Record<number, 'overview' | 'documents'>>({});
  const [phoneValidationTriggered, setPhoneValidationTriggered] = useState(false);

  const [formData, setFormData] = useState({
    guestName: '',
    phoneNumber: '',
    purpose: '',
    visitingRoomNo: '',
    rentAmount: '',
    depositAmount: '',
    checkInDate: new Date().toISOString().split('T')[0]
  });

  const [formFiles, setFormFiles] = useState<{ proof: File | null; photo: File | null }>({
    proof: null,
    photo: null
  });
  const [formCamera, setFormCamera] = useState<'proof' | 'photo' | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const [uploadProgressByGuest, setUploadProgressByGuest] = useState<Record<number, number>>({});
  const [createUploadProgress, setCreateUploadProgress] = useState(0);
  const [editingGuest, setEditingGuest] = useState<GuestCheckIn | null>(null);
  const [editFormData, setEditFormData] = useState<{
    guestName: string;
    phoneNumber: string;
    purpose: string;
    visitingRoomNo: string;
    rentAmount: string;
    depositAmount: string;
    checkInDate: string;
    checkOutDate: string;
  } | null>(null);

  const phoneRegex = /^\d{10}$/;

  const normalizePhoneDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    return digits;
  };

  const phoneValidationMessage = useMemo(() => {
    if (!phoneValidationTriggered) return '';
    if (!formData.phoneNumber) return 'Phone number is required';
    if (!/^\d+$/.test(formData.phoneNumber)) return 'Phone number must contain digits only';
    if (formData.phoneNumber.length < 10) return `Phone number must be 10 digits (${formData.phoneNumber.length}/10)`;
    if (formData.phoneNumber.length > 10) return 'Phone number must be exactly 10 digits';
    return '';
  }, [formData.phoneNumber, phoneValidationTriggered]);

  const guestNameValidationMessage = useMemo(() => {
    if (!formData.guestName) return '';
    if (formData.guestName.trim().length < 2) return 'Guest name must be at least 2 characters';
    return '';
  }, [formData.guestName]);

  const purposeValidationMessage = useMemo(() => {
    if (!formData.purpose) return '';
    if (formData.purpose.trim().length < 3) return 'Purpose must be at least 3 characters';
    return '';
  }, [formData.purpose]);

  const roomValidationMessage = useMemo(() => {
    if (!formData.visitingRoomNo) return '';
    const exists = rooms.some(room => room.number === formData.visitingRoomNo);
    if (!exists) return 'Select a valid room from the dropdown';
    return '';
  }, [formData.visitingRoomNo, rooms]);

  const rentValidationMessage = useMemo(() => {
    if (formData.rentAmount === '') return '';
    const value = parseFloat(formData.rentAmount);
    if (isNaN(value)) return 'Rent amount must be a valid number';
    if (value < 0) return 'Rent amount cannot be negative';
    return '';
  }, [formData.rentAmount]);

  const depositValidationMessage = useMemo(() => {
    if (formData.depositAmount === '') return '';
    const value = parseFloat(formData.depositAmount);
    if (isNaN(value)) return 'Deposit amount must be a valid number';
    if (value < 0) return 'Deposit amount cannot be negative';
    return '';
  }, [formData.depositAmount]);

  const isGuestNameValid = formData.guestName.trim().length >= 2;
  const isPurposeValid = formData.purpose.trim().length >= 3;
  const isRoomValid = formData.visitingRoomNo !== '' && rooms.some(room => room.number === formData.visitingRoomNo);
  const isRentValid = formData.rentAmount !== '' && !isNaN(parseFloat(formData.rentAmount)) && parseFloat(formData.rentAmount) >= 0;
  const isDepositValid = formData.depositAmount !== '' && !isNaN(parseFloat(formData.depositAmount)) && parseFloat(formData.depositAmount) >= 0;
  const isFormValid = isGuestNameValid && isPurposeValid && isRoomValid && isRentValid && isDepositValid;

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        return 'Guest check-in API is not available (404). Please verify backend routes and restart the server.';
      }
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };

  const parseDateOnly = (value: string | Date): Date => {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'string') {
      const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (isoMatch) {
        const [year, month, day] = isoMatch[0].split('-').map(Number);
        return new Date(year, month - 1, day);
      }
    }

    return new Date(value);
  };

  const getWeekRangeForDate = (value: string | Date) => {
    const baseDate = parseDateOnly(value);
    const weekStart = new Date(baseDate);
    const day = baseDate.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    weekStart.setDate(baseDate.getDate() + mondayOffset);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  };

  const selectedStatus = useMemo(() => {
    if (!selectedDate) return null;
    return statuses.find(s => parseDateOnly(s.date).getTime() === parseDateOnly(selectedDate).getTime()) || null;
  }, [selectedDate, statuses]);

  const consolidatedStats = useMemo(() => {
    const totalGuests = guestCheckins.length;
    const checkedOutGuests = guestCheckins.filter(g => Boolean(g.checkOutTime)).length;
    const activeGuests = totalGuests - checkedOutGuests;
    const totalRent = guestCheckins.reduce((sum, g) => sum + (g.rentAmount || 0), 0);
    const totalDeposit = guestCheckins.reduce((sum, g) => sum + (g.depositAmount || 0), 0);
    return { totalGuests, checkedOutGuests, activeGuests, totalRent, totalDeposit };
  }, [guestCheckins]);

  const guestHistorySource = previousGuestHistory.length > 0 ? previousGuestHistory : guestCheckins;

  const guestSearchOptions = useMemo(() => {
    const seen = new Map<string, string>();

    guestHistorySource.forEach((guest) => {
      const normalizedPhone = normalizePhoneDigits(guest.phoneNumber || '');
      if (normalizedPhone && !seen.has(normalizedPhone)) {
        seen.set(normalizedPhone, guest.guestName);
      }

      const guestName = guest.guestName?.trim();
      if (guestName && !seen.has(`name:${guestName.toLowerCase()}`)) {
        seen.set(`name:${guestName.toLowerCase()}`, guestName);
      }

      const purpose = guest.purpose?.trim();
      if (purpose && !seen.has(`purpose:${purpose.toLowerCase()}`)) {
        seen.set(`purpose:${purpose.toLowerCase()}`, purpose);
      }
    });

    return Array.from(seen.entries())
      .map(([key, value]) => ({ key, value }))
      .sort((left, right) => left.value.localeCompare(right.value));
  }, [guestHistorySource]);

  const guestEntrySuggestions = useMemo(() => {
    const candidates = new Set<string>();

    guestHistorySource.forEach((guest) => {
      const guestName = guest.guestName?.trim();
      if (guestName) candidates.add(guestName);

      const phoneNumber = normalizePhoneDigits(guest.phoneNumber || '');
      if (phoneNumber) candidates.add(phoneNumber);

      const purpose = guest.purpose?.trim();
      if (purpose) candidates.add(purpose);
    });

    return Array.from(candidates).sort((left, right) => left.localeCompare(right));
  }, [guestHistorySource]);

  const applyPreviousEntrySuggestion = (
    field: 'guestName' | 'phoneNumber' | 'depositAmount' | 'purpose',
    value: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const source = previousGuestHistory.length > 0 ? previousGuestHistory : guestCheckins;
    const match = source.find((guest) => {
      const guestName = (guest.guestName || '').trim().toLowerCase();
      const phoneNumber = normalizePhoneDigits(guest.phoneNumber || '');
      const purpose = (guest.purpose || '').trim().toLowerCase();
      const depositAmount = guest.depositAmount != null ? String(guest.depositAmount).trim() : '';
      const normalizedValue = trimmed.toLowerCase();
      const normalizedPhoneInput = normalizePhoneDigits(trimmed);
      const normalizedDepositInput = trimmed.replace(/[^\d.]/g, '');

      return (
        (field === 'guestName' && guestName.includes(normalizedValue))
        || (field === 'phoneNumber' && (phoneNumber.includes(normalizedPhoneInput) || normalizedPhoneInput.includes(phoneNumber)))
        || (field === 'depositAmount' && depositAmount.includes(normalizedDepositInput))
        || (field === 'purpose' && purpose.includes(normalizedValue))
      );
    });

    if (!match) return;

    setFormData((prev) => ({
      ...prev,
      guestName: field === 'guestName' ? trimmed : prev.guestName || match.guestName || prev.guestName,
      phoneNumber: field === 'phoneNumber' ? normalizePhoneDigits(trimmed) : prev.phoneNumber || normalizePhoneDigits(match.phoneNumber || '') || prev.phoneNumber,
      depositAmount: field === 'depositAmount'
        ? String(match.depositAmount ?? prev.depositAmount)
        : prev.depositAmount || String(match.depositAmount ?? '') || prev.depositAmount,
      purpose: field === 'purpose' ? trimmed : prev.purpose || match.purpose || prev.purpose
    }));
  };

  const filteredGuestCheckins = useMemo(() => {
    const trimmedFilter = phoneFilter.trim().toLowerCase();
    if (!trimmedFilter) {
      return guestCheckins;
    }

    const normalizedFilter = normalizePhoneDigits(trimmedFilter);

    return guestCheckins.filter((guest) => {
      const guestName = (guest.guestName || '').toLowerCase();
      const purpose = (guest.purpose || '').toLowerCase();
      const phone = normalizePhoneDigits(guest.phoneNumber || '');

      return guestName.includes(trimmedFilter)
        || purpose.includes(trimmedFilter)
        || (normalizedFilter && phone.includes(normalizedFilter));
    });
  }, [guestCheckins, phoneFilter]);

  const fetchStatuses = async () => {
    try {
      const response = await apiService.getDailyStatuses();
      const rows = Array.isArray(response.data) ? response.data : [];
      const ordered = [...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setStatuses(ordered);

      const historyResults = await Promise.all(
        ordered.map(async (status) => {
          try {
            const guestResponse = await apiService.getDailyGuestCheckins(status.id);
            return Array.isArray(guestResponse.data) ? guestResponse.data : [];
          } catch {
            return [];
          }
        })
      );
      setPreviousGuestHistory(historyResults.flat());

      if (!selectedDate && ordered.length > 0) {
        setSelectedDate(formatDateForInput(new Date(ordered[0].date)));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load daily statuses'));
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await apiService.getRooms();
      const roomRows = Array.isArray(response.data) ? response.data : [];
      setRooms(roomRows);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load rooms'));
    }
  };

  const fetchGuestCheckins = async (statusId: number | null) => {
    if (!statusId) {
      setGuestCheckins([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDailyGuestCheckins(statusId);
      setGuestCheckins(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load guest check-ins'));
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidatedGuestCheckins = async (mode: 'weekly' | 'monthly') => {
    if (!selectedDate) {
      setGuestCheckins([]);
      return;
    }

    const baseDate = parseDateOnly(selectedDate);
    let start = new Date(baseDate);
    let end = new Date(baseDate);

    if (mode === 'weekly') {
      const weekRange = getWeekRangeForDate(baseDate);
      start = weekRange.weekStart;
      end = weekRange.weekEnd;
    } else {
      start.setDate(1);
      end.setMonth(baseDate.getMonth() + 1, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (mode === 'weekly') {
      const targetStatuses = statuses.filter(s => {
        const d = parseDateOnly(s.date);
        return d >= start && d <= end;
      });

      try {
        setLoading(true);
        setError(null);

        const responses = await Promise.all(
          targetStatuses.map(async (s) => {
            const response = await apiService.getDailyGuestCheckins(s.id);
            const rows: GuestCheckIn[] = Array.isArray(response.data) ? response.data : [];
            return rows.map(row => ({ ...row, statusDate: s.date }));
          })
        );

        const merged = responses.flat().sort(
          (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
        );
        setGuestCheckins(merged);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load weekly consolidated guest check-ins'));
      } finally {
        setLoading(false);
      }
      return;
    }

    const targetStatuses = statuses.filter(s => {
      const d = parseDateOnly(s.date);
      return d >= start && d <= end;
    });

    try {
      setLoading(true);
      setError(null);

      const responses = await Promise.all(
        targetStatuses.map(async (s) => {
          const response = await apiService.getDailyGuestCheckins(s.id);
          const rows: GuestCheckIn[] = Array.isArray(response.data) ? response.data : [];
          return rows.map(row => ({ ...row, statusDate: s.date }));
        })
      );

      const merged = responses.flat().sort(
        (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
      );
      setGuestCheckins(merged);
    } catch (err) {
      setError(getErrorMessage(err, `Failed to load ${mode} consolidated guest check-ins`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    fetchRooms();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (viewMode === 'daily') {
      setSelectedDate((prev) => prev || '');
      setFormData((prev) => ({ ...prev, checkInDate: prev.checkInDate || today }));
    } else if (viewMode === 'weekly' || viewMode === 'monthly') {
      setSelectedDate((prev) => prev || today);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'daily') {
      fetchGuestCheckins(selectedStatus ? selectedStatus.id : null);
      return;
    }

    fetchConsolidatedGuestCheckins(viewMode);
  }, [selectedDate, viewMode, statuses, selectedStatus]);

  useEffect(() => {
    setCollapsedGuestIds((prev) => {
      const next: Record<number, boolean> = {};
      guestCheckins.forEach((guest) => {
        next[guest.id] = prev[guest.id] ?? true;
      });
      return next;
    });
  }, [guestCheckins]);

  const handleCreateCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneValidationTriggered(true);

    if (!formData.checkInDate) {
      setError('Check-in date is required');
      return;
    }

    if (viewMode !== 'daily') {
      setError('Switch to Daily view to add new guest check-ins');
      return;
    }

    if (!formData.guestName.trim()) {
      setError('Guest name is required');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!formData.purpose.trim()) {
      setError('Purpose is required');
      return;
    }

    if (!formData.rentAmount || isNaN(parseFloat(formData.rentAmount)) || parseFloat(formData.rentAmount) < 0) {
      setError('Valid rent amount is required');
      return;
    }

    if (!formData.depositAmount || isNaN(parseFloat(formData.depositAmount)) || parseFloat(formData.depositAmount) < 0) {
      setError('Valid deposit amount is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Find or auto-create a DailyStatus for the chosen check-in date
      let statusId: number;
      const existingStatus = statuses.find(
        s => new Date(s.date).toISOString().split('T')[0] === formData.checkInDate
      );
      if (existingStatus) {
        statusId = existingStatus.id;
      } else {
        const newStatus = await apiService.createDailyStatus({ date: formData.checkInDate });
        statusId = newStatus.data.id;
        await fetchStatuses();
      }

      const created = await apiService.createDailyGuestCheckin(statusId, {
        guestName: formData.guestName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        purpose: formData.purpose.trim(),
        visitingRoomNo: formData.visitingRoomNo.trim() || undefined,
        rentAmount: parseFloat(formData.rentAmount),
        depositAmount: parseFloat(formData.depositAmount),
        checkInTime: buildCheckInTimestamp(formData.checkInDate)
      });

      // Upload proof/photo files if provided
      const initialFormFiles: Array<{ field: GuestCheckinFileField; file: File }> = [];
      if (formFiles.proof) initialFormFiles.push({ field: 'proof', file: formFiles.proof });
      if (formFiles.photo) initialFormFiles.push({ field: 'photo', file: formFiles.photo });

      if (initialFormFiles.length > 0 && created.data?.id) {
        setCreateUploadProgress(0);
        try {
          await uploadGuestFilesInParallel(
            statusId,
            created.data.id,
            initialFormFiles,
            setCreateUploadProgress
          );
        } catch (uploadErr) {
          console.warn('File upload failed after check-in creation:', uploadErr);
        }
      }

      setFormData({
        guestName: '',
        phoneNumber: '',
        purpose: '',
        visitingRoomNo: '',
        rentAmount: '',
        depositAmount: '',
        checkInDate: new Date().toISOString().split('T')[0]
      });
      setFormFiles({ proof: null, photo: null });
      setPhoneValidationTriggered(false);
      setCreateUploadProgress(0);
      setSuccess('Guest check-in recorded successfully');
      await fetchGuestCheckins(statusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create guest check-in'));
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (value: string | Date): string => {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildCheckInTimestamp = (dateValue?: string, fallbackDate?: Date): string => {
    const baseDate = fallbackDate ?? new Date();
    const dateOnly = dateValue ? new Date(dateValue) : new Date(baseDate);

    if (isNaN(dateOnly.getTime())) {
      return baseDate.toISOString();
    }

    const accurateDate = new Date(
      dateOnly.getFullYear(),
      dateOnly.getMonth(),
      dateOnly.getDate(),
      baseDate.getHours(),
      baseDate.getMinutes(),
      baseDate.getSeconds(),
      baseDate.getMilliseconds()
    );

    return accurateDate.toISOString();
  };

  const toDateOnly = (value: string | Date): Date => {
    const date = value instanceof Date ? value : new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getSelectedCheckoutDate = (guest: GuestCheckIn): string => {
    return checkoutDates[guest.id] || formatDateForInput(new Date());
  };

  const calculateStayDays = (checkInTime: string, checkoutDate: string): number => {
    const checkIn = new Date(checkInTime);
    const checkout = new Date(checkoutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkout.getTime())) {
      return 0;
    }

    const checkInDate = toDateOnly(checkIn);
    const checkoutDateOnly = toDateOnly(checkout);
    const diffMs = checkoutDateOnly.getTime() - checkInDate.getTime();
    if (diffMs < 0) {
      return 0;
    }

    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateRentForStay = (checkInTime: string, checkoutDate: string, baseDailyRent: number): number => {
    if (!baseDailyRent || baseDailyRent < 0) {
      return 0;
    }

    const stayDays = calculateStayDays(checkInTime, checkoutDate);
    if (stayDays <= 0) {
      return 0;
    }

    const totalRent = baseDailyRent * stayDays;
    return Math.round(totalRent * 100) / 100;
  };

  const buildCheckoutDateTimeIso = (checkoutDate: string): string => {
    const date = new Date(checkoutDate);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  };

  const refreshCurrentView = async (fallbackStatusId?: number) => {
    if (viewMode === 'daily') {
      await fetchGuestCheckins(selectedStatus?.id ?? fallbackStatusId ?? null);
      return;
    }

    await fetchConsolidatedGuestCheckins(viewMode);
  };

  const handleCheckout = async (guest: GuestCheckIn) => {
    if (!selectedStatus) return;

    if (!guest.dailyStatusId) {
      setError('Missing daily status for this guest check-in');
      return;
    }

    const selectedCheckoutDate = getSelectedCheckoutDate(guest);
    const stayDays = calculateStayDays(guest.checkInTime, selectedCheckoutDate);

    if (!selectedCheckoutDate) {
      setError('Please select a checkout date');
      return;
    }

    if (stayDays <= 0) {
      setError('Checkout date cannot be earlier than check-in date');
      return;
    }

    const calculatedRent = calculateRentForStay(
      guest.checkInTime,
      selectedCheckoutDate,
      guest.rentAmount || 0
    );

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.updateDailyGuestCheckin(guest.dailyStatusId, guest.id, {
        checkOutTime: buildCheckoutDateTimeIso(selectedCheckoutDate),
        rentAmount: calculatedRent
      });

      setSuccess('Guest checked out successfully');
      setCheckoutDates(prev => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
      await refreshCurrentView(guest.dailyStatusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to check out guest'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (guest: GuestCheckIn) => {
    if (!isAdmin) {
      setError('Only admin can delete guest check-ins');
      return;
    }

    if (!guest.dailyStatusId) {
      setError('Missing daily status for this guest check-in');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.deleteDailyGuestCheckin(guest.dailyStatusId, guest.id);

      setSuccess('Guest check-in deleted successfully');
      await refreshCurrentView(guest.dailyStatusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete guest check-in'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoomChange = (roomNumber: string) => {
    const matchedRoom = rooms.find(room => room.number === roomNumber);
    setFormData(prev => ({
      ...prev,
      visitingRoomNo: roomNumber,
      rentAmount: matchedRoom ? String(matchedRoom.rent ?? 0) : prev.rentAmount
    }));
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = normalizePhoneDigits(value);
    setFormData(prev => ({ ...prev, phoneNumber: digitsOnly }));
    if (phoneValidationTriggered) {
      setPhoneValidationTriggered(false);
    }
  };

  const uploadGuestFilesInParallel = async (
    statusId: number,
    guestId: number,
    files: Array<{ field: GuestCheckinFileField; file: File }>,
    onProgress: (progress: number) => void
  ) => {
    if (files.length === 0) {
      onProgress(0);
      return;
    }

    const totalBytes = files.reduce((sum, item) => sum + (item.file.size || 0), 0) || files.length;
    const progressByField: Partial<Record<GuestCheckinFileField, number>> = {};

    const updateAggregateProgress = () => {
      const uploadedBytes = files.reduce((sum, item) => {
        const fieldProgress = Math.max(0, Math.min(100, progressByField[item.field] || 0));
        return sum + (fieldProgress / 100) * (item.file.size || 1);
      }, 0);
      const progress = Math.round((uploadedBytes / totalBytes) * 100);
      onProgress(Math.max(0, Math.min(100, progress)));
    };

    onProgress(0);
    await Promise.all(
      files.map(({ field, file }) =>
        apiService.uploadGuestCheckinFile(statusId, guestId, field, file, (progress) => {
          progressByField[field] = progress;
          updateAggregateProgress();
        })
      )
    );
    onProgress(100);
  };

  const handleUploadFiles = async (guest: GuestCheckIn, files: Partial<Record<GuestCheckinFileField, File | null>>) => {
    const selectedFiles = Object.entries(files)
      .filter(([, file]) => Boolean(file))
      .map(([field, file]) => ({ field: field as GuestCheckinFileField, file: file as File }));

    if (selectedFiles.length === 0) return;

    setUploadingFiles(prev => ({ ...prev, [guest.id]: true }));
    setUploadProgressByGuest(prev => ({ ...prev, [guest.id]: 0 }));
    setError(null);
    setSuccess(null);
    try {
      await uploadGuestFilesInParallel(
        guest.dailyStatusId,
        guest.id,
        selectedFiles,
        (progress) => {
          setUploadProgressByGuest(prev => ({ ...prev, [guest.id]: progress }));
        }
      );
      setSuccess('Files uploaded successfully');
      await refreshCurrentView(guest.dailyStatusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload files'));
    } finally {
      setUploadingFiles(prev => ({ ...prev, [guest.id]: false }));
      setUploadProgressByGuest(prev => ({ ...prev, [guest.id]: 0 }));
    }
  };

  const toggleGuestCard = (guestId: number) => {
    setCollapsedGuestIds(prev => ({
      ...prev,
      [guestId]: !prev[guestId]
    }));
  };

  const startEditGuest = (guest: GuestCheckIn) => {
    setEditingGuest(guest);
    setEditFormData({
      guestName: guest.guestName,
      phoneNumber: guest.phoneNumber || '',
      purpose: guest.purpose || '',
      visitingRoomNo: (guest.visitingRoomNo || '').trim(),
      rentAmount: String(guest.rentAmount ?? ''),
      depositAmount: String(guest.depositAmount ?? ''),
      checkInDate: new Date(guest.checkInTime).toISOString().split('T')[0],
      checkOutDate: guest.checkOutTime ? new Date(guest.checkOutTime).toISOString().split('T')[0] : ''
    });
    setCollapsedGuestIds(prev => ({ ...prev, [guest.id]: false }));
  };

  const cancelEditGuest = () => {
    setEditingGuest(null);
    setEditFormData(null);
  };

  const handleUpdateCheckin = async (guest: GuestCheckIn) => {
    if (!editFormData) return;

    const normalizedPhone = normalizePhoneDigits(editFormData.phoneNumber);
    if (!phoneRegex.test(normalizedPhone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    const parsedRent = parseFloat(editFormData.rentAmount);
    const parsedDeposit = parseFloat(editFormData.depositAmount);
    if (isNaN(parsedRent) || parsedRent < 0) {
      setError('Valid rent amount is required');
      return;
    }
    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
      setError('Valid deposit amount is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiService.updateDailyGuestCheckin(guest.dailyStatusId, guest.id, {
        guestName: editFormData.guestName.trim(),
        phoneNumber: normalizedPhone,
        purpose: editFormData.purpose.trim(),
        visitingRoomNo: editFormData.visitingRoomNo.trim() || undefined,
        rentAmount: parsedRent,
        depositAmount: parsedDeposit,
        checkInTime: buildCheckInTimestamp(editFormData.checkInDate, new Date(guest.checkInTime)),
        checkOutTime: editFormData.checkOutDate ? buildCheckoutDateTimeIso(editFormData.checkOutDate) : undefined
      });

      setSuccess('Guest check-in updated successfully');
      cancelEditGuest();
      await refreshCurrentView(guest.dailyStatusId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update guest check-in'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="management-container guest-checkin-container guest-checkin-mobile-layout">
      <h2 className="section-heading">Guest Check-In Management</h2>

      <div className="toolbar guest-checkin-toolbar guest-checkin-topbar">
        <div className="guest-checkin-toolbar-group guest-checkin-toolbar-inline">
          <select
            className="sort-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'daily' | 'weekly' | 'monthly')}
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly Consolidated</option>
            <option value="monthly">Monthly Consolidated</option>
          </select>

          <input
            type="date"
            className="sort-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="guest-checkin-toolbar-group guest-checkin-toolbar-search">
          <div className="guest-phone-filter-group">
            <input
              type="text"
              className="search-input guest-phone-filter-input"
              placeholder="Search by guest name, phone or purpose"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              list={guestPhoneFilterListId}
            />
            <datalist id={guestPhoneFilterListId}>
              {guestSearchOptions.map((option) => (
                <option
                  key={option.key}
                  value={option.value}
                  label={option.value}
                />
              ))}
            </datalist>
            {phoneFilter && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPhoneFilter('')}
              >
                Clear Phone Filter
              </button>
            )}
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => {
            if (viewMode === 'daily') {
              fetchGuestCheckins(selectedStatus ? selectedStatus.id : null);
              return;
            }
            fetchConsolidatedGuestCheckins(viewMode);
          }}
          disabled={!selectedDate || loading}
        >
          Refresh
        </button>
      </div>

      {selectedStatus && (
        <div className="filter-info guest-checkin-filter-info guest-checkin-status-bar">
          <p>
            {viewMode === 'daily' && `Managing guest entries for ${new Date(selectedStatus.date).toLocaleDateString()}`}
            {viewMode === 'weekly' && `Weekly consolidated view around ${new Date(selectedStatus.date).toLocaleDateString()}`}
            {viewMode === 'monthly' && `Monthly consolidated view for ${new Date(selectedStatus.date).toLocaleDateString()}`}
          </p>
          <p>
            Showing {filteredGuestCheckins.length} of {guestCheckins.length} guest check-in{guestCheckins.length === 1 ? '' : 's'}
            {phoneFilter ? ` for phone match ${phoneFilter}` : ''}
          </p>
        </div>
      )}

      <div className="items-grid guest-checkin-stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="item-card guest-checkin-stat-card">
          <span className="guest-stat-label">Total Guests</span>
          <strong>{consolidatedStats.totalGuests}</strong>
        </div>
        <div className="item-card guest-checkin-stat-card">
          <span className="guest-stat-label">Active</span>
          <strong>{consolidatedStats.activeGuests}</strong>
        </div>
        <div className="item-card guest-checkin-stat-card">
          <span className="guest-stat-label">Checked Out</span>
          <strong>{consolidatedStats.checkedOutGuests}</strong>
        </div>
        <div className="item-card guest-checkin-stat-card">
          <span className="guest-stat-label">Total Rent</span>
          <strong>₹{consolidatedStats.totalRent.toFixed(2)}</strong>
        </div>
        <div className="item-card guest-checkin-stat-card">
          <span className="guest-stat-label">Total Deposit</span>
          <strong>₹{consolidatedStats.totalDeposit.toFixed(2)}</strong>
        </div>
      </div>

      <datalist id="guest-checkin-entry-suggestions">
        {guestEntrySuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="guest-checkin-main-grid">
        {viewMode === 'daily' && (
          <div className="form-container guest-checkin-add-section guest-checkin-panel" style={{ marginBottom: '1rem' }}>
            <div className="guest-checkin-panel-header">
              <h3>Add Guest Check-In</h3>
            </div>
            {formCamera && (
              <CameraCapture
                label={formCamera}
                onCapture={(file) => {
                  setFormFiles(prev => ({ ...prev, [formCamera]: file }));
                  setFormCamera(null);
                }}
                onCancel={() => setFormCamera(null)}
              />
            )}
            <form onSubmit={handleCreateCheckin}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Check-In Date</label>
                <input
                  type="date"
                  value={formData.checkInDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <input
                type="text"
                placeholder="Guest Name *"
                value={formData.guestName}
                list="guest-checkin-entry-suggestions"
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFormData(prev => ({ ...prev, guestName: nextValue }));
                  applyPreviousEntrySuggestion('guestName', nextValue);
                }}
                required
              />
              {guestNameValidationMessage && (
                <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  {guestNameValidationMessage}
                </div>
              )}
              <input
                type="text"
                placeholder="Phone Number"
                value={formData.phoneNumber}
                list="guest-checkin-entry-suggestions"
                onChange={(e) => {
                  const nextValue = e.target.value;
                  handlePhoneChange(nextValue);
                  applyPreviousEntrySuggestion('phoneNumber', nextValue);
                }}
                maxLength={10}
                inputMode="numeric"
                required
              />
              {phoneValidationMessage && (
                <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  {phoneValidationMessage}
                </div>
              )}
              <input
                type="text"
                list="guest-checkin-room-options"
                placeholder="Select Visiting Room *"
                value={formData.visitingRoomNo}
                onChange={(e) => handleRoomChange(e.target.value)}
                required
              />
              <datalist id="guest-checkin-room-options">
                {rooms.map((room) => (
                  <option key={room.id} value={room.number}>
                    Room {room.number} (Rent: {room.rent})
                  </option>
                ))}
              </datalist>
              {roomValidationMessage && (
                <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  {roomValidationMessage}
                </div>
              )}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Rent Amount"
                value={formData.rentAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, rentAmount: e.target.value }))}
                required
              />
              {rentValidationMessage && (
                <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  {rentValidationMessage}
                </div>
              )}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Deposit Amount"
                value={formData.depositAmount}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFormData(prev => ({ ...prev, depositAmount: nextValue }));
                  applyPreviousEntrySuggestion('depositAmount', nextValue);
                }}
                required
              />
              {depositValidationMessage && (
                <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  {depositValidationMessage}
                </div>
              )}
              <textarea
                placeholder="Purpose"
                rows={2}
                value={formData.purpose}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFormData(prev => ({ ...prev, purpose: nextValue }));
                  applyPreviousEntrySuggestion('purpose', nextValue);
                }}
                required
              />
              {purposeValidationMessage && (
                <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  {purposeValidationMessage}
                </div>
              )}
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Proof (ID/document photo)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormFiles(prev => ({ ...prev, proof: e.target.files?.[0] ?? null }))}
                  />
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setFormCamera('proof')}>
                    Use Camera
                  </button>
                  {formFiles.proof && <span style={{ fontSize: '0.85rem', color: '#555' }}>{formFiles.proof.name}</span>}
                </div>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Guest Photo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormFiles(prev => ({ ...prev, photo: e.target.files?.[0] ?? null }))}
                  />
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setFormCamera('photo')}>
                    Use Camera
                  </button>
                  {formFiles.photo && <span style={{ fontSize: '0.85rem', color: '#555' }}>{formFiles.photo.name}</span>}
                </div>
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn btn-success" disabled={saving || !formData.checkInDate || !isFormValid}>
                  {saving ? 'Saving...' : 'Check In Guest'}
                </button>
              </div>
              {saving && createUploadProgress > 0 && (
                <div style={{ marginTop: '0.75rem', width: '100%', maxWidth: 340 }}>
                  <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, createUploadProgress))}%`,
                        height: '100%',
                        background: '#16a34a',
                        transition: 'width 0.2s ease'
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#14532d' }}>
                    Uploading documents {Math.max(0, Math.min(100, createUploadProgress))}%
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      <div className="guest-checkin-list-panel">
        {loading ? (
          <LoadingSpinner />
        ) : filteredGuestCheckins.length === 0 ? (
          <div className="no-results-message">
            <p>
              {phoneFilter
                ? 'No guest check-ins match the selected phone number.'
                : 'No guest check-ins found for the selected date.'}
            </p>
          </div>
        ) : (
          <div className="items-grid guest-checkin-list-grid">
            {filteredGuestCheckins.map((guest) => {
              const isCheckedOut = Boolean(guest.checkOutTime);
              const isCollapsed = collapsedGuestIds[guest.id] ?? true;
              return (
                <div key={guest.id} className={`item-card guest-checkin-card${isCollapsed ? ' is-collapsed' : ''}`}>
                  <div className="item-header">
                    <div className="guest-card-title-block">
                      <h4>{guest.guestName}</h4>
                      <div className="guest-card-summary">
                        <span>{guest.phoneNumber || 'No phone number'}</span>
                        <span style={{ fontWeight: 800, color: '#0f172a', background: '#fef3c7', borderRadius: 6, padding: '0.1rem 0.35rem' }}>
                          {guest.visitingRoomNo ? `Room ${guest.visitingRoomNo}` : 'No room assigned'}
                        </span>
                        <span>{isCheckedOut ? 'Checked out' : 'Active'}</span>
                        <span style={{ fontWeight: 600, color: '#1e3a8a' }}>
                          Check-In: {new Date(guest.checkInTime).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="item-actions">
                      {!isCheckedOut && (
                        <input
                          type="date"
                          className="sort-select"
                          value={getSelectedCheckoutDate(guest)}
                          min={formatDateForInput(guest.checkInTime)}
                          max={formatDateForInput(new Date())}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCheckoutDates(prev => ({ ...prev, [guest.id]: value }));
                          }}
                          disabled={saving}
                          style={{ minWidth: '150px' }}
                        />
                      )}
                      <button
                        type="button"
                        className="guest-checkin-icon-button success"
                        onClick={() => handleCheckout(guest)}
                        disabled={isCheckedOut || saving}
                        title={isCheckedOut ? 'Checked out' : 'Check out guest'}
                        aria-label={isCheckedOut ? 'Checked out' : 'Check out guest'}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="guest-checkin-icon-button secondary"
                        onClick={() => editingGuest?.id === guest.id ? cancelEditGuest() : startEditGuest(guest)}
                        disabled={saving}
                        title={editingGuest?.id === guest.id ? 'Cancel edit' : 'Edit guest'}
                        aria-label={editingGuest?.id === guest.id ? 'Cancel edit' : 'Edit guest'}
                      >
                        {editingGuest?.id === guest.id ? '×' : '✎'}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="guest-checkin-icon-button danger"
                          onClick={() => handleDelete(guest)}
                          disabled={saving}
                          title="Delete guest"
                          aria-label="Delete guest"
                        >
                          🗑
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-collapse-icon"
                        onClick={() => toggleGuestCard(guest.id)}
                        aria-expanded={!isCollapsed}
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                      >
                        {isCollapsed ? '▶' : '▼'}
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="guest-card-content">
                      {editingGuest?.id === guest.id && editFormData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                          <h4 style={{ margin: 0 }}>Edit Guest Check-In</h4>
                          <label style={{ fontWeight: 500, fontSize: '0.85rem' }}>Check-In Date</label>
                          <input
                            type="date"
                            value={editFormData.checkInDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, checkInDate: e.target.value } : prev)}
                          />
                          <input
                            type="text"
                            placeholder="Guest Name *"
                            value={editFormData.guestName}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, guestName: e.target.value } : prev)}
                          />
                          <input
                            type="text"
                            placeholder="Phone Number"
                            value={editFormData.phoneNumber}
                            maxLength={10}
                            inputMode="numeric"
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, phoneNumber: normalizePhoneDigits(e.target.value) } : prev)}
                          />
                          <select
                            value={editFormData.visitingRoomNo}
                            onChange={(e) => {
                              const matchedRoom = rooms.find(r => r.number.trim() === e.target.value.trim());
                              setEditFormData(prev => prev ? {
                                ...prev,
                                visitingRoomNo: e.target.value,
                                rentAmount: matchedRoom ? String(matchedRoom.rent ?? prev.rentAmount) : prev.rentAmount
                              } : prev);
                            }}
                          >
                            <option value="">Select Visiting Room</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.number.trim()}>Room {room.number} (Rent: {room.rent})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Rent Amount"
                            value={editFormData.rentAmount}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, rentAmount: e.target.value } : prev)}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Deposit Amount"
                            value={editFormData.depositAmount}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, depositAmount: e.target.value } : prev)}
                          />
                          <textarea
                            placeholder="Purpose"
                            rows={2}
                            value={editFormData.purpose}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, purpose: e.target.value } : prev)}
                          />
                          <label style={{ fontWeight: 500, fontSize: '0.85rem' }}>Check-Out Date (optional)</label>
                          <input
                            type="date"
                            value={editFormData.checkOutDate}
                            min={editFormData.checkInDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, checkOutDate: e.target.value } : prev)}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleUpdateCheckin(guest)}
                              disabled={saving}
                            >
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={cancelEditGuest}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="guest-card-tab-bar" role="tablist" aria-label="Guest details tabs">
                            <button
                              type="button"
                              className={`guest-card-tab${(guestCardTabs[guest.id] ?? 'overview') === 'overview' ? ' active' : ''}`}
                              onClick={() => setGuestCardTabs(prev => ({ ...prev, [guest.id]: 'overview' }))}
                            >
                              Overview
                            </button>
                            <button
                              type="button"
                              className={`guest-card-tab${(guestCardTabs[guest.id] ?? 'overview') === 'documents' ? ' active' : ''}`}
                              onClick={() => setGuestCardTabs(prev => ({ ...prev, [guest.id]: 'documents' }))}
                            >
                              Documents
                            </button>
                          </div>

                          {(guestCardTabs[guest.id] ?? 'overview') === 'overview' ? (
                            <div style={{ position: 'relative', paddingTop: '0.75rem' }}>
                              <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>Room</span>
                                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{guest.visitingRoomNo || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>Check-In</span>
                                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{new Date(guest.checkInTime).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>Check-Out</span>
                                  <span style={{ fontSize: '1.0rem', fontWeight: 700, color: guest.checkOutTime ? '#0f172a' : '#b45309' }}>{guest.checkOutTime ? new Date(guest.checkOutTime).toLocaleString() : 'Still inside'}</span>
                                </div>
                              </div>
                              <div className="guest-card-overview-grid" style={{ paddingTop: '5.2rem' }}>
                                <p><strong>Phone</strong><span>{guest.phoneNumber || 'N/A'}</span></p>
                                <p><strong>Status Date</strong><span>{guest.statusDate ? new Date(guest.statusDate).toLocaleDateString() : 'N/A'}</span></p>
                                <p><strong>Rent</strong><span>₹{(guest.rentAmount || 0).toFixed(2)}</span></p>
                                <p><strong>Deposit</strong><span>₹{(guest.depositAmount || 0).toFixed(2)}</span></p>
                                <p><strong>Purpose</strong><span>{guest.purpose || 'N/A'}</span></p>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '1.05rem' }}>Check-Out</strong>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: guest.checkOutTime ? '#0f172a' : '#b45309' }}>{guest.checkOutTime ? new Date(guest.checkOutTime).toLocaleString() : 'Still inside'}</span>
                                </p>
                                {!isCheckedOut && (
                                  <p>
                                    <strong>Auto Rent</strong>
                                    <span>₹{calculateRentForStay(guest.checkInTime, getSelectedCheckoutDate(guest), guest.rentAmount || 0).toFixed(2)} for {calculateStayDays(guest.checkInTime, getSelectedCheckoutDate(guest))} day(s)</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="guest-card-documents-panel">
                              <GuestFileUploadSection
                                guest={guest}
                                uploading={!!uploadingFiles[guest.id]}
                                uploadProgress={uploadProgressByGuest[guest.id] || 0}
                                onUpload={handleUploadFiles}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
