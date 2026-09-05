import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../api';
import LoadingSpinner from './LoadingSpinner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QRCodeSVG } from 'qrcode.react';
import './ManagementStyles.css';
import './MonthlyMeterReading.css';
import RoomMonthlyEbReportTable from './RoomMonthlyEbReportTable';

interface ServiceAllocation {
  id: number;
  serviceId: number;
  roomId: number;
  lastReadingDate?: string | null;
  lastEndingReading?: string | null;
  service: {
    id: number;
    consumerNo: string;
    meterNo: string;
    load: string;
    serviceCategory: string;
    consumerName: string;
  };
  room: {
    id: number;
    number: string;
    rent: number;
    beds: number;
  };
}

interface MonthlyReading {
  serviceAllocId: number;
  readingTakenDate: string;
  startingMeterReading: string;
  endingMeterReading: string;
  unitRate?: number;
  meterPhoto1?: string;
  meterPhoto2?: string;
  meterPhoto3?: string;
}

export default function MonthlyMeterReading(): JSX.Element {
  const [allocations, setAllocations] = useState<ServiceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().split('T')[0].slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [chargePerUnit, setChargePerUnit] = useState(15);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MonthlyReading>({
    serviceAllocId: 0,
    readingTakenDate: new Date().toISOString().split('T')[0],
    startingMeterReading: '',
    endingMeterReading: '',
    unitRate: 15
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    shops: true,
    residential: true
  });
  const [calculatedCharges, setCalculatedCharges] = useState<{ consumption: number; charges: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [qrGeneratorRoomNumber, setQrGeneratorRoomNumber] = useState('');
  const [ocrCameraActive, setOcrCameraActive] = useState(false);
  const [ocrCameraError, setOcrCameraError] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [ocrExtractedText, setOcrExtractedText] = useState<string | null>(null);

  // Ref for auto-focusing on ending meter reading input
  const endingMeterReadingRef = useRef<HTMLInputElement>(null);
  const meterReadingFormRef = useRef<HTMLDivElement>(null);
  const meterReadingTitleRef = useRef<HTMLHeadingElement>(null);
  const hasProcessedScanRef = useRef(false);
  const ocrVideoRef = useRef<HTMLVideoElement>(null);
  const ocrStreamRef = useRef<MediaStream | null>(null);

  // Calculate charges on the fly when readings or unit rate change
  useEffect(() => {
    if (
      formData.startingMeterReading &&
      formData.endingMeterReading &&
      formData.unitRate
    ) {
      const starting = parseFloat(formData.startingMeterReading);
      const ending = parseFloat(formData.endingMeterReading);
      const rate = formData.unitRate;

      if (!isNaN(starting) && !isNaN(ending) && !isNaN(rate)) {
        const consumption = ending - starting;
        if (consumption >= 0) {
          const charges = Math.round(consumption * rate * 100) / 100;
          setCalculatedCharges({ consumption, charges });
          setValidationError(null);
        } else {
          setCalculatedCharges(null);
          setValidationError('⚠️ Ending meter reading cannot be less than starting meter reading');
        }
      }
    } else {
      setCalculatedCharges(null);
      setValidationError(null);
    }
  }, [
    formData.startingMeterReading,
    formData.endingMeterReading,
    formData.unitRate,
  ]);

  // Auto-focus on ending meter reading input when a room is selected
  useEffect(() => {
    if (selectedAllocationId && endingMeterReadingRef.current) {
      // Use setTimeout to ensure the field is rendered before focusing
      setTimeout(() => {
        endingMeterReadingRef.current?.focus();
      }, 100);
    }
  }, [selectedAllocationId]);

  useEffect(() => {
    if (showForm) {
      // Bring the record meter reading section into view and focus it for keyboard users.
      setTimeout(() => {
        meterReadingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        meterReadingTitleRef.current?.focus();
      }, 100);
    }
  }, [showForm]);

  const stopOcrCamera = useCallback(() => {
    if (ocrVideoRef.current) {
      ocrVideoRef.current.pause();
      ocrVideoRef.current.srcObject = null;
    }

    if (ocrStreamRef.current) {
      ocrStreamRef.current.getTracks().forEach(track => track.stop());
      ocrStreamRef.current = null;
    }

    setOcrCameraActive(false);
    setOcrBusy(false);
  }, []);

  useEffect(() => () => {
    stopOcrCamera();
  }, [stopOcrCamera]);

  useEffect(() => {
    if (!ocrCameraActive || !ocrStreamRef.current || !ocrVideoRef.current) {
      return;
    }

    const videoElement = ocrVideoRef.current;
    if (videoElement.srcObject !== ocrStreamRef.current) {
      videoElement.srcObject = ocrStreamRef.current;
    }

    videoElement.muted = true;
    videoElement.playsInline = true;

    void videoElement.play().catch((err) => {
      console.error('Unable to start OCR camera preview:', err);
      setOcrCameraError(err instanceof Error ? err.message : 'Unable to show the camera preview.');
    });
  }, [ocrCameraActive]);

  const loadLastCapturedPhotos = useCallback(async () => {
    try {
      const response = await apiService.getMiscellaneousFiles();
      const files = response.data?.files || [];

      files
        .filter((file: any) => {
          const category = String(file.category || '').toLowerCase();
          const blobName = String(file.blobName || file.url || '').toLowerCase();
          return category === 'ebmeter-readings' || blobName.includes('ebmeter-readings/');
        })
        .forEach((file: any) => {
          const blobName = file.blobName || file.url || '';
          const fileName = blobName.split('/').pop() || blobName;
          const roomMatch = fileName.match(/room([a-z0-9]+)[_-]\d{4}-\d{2}-\d{2}/i);

          if (roomMatch) {
            getRoomPhotoKey(roomMatch[1]);
          }
        });
    } catch (error) {
      console.error('[Meter Reading Photos] Failed to load captured images:', error);
    }
  }, []);

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        setLoading(true);
        const response = await apiService.getServiceAllocationsForReading();
        setAllocations(response.data || []);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load service allocations';
        setError(errorMsg);
        console.error('Error fetching allocations:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchAllocations();
    void loadLastCapturedPhotos();
  }, [loadLastCapturedPhotos]);

  // Helper function to check if room is a shop (no beds)
  const isShop = (beds: number): boolean => beds === 0;

  const filteredAllocations = allocations.filter(alloc =>
    searchTerm === '' ||
    alloc.room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alloc.service.consumerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(alloc.service.meterNo).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group allocations by category
  const groupedAllocations = filteredAllocations.reduce((acc, alloc) => {
    const category = isShop(alloc.room.beds) ? 'shops' : 'residential';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(alloc);
    return acc;
  }, {} as Record<string, ServiceAllocation[]>);

  const getPreviousMonthKey = (monthKey: string): string | null => {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return null;
    }

    const [yearValue, monthValue] = monthKey.split('-').map(Number);
    const monthDate = new Date(yearValue, monthValue - 1, 1);
    monthDate.setMonth(monthDate.getMonth() - 1);
    const previousYear = monthDate.getFullYear();
    const previousMonth = String(monthDate.getMonth() + 1).padStart(2, '0');
    return `${previousYear}-${previousMonth}`;
  };

  const getPreviousMonthReadingDate = (alloc: ServiceAllocation, monthKey: string): Date | null => {
    if (!alloc.lastReadingDate) {
      return null;
    }

    const previousMonthKey = getPreviousMonthKey(monthKey);
    if (!previousMonthKey) {
      return null;
    }

    const readingDate = new Date(alloc.lastReadingDate);
    if (Number.isNaN(readingDate.getTime())) {
      return null;
    }

    const readingKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, '0')}`;
    return readingKey === previousMonthKey ? readingDate : null;
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const normalizeRoomNumber = (value: string): string => {
    return value.toLowerCase().replace(/^room\s*/i, '').replace(/[^a-z0-9]/gi, '');
  };

  const extractRoomNumberFromQrPayload = (rawPayload: string): string => {
    const trimmed = rawPayload.trim();

    if (!trimmed) {
      return '';
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedPayload = JSON.parse(trimmed) as Record<string, unknown>;
        const keysToCheck = ['roomNumber', 'room', 'number'];

        for (const key of keysToCheck) {
          const value = parsedPayload[key];
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }
      } catch (_error) {
        // Fall through to plain text parsing.
      }
    }

    const roomPrefixMatch = trimmed.match(/room\s*[:=-]?\s*([a-z0-9-]+)/i);
    if (roomPrefixMatch && roomPrefixMatch[1]) {
      return roomPrefixMatch[1].trim();
    }

    return trimmed;
  };

  const handleOpenScanner = () => {
    hasProcessedScanRef.current = false;
    setScannerError(null);
    setScanSuccessMessage(null);
    setShowQrScanner(true);
  };

  const handleCloseScanner = () => {
    setShowQrScanner(false);
  };

  const getRoomPhotoKey = (roomNumber: string): string => normalizeRoomNumber(roomNumber);

  const buildQrScanFileName = (roomNumber: string): string => {
    const safeRoomNumber = roomNumber.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown';
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `room${safeRoomNumber}_${dateStamp}.png`;
  };

  const captureAndUploadQrScanImage = async (roomNumber: string): Promise<void> => {
    try {
      const scannerVideo = document.querySelector('.qr-scanner-frame video') as HTMLVideoElement | null;
      if (!scannerVideo || scannerVideo.videoWidth === 0 || scannerVideo.videoHeight === 0) {
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = scannerVideo.videoWidth;
      canvas.height = scannerVideo.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      context.drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);

      const fileName = buildQrScanFileName(roomNumber);
      const dataUrl = canvas.toDataURL('image/png');
      const [meta, base64Data] = dataUrl.split(',');
      const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
      const binaryString = atob(base64Data || '');
      const fileBytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i += 1) {
        fileBytes[i] = binaryString.charCodeAt(i);
      }

      const file = new File([fileBytes], fileName, { type: mimeType });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'ebmeter-readings');
      formData.append('customFileName', fileName);
      formData.append('note', `QR scan for room ${roomNumber}`);
      formData.append('storageTargets', 'oracle');
      formData.append('targetStorage', 'oracle');
      formData.append('uploadToOracle', 'true');

      const response = await apiService.uploadMiscellaneousFile(formData);
      await loadLastCapturedPhotos();
      console.log('[QR Scan Upload] Uploaded image to Oracle:', response.data?.url || response.data?.blobName || fileName);
    } catch (error) {
      console.error('[QR Scan Upload] Failed to upload QR scan image:', error);
    }
  };

  const handleQrScanResult = async (rawPayload: string) => {
    const scannedRoomText = extractRoomNumberFromQrPayload(rawPayload);
    const normalizedScannedRoom = normalizeRoomNumber(scannedRoomText);

    if (!normalizedScannedRoom) {
      setScannerError('Unable to read room number from the scanned QR code.');
      hasProcessedScanRef.current = false;
      return;
    }

    const matchedAllocation = allocations.find(
      (alloc) => normalizeRoomNumber(alloc.room.number) === normalizedScannedRoom
    );

    if (!matchedAllocation) {
      setScannerError(`No room matched the scanned code: ${scannedRoomText}`);
      hasProcessedScanRef.current = false;
      return;
    }

    await handleSelectAllocation(matchedAllocation);
    await captureAndUploadQrScanImage(matchedAllocation.room.number);
    setScanSuccessMessage(`Room ${matchedAllocation.room.number} selected from QR scan.`);
    setScannerError(null);
    setShowQrScanner(false);
  };

  const handlePrintRoomQr = () => {
    const roomNumber = qrGeneratorRoomNumber.trim();

    if (!roomNumber) {
      setError('Please enter a room number before printing QR code.');
      return;
    }

    const qrSvgElement = document.querySelector('.qr-generator-preview svg');
    if (!qrSvgElement) {
      setError('QR code is not ready to print. Please try again.');
      return;
    }

    const serializedSvg = new XMLSerializer().serializeToString(qrSvgElement);
    const encodedSvg = encodeURIComponent(serializedSvg);
    const dataUri = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    const printWindow = window.open('', '_blank', 'width=520,height=700');
    if (!printWindow) {
      setError('Popup blocked. Please allow popups and retry printing.');
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Room ${roomNumber} QR Label</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
          }
          .label {
            width: 380px;
            margin: 24px auto;
            border: 2px solid #0f172a;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
          }
          h1 {
            margin: 0 0 6px 0;
            font-size: 28px;
          }
          p {
            margin: 0;
            font-size: 14px;
            color: #475569;
          }
          .qr {
            margin: 18px auto 10px auto;
            width: 220px;
            height: 220px;
            border: 1px dashed #94a3b8;
            border-radius: 8px;
            display: grid;
            place-items: center;
          }
          .qr img {
            width: 200px;
            height: 200px;
          }
          .code {
            margin-top: 6px;
            font-size: 13px;
            color: #334155;
          }
          @media print {
            body {
              margin: 0;
            }
            .label {
              margin-top: 8mm;
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <h1>Room ${roomNumber}</h1>
          <p>Scan this QR to select room in EB meter reading</p>
          <div class="qr">
            <img src="${dataUri}" alt="Room ${roomNumber} QR" />
          </div>
          <div class="code">ROOM:${roomNumber}</div>
        </div>
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const startOcrCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setOcrCameraError('Camera access is not supported on this browser.');
      return;
    }

    try {
      setOcrCameraError(null);
      setOcrExtractedText(null);
      setOcrPreviewUrl(null);
      stopOcrCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      ocrStreamRef.current = stream;
      setOcrCameraActive(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to start the camera.';
      setOcrCameraError(errorMsg);
      stopOcrCamera();
    }
  }, [stopOcrCamera]);

  const captureMeterReadingFromCamera = useCallback(async () => {
    const videoElement = ocrVideoRef.current;
    if (!videoElement) {
      setOcrCameraError('Camera preview is not ready.');
      return;
    }

    try {
      setOcrBusy(true);
      setOcrCameraError(null);
      setOcrExtractedText(null);

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to create a photo from the camera preview.');
      }

      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL('image/png');
      setOcrPreviewUrl(photoDataUrl);

      const roomNumber = (qrGeneratorRoomNumber || allocations.find((alloc) => alloc.id === selectedAllocationId)?.room.number || 'unknown').trim();
      const safeRoomNumber = roomNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown';
      const dateStamp = new Date().toISOString().slice(0, 10);
      const fileName = `room${safeRoomNumber}_${dateStamp}.png`;

      const [meta, base64Data] = photoDataUrl.split(',');
      const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
      const binaryString = atob(base64Data || '');
      const fileBytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i += 1) {
        fileBytes[i] = binaryString.charCodeAt(i);
      }

      const file = new File([fileBytes], fileName, { type: mimeType });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'ebmeter-readings');
      formData.append('customFileName', fileName);
      formData.append('note', `Meter reading photo for room ${roomNumber}`);
      formData.append('storageTargets', 'oracle');
      formData.append('targetStorage', 'oracle');
      formData.append('uploadToOracle', 'true');

      const response = await apiService.uploadMiscellaneousFile(formData);
      await loadLastCapturedPhotos();
      console.log('[Meter Reading Capture] Uploaded image to Oracle:', response.data?.url || response.data?.blobName || fileName);
      setSuccessMessage(`✓ Meter reading photo captured and uploaded to Oracle Cloud: ${fileName}`);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Image upload failed. Please try again.';
      setOcrCameraError(errorMsg);
    } finally {
      setOcrBusy(false);
    }
  }, [allocations, qrGeneratorRoomNumber, selectedAllocationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectAllocation = async (alloc: ServiceAllocation) => {
    setSelectedAllocationId(alloc.id);
    setQrGeneratorRoomNumber(alloc.room.number || '');
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Auto-populate form data
    setFormData(prev => ({
      ...prev,
      serviceAllocId: alloc.id,
      readingTakenDate: new Date().toISOString().split('T')[0],
      unitRate: chargePerUnit
    }));

    // Fetch previous month's ending reading
    try {
      const response = await apiService.getPreviousMonthEndingReading(alloc.id, month, year);
      if (response.data && response.data.length > 0) {
        const previousReading = response.data[0];
        setFormData(prev => ({
          ...prev,
          startingMeterReading: String(previousReading.endingMeterReading?.trim() || '')
        }));
      }
    } catch (err) {
      console.error('Error fetching previous meter reading:', err);
      // Continue without pre-filling - user can enter manually
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceAllocId || !formData.startingMeterReading || !formData.endingMeterReading) {
      setError('Please fill in all required fields');
      return;
    }

    // Check validation error
    if (validationError) {
      setError('Please correct the validation errors before submitting');
      return;
    }

    try {
      // Create service consumption
      const consumptionData = {
        serviceAllocId: formData.serviceAllocId,
        readingTakenDate: formData.readingTakenDate,
        startingMeterReading: parseInt(formData.startingMeterReading),
        endingMeterReading: formData.endingMeterReading,
        unitRate: formData.unitRate || chargePerUnit,
        meterPhoto1: formData.meterPhoto1,
        meterPhoto2: formData.meterPhoto2,
        meterPhoto3: formData.meterPhoto3
      };

      await apiService.createServiceConsumption(consumptionData);

      setSuccessMessage(`✓ Meter reading recorded and charges calculated successfully!`);
      setFormData({
        serviceAllocId: 0,
        readingTakenDate: new Date().toISOString().split('T')[0],
        startingMeterReading: '',
        endingMeterReading: '',
        unitRate: chargePerUnit
      });
      setSelectedAllocationId(null);
      setQrGeneratorRoomNumber('');
      setShowForm(false);
      setValidationError(null);
      setReportRefreshKey((prev) => prev + 1);
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record meter reading';
      setError(errorMsg);
      console.error('Error recording meter reading:', err);
    }
  };

  const handleAddReadingClick = () => {
    if (showForm) {
      setShowForm(false);
      return;
    }

    setShowForm(true);
  };

  const handleRoomCardClick = async (alloc: ServiceAllocation) => {
    setShowForm(true);
    await handleSelectAllocation(alloc);
  };

  return (
    <div className="meter-reading-container">
      <h2 className="section-heading">EB Meter Reading</h2>
      {error && <div className="message error">{error}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}

      <div className="meter-reading-toolbar">
        <div className="toolbar-group">
          <label>Search Room/Service:</label>
          <input
            type="text"
            placeholder="Search by room number, service name, or meter number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-group">
          <label>Month for Reading:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className="toolbar-group">
          <label>Charge Per Unit (₹):</label>
          <input
            type="number"
            value={chargePerUnit}
            onChange={(e) => setChargePerUnit(parseFloat(e.target.value) || 15)}
            step="0.50"
            min="1"
          />
        </div>

        <div className="toolbar-group">
          <button 
            onClick={handleAddReadingClick}
          >
            {showForm ? '✕ Close Form' : '+ Add Reading'}
          </button>
        </div>
      </div>

      <RoomMonthlyEbReportTable
        selectedMonth={selectedMonth}
        roomOptions={Array.from(
          new Map(allocations.map((a) => [a.room.id, { id: a.room.id, number: a.room.number }])).values()
        ).sort((a, b) => a.number.localeCompare(b.number))}
        refreshKey={reportRefreshKey}
      />

      {expandedPhotoUrl && (
        <div className="meter-photo-modal-backdrop" onClick={() => setExpandedPhotoUrl(null)}>
          <div className="meter-photo-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="meter-photo-modal-close" onClick={() => setExpandedPhotoUrl(null)}>Close</button>
            <img src={expandedPhotoUrl} alt="Captured meter reading" className="meter-photo-modal-image" />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading service allocations" />
      ) : filteredAllocations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="empty-state">No service allocations found</p>
        </div>
      ) : (
        <div className="categories-container">
          {Object.entries(groupedAllocations).map(([category, roomAllocations]) => {
            const title = category === 'residential' ? 'Residential' : 'Shops';
            const icon = category === 'residential' ? '🏠' : '🏪';

            return (
              <div key={category} className="category-section">
                <div className="category-header" onClick={() => toggleCategory(category)}>
                  <span className="category-toggle-icon">{collapsedCategories[category] ? '▶' : '▼'}</span>
                  <h2 className="category-title">{icon} {title} ({roomAllocations.length})</h2>
                </div>

                {!collapsedCategories[category] && (
                  <div className="meter-room-grid">
                    {roomAllocations.map(alloc => {
                      const isSelected = selectedAllocationId === alloc.id;
                      const previousMonthReadingDate = getPreviousMonthReadingDate(alloc, selectedMonth);
                      const previousMonthReadingTaken = !!previousMonthReadingDate;

                      return (
                        <React.Fragment key={alloc.id}>
                          <button
                            type="button"
                            className={`meter-room-card ${isSelected ? 'selected' : ''} ${previousMonthReadingTaken ? 'reading-taken' : 'reading-pending'} ${isShop(alloc.room.beds) ? 'shop' : 'residential'}`}
                            onClick={() => void handleRoomCardClick(alloc)}
                            aria-label={`Room ${alloc.room.number}${previousMonthReadingTaken ? ', previous month reading already taken' : ', previous month reading pending'}`}
                          >
                            <div className="meter-room-circle">
                              <span className="meter-room-status-dot" aria-hidden="true" />
                              <span className="meter-room-number-only">{alloc.room.number}</span>
                              <span className="meter-room-status-label">
                                {previousMonthReadingTaken ? 'Prev Read' : 'Needs Read'}
                              </span>
                            </div>
                            <div className="meter-room-meta">
                              <span className="meter-room-type">{isShop(alloc.room.beds) ? 'Shop' : 'Residential'}</span>
                              {previousMonthReadingTaken && previousMonthReadingDate ? (
                                <span className="meter-room-highlight">{previousMonthReadingDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              ) : (
                                <span className="meter-room-pending">No prior read</span>
                              )}
                            </div>
                          </button>

                          {showForm && isSelected && (
                            <div className="meter-selected-room-form" ref={meterReadingFormRef}>
                              <h2 className="form-section-title" ref={meterReadingTitleRef} tabIndex={-1}>Record Meter Reading</h2>

                              <div className="qr-actions-row">
                                <button type="button" className="btn-qr-scan" onClick={handleOpenScanner}>
                                  Scan Room QR
                                </button>
                                {scanSuccessMessage && <span className="qr-scan-success">{scanSuccessMessage}</span>}
                              </div>

                              {showQrScanner && (
                                <div className="qr-scanner-panel">
                                  <div className="qr-scanner-header">
                                    <h3>Scan Room QR Code</h3>
                                    <button type="button" className="btn-qr-close" onClick={handleCloseScanner}>Close</button>
                                  </div>
                                  <p className="qr-scanner-help">Point the camera at a room QR code to auto-select the room.</p>
                                  <div className="qr-scanner-frame">
                                    <Scanner
                                      constraints={{ facingMode: 'environment' }}
                                      scanDelay={300}
                                      onScan={(detectedCodes) => {
                                        if (detectedCodes.length > 0 && !hasProcessedScanRef.current) {
                                          hasProcessedScanRef.current = true;
                                          const payload = detectedCodes[0].rawValue;
                                          void handleQrScanResult(payload);
                                        }
                                      }}
                                      onError={() => {
                                        setScannerError('Unable to access camera. Please allow camera permission and retry.');
                                        hasProcessedScanRef.current = false;
                                      }}
                                      allowMultiple={false}
                                    />
                                  </div>
                                  {scannerError && <div className="qr-scanner-error">{scannerError}</div>}
                                </div>
                              )}

                              <form onSubmit={handleSubmit}>
                                {!selectedAllocationId ? (
                                  <div style={{
                                    background: '#E3F2FD',
                                    color: '#1976D2',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #1976D2',
                                    marginBottom: '20px'
                                  }}>
                                    <p style={{ margin: 0 }}>Select a room/service below to record its meter reading</p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="qr-generator-panel">
                                      <div className="qr-generator-left">
                                        <h3>Room QR Generator</h3>
                                        <p>Generate or print a QR code for this room. Scanning this code auto-selects the room.</p>
                                        <label htmlFor="qr-room-number-input">Room Number</label>
                                        <input
                                          id="qr-room-number-input"
                                          type="text"
                                          value={qrGeneratorRoomNumber}
                                          onChange={(e) => setQrGeneratorRoomNumber(e.target.value)}
                                          placeholder="Enter room number"
                                        />
                                        <small>Encoded value: ROOM:{qrGeneratorRoomNumber.trim() || 'N/A'}</small>
                                        <button
                                          type="button"
                                          className="btn-qr-print"
                                          onClick={handlePrintRoomQr}
                                          disabled={!qrGeneratorRoomNumber.trim()}
                                        >
                                          Print QR Label
                                        </button>
                                      </div>
                                      <div className="qr-generator-preview">
                                        {qrGeneratorRoomNumber.trim() ? (
                                          <QRCodeSVG
                                            value={`ROOM:${qrGeneratorRoomNumber.trim()}`}
                                            size={180}
                                            level="M"
                                            includeMargin
                                          />
                                        ) : (
                                          <div className="qr-generator-empty">Enter a room number to generate QR.</div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="form-row">
                                      <div className="form-group">
                                        <label>Reading Date *</label>
                                        <input
                                          type="date"
                                          name="readingTakenDate"
                                          value={formData.readingTakenDate}
                                          onChange={handleInputChange}
                                          required
                                        />
                                      </div>

                                      <div className="form-group">
                                        <label>Starting Meter Reading *</label>
                                        <input
                                          type="number"
                                          name="startingMeterReading"
                                          value={formData.startingMeterReading}
                                          onChange={handleInputChange}
                                          placeholder="Previous month's ending reading"
                                          required
                                        />
                                        {formData.startingMeterReading && (
                                          <p style={{
                                            fontSize: '11px',
                                            color: '#27ae60',
                                            margin: '4px 0 0 0',
                                            fontWeight: '500'
                                          }}>
                                            ✓ Auto-filled from previous month's reading
                                          </p>
                                        )}
                                      </div>

                                      <div className="form-group">
                                        <label>Ending Meter Reading *</label>
                                        <input
                                          ref={endingMeterReadingRef}
                                          type="number"
                                          name="endingMeterReading"
                                          value={formData.endingMeterReading}
                                          onChange={handleInputChange}
                                          placeholder="This month's reading"
                                          required
                                        />
                                        <div className="ocr-camera-actions">
                                          <button type="button" className="btn-ocr-start" onClick={() => {
                                            if (ocrCameraActive) {
                                              stopOcrCamera();
                                            } else {
                                              void startOcrCamera();
                                            }
                                          }}>
                                            {ocrCameraActive ? 'Close Camera' : 'Capture Reading Photo'}
                                          </button>
                                          {ocrCameraActive && (
                                            <button type="button" className="btn-ocr-capture" onClick={() => void captureMeterReadingFromCamera()} disabled={ocrBusy}>
                                              {ocrBusy ? 'Uploading...' : 'Capture & Upload'}
                                            </button>
                                          )}
                                        </div>
                                        {ocrCameraActive && (
                                          <div className="ocr-camera-panel">
                                            <div className="ocr-camera-preview-wrap">
                                              <video ref={ocrVideoRef} className="ocr-camera-preview" autoPlay muted playsInline />
                                              <div className="ocr-focus-overlay" aria-hidden="true">
                                                <div className="ocr-focus-box" />
                                              </div>
                                            </div>
                                            <p className="ocr-camera-help">Place only the meter digits inside the box for best results.</p>
                                            {ocrPreviewUrl && <img src={ocrPreviewUrl} alt="OCR capture preview" className="ocr-camera-preview-image" />}
                                            {ocrCameraError && <p className="ocr-camera-error">{ocrCameraError}</p>}
                                            {ocrExtractedText && <p className="ocr-camera-text">OCR text: {ocrExtractedText}</p>}
                                          </div>
                                        )}
                                        {validationError && (
                                          <p style={{
                                            fontSize: '11px',
                                            color: '#e74c3c',
                                            margin: '4px 0 0 0',
                                            fontWeight: '600',
                                            backgroundColor: '#fadbd8',
                                            padding: '6px 8px',
                                            borderRadius: '4px',
                                            borderLeft: '3px solid #e74c3c'
                                          }}>
                                            {validationError}
                                          </p>
                                        )}
                                      </div>

                                      <div className="form-group">
                                        <label>Unit Rate (₹) *</label>
                                        <input
                                          type="number"
                                          name="unitRate"
                                          value={formData.unitRate}
                                          onChange={handleInputChange}
                                          step="0.50"
                                          required
                                        />
                                      </div>
                                    </div>

                                    {calculatedCharges && (
                                      <div className="meter-summary-panel" style={{
                                        background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
                                        border: '2px solid #dc2626',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '20px'
                                      }}>
                                        <h3 className="meter-summary-title" style={{
                                          fontSize: '14px',
                                          fontWeight: 700,
                                          color: '#b91c1c',
                                          margin: '0 0 12px 0',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}>⚡ EB Reading Summary</h3>
                                        <div className="meter-summary-grid" style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                          gap: '12px'
                                        }}>
                                          <div className="meter-summary-item">
                                            <div className="meter-summary-label">Reading Date</div>
                                            <div className="meter-summary-value">{formData.readingTakenDate ? new Date(formData.readingTakenDate).toLocaleDateString('en-IN') : '-'}</div>
                                          </div>
                                          <div className="meter-summary-item">
                                            <div className="meter-summary-label">Start</div>
                                            <div className="meter-summary-value">{formData.startingMeterReading || 0}</div>
                                          </div>
                                          <div className="meter-summary-item">
                                            <div className="meter-summary-label">End</div>
                                            <div className="meter-summary-value">{formData.endingMeterReading || 0}</div>
                                          </div>
                                          <div className="meter-summary-item">
                                            <div className="meter-summary-label">Units</div>
                                            <div className="meter-summary-value">{calculatedCharges.consumption}</div>
                                          </div>
                                          <div className="meter-summary-item">
                                            <div className="meter-summary-label">Rate</div>
                                            <div className="meter-summary-value">₹{Number(formData.unitRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                          </div>
                                          <div className="meter-summary-item">
                                            <div className="meter-summary-label">Total</div>
                                            <div className="meter-summary-value">₹{calculatedCharges.charges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                          </div>
                                        </div>
                                        <div className="meter-summary-formula" style={{
                                          marginTop: '12px',
                                          padding: '8px',
                                          background: 'rgba(220, 38, 38, 0.06)',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          color: '#991b1b',
                                          textAlign: 'center',
                                          fontWeight: 700
                                        }}>
                                          {calculatedCharges.consumption} units × ₹{Number(formData.unitRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ₹{calculatedCharges.charges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    )}

                                    <div className="form-actions">
                                      <button type="submit" className="btn-save">
                                        💾 Save & Calculate Charges
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedAllocationId(null);
                                          setQrGeneratorRoomNumber('');
                                          setFormData({
                                            serviceAllocId: 0,
                                            readingTakenDate: new Date().toISOString().split('T')[0],
                                            startingMeterReading: '',
                                            endingMeterReading: '',
                                            unitRate: chargePerUnit
                                          });
                                          setValidationError(null);
                                        }}
                                        className="btn-cancel"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </>
                                )}
                              </form>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
