import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../api';
import LoadingSpinner from './LoadingSpinner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QRCodeSVG } from 'qrcode.react';
import { createWorker } from 'tesseract.js';
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
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});
  const [calculatedCharges, setCalculatedCharges] = useState<{ consumption: number; charges: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
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

    fetchAllocations();
  }, []);

  useEffect(() => {
    // Initialize all cards as collapsed by default
    if (allocations.length > 0) {
      const initialCollapsedState: Record<number, boolean> = {};
      allocations.forEach(alloc => {
        initialCollapsedState[alloc.id] = true;
      });
      setCollapsedCards(initialCollapsedState);
    }
  }, [allocations]);

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

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleCard = (allocationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedCards(prev => ({
      ...prev,
      [allocationId]: !prev[allocationId]
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

  const parseMeterReadingText = useCallback((rawText: string): string | null => {
    const normalizedText = rawText.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const candidates = Array.from(normalizedText.matchAll(/\d{3,10}/g))
      .map(match => match[0])
      .map(value => Number(value))
      .filter(value => Number.isFinite(value) && value > 99 && value < 10000000);

    if (!candidates.length) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    const filteredCandidates = candidates.filter(value => !(value >= 1900 && value <= currentYear + 1));
    const rankedCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;
    const bestCandidate = rankedCandidates.sort((a, b) => b - a)[0];

    return String(bestCandidate);
  }, []);

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

      if (ocrVideoRef.current) {
        ocrVideoRef.current.srcObject = stream;
        ocrVideoRef.current.muted = true;
        ocrVideoRef.current.playsInline = true;
        await ocrVideoRef.current.play();
      }
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
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setOcrPreviewUrl(photoDataUrl);

      const worker = await createWorker('eng');
      try {
        const { data } = await worker.recognize(photoDataUrl);
        const parsedValue = parseMeterReadingText(data.text);
        setOcrExtractedText(data.text);

        if (parsedValue) {
          setFormData(prev => ({ ...prev, endingMeterReading: parsedValue }));
          setSuccessMessage(`✓ Meter reading detected from camera: ${parsedValue}`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          setOcrCameraError('No clear meter number was detected. Please try again with better lighting.');
        }
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'OCR failed. Please try again.';
      setOcrCameraError(errorMsg);
    } finally {
      setOcrBusy(false);
    }
  }, [parseMeterReadingText]);

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

      {showForm && (
        <div className="meter-reading-form" ref={meterReadingFormRef}>
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
                        {ocrCameraActive ? 'Close Camera' : 'Use Camera OCR'}
                      </button>
                      {ocrCameraActive && (
                        <button type="button" className="btn-ocr-capture" onClick={() => void captureMeterReadingFromCamera()} disabled={ocrBusy}>
                          {ocrBusy ? 'Reading...' : 'Capture & Read'}
                        </button>
                      )}
                    </div>
                    {ocrCameraActive && (
                      <div className="ocr-camera-panel">
                        <video ref={ocrVideoRef} className="ocr-camera-preview" autoPlay muted playsInline />
                        <p className="ocr-camera-help">Point the camera at the EB meter and capture a clear photo.</p>
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

                {/* Real-time Charge Calculation Display */}
                {calculatedCharges && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #f9f5ff 100%)',
                    border: '2px solid #4f46e5',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1e40af',
                      margin: '0 0 12px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>⚡ Real-Time Charge Calculation</h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px'
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #3b82f6'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                          letterSpacing: '0.3px'
                        }}>Unit Consumption</div>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#1e40af'
                        }}>{calculatedCharges.consumption} units</div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #10b981'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                          letterSpacing: '0.3px'
                        }}>Calculated Charges</div>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#047857'
                        }}>₹{calculatedCharges.charges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      background: 'rgba(79, 70, 229, 0.05)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#4f46e5',
                      textAlign: 'center'
                    }}>
                      {calculatedCharges.consumption} units × ₹{formData.unitRate} per unit = ₹{calculatedCharges.charges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {loading ? (
        <LoadingSpinner text="Loading service allocations" />
      ) : filteredAllocations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="empty-state">No service allocations found</p>
        </div>
      ) : (
        <div className="categories-container">
          {/* Shops Category */}
          {groupedAllocations['shops'] && groupedAllocations['shops'].length > 0 && (
            <div className="category-section">
              <div className="category-header" onClick={() => toggleCategory('shops')}>
                <span className="category-toggle-icon">{collapsedCategories['shops'] ? '▶' : '▼'}</span>
                <h2 className="category-title">🏪 Shops ({groupedAllocations['shops'].length})</h2>
              </div>
              
              {!collapsedCategories['shops'] && (
                <div className="allocations-grid">
                  {groupedAllocations['shops'].map(alloc => (
                    <div key={alloc.id} onClick={() => handleSelectAllocation(alloc)} className={`allocation-card ${selectedAllocationId === alloc.id ? 'selected' : ''} shop-category ${collapsedCards[alloc.id] ? 'collapsed' : ''}`}>
                      <div className="card-collapsed-header">
                        <div className="collapsed-room-info">
                          <h3>Room {alloc.room.number}</h3>
                          <span className="shop-badge">🏪 SHOP</span>
                        </div>
                        <button className="collapse-btn" onClick={(e) => toggleCard(alloc.id, e)} title="Expand/Collapse">{collapsedCards[alloc.id] ? '▼ Expand' : '▲ Collapse'}</button>
                      </div>

                      {alloc.lastReadingDate && (
                        <div className="collapsed-reading-info">
                          <div className="reading-item">
                            <label>Last Reading:</label>
                            <span>{new Date(alloc.lastReadingDate).toLocaleDateString()}</span>
                          </div>
                          {alloc.lastEndingReading && (
                            <div className="reading-item">
                              <label>Last Value:</label>
                              <span className="reading-value">{String(alloc.lastEndingReading).trim()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!collapsedCards[alloc.id] && (
                        <>
                          <div className="card-header">
                            <div className="room-info-container">
                              <h3>Room {alloc.room.number}</h3>
                              <span className="shop-badge">🏪 SHOP</span>
                            </div>
                            <span className="service-badge">{alloc.service.serviceCategory}</span>
                          </div>

                          <div className="card-body">
                            <div className="info-row">
                              <label>Service:</label>
                              <span>{alloc.service.consumerName}</span>
                            </div>

                            <div className="info-row">
                              <label>Meter No:</label>
                              <span>{alloc.service.meterNo}</span>
                            </div>

                            <div className="info-row">
                              <label>Consumer No:</label>
                              <span>{alloc.service.consumerNo}</span>
                            </div>

                            <div className="info-row">
                              <label>Load:</label>
                              <span>{alloc.service.load}</span>
                            </div>

                            <div className="info-row">
                              <label>Room Rent:</label>
                              <span>₹{alloc.room.rent.toLocaleString()}</span>
                            </div>

                            <div className="info-row">
                              <label>Category:</label>
                              <span>🏪 Shop/Commercial</span>
                            </div>

                            {alloc.lastReadingDate && (
                              <>
                                <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ecf0f1' }}>
                                  <label>Last Reading Date:</label>
                                  <span>{new Date(alloc.lastReadingDate).toLocaleDateString()}</span>
                                </div>
                                {alloc.lastEndingReading && (
                                  <div className="info-row">
                                    <label>Last Ending Reading:</label>
                                    <span style={{ fontWeight: '700', color: '#2c3e50' }}>{String(alloc.lastEndingReading).trim()}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}

                      <div className="card-footer">
                        {selectedAllocationId === alloc.id ? (
                          <span className="selected-badge">✓ Selected</span>
                        ) : (
                          <span style={{ color: '#3498db', fontWeight: '600', fontSize: '12px' }}>Click to Select</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Residential Category */}
          {groupedAllocations['residential'] && groupedAllocations['residential'].length > 0 && (
            <div className="category-section">
              <div className="category-header" onClick={() => toggleCategory('residential')}>
                <span className="category-toggle-icon">{collapsedCategories['residential'] ? '▶' : '▼'}</span>
                <h2 className="category-title">🏠 Residential ({groupedAllocations['residential'].length})</h2>
              </div>
              
              {!collapsedCategories['residential'] && (
                <div className="allocations-grid">
                  {groupedAllocations['residential'].map(alloc => (
                    <div key={alloc.id} onClick={() => handleSelectAllocation(alloc)} className={`allocation-card ${selectedAllocationId === alloc.id ? 'selected' : ''} residential-category ${collapsedCards[alloc.id] ? 'collapsed' : ''}`}>
                      <div className="card-collapsed-header">
                        <div className="collapsed-room-info">
                          <h3>Room {alloc.room.number}</h3>
                          <span className="residential-badge">🏠 RESIDENTIAL</span>
                        </div>
                        <button className="collapse-btn" onClick={(e) => toggleCard(alloc.id, e)} title="Expand/Collapse">{collapsedCards[alloc.id] ? '▼ Expand' : '▲ Collapse'}</button>
                      </div>

                      {alloc.lastReadingDate && (
                        <div className="collapsed-reading-info">
                          <div className="reading-item">
                            <label>Last Reading:</label>
                            <span>{new Date(alloc.lastReadingDate).toLocaleDateString()}</span>
                          </div>
                          {alloc.lastEndingReading && (
                            <div className="reading-item">
                              <label>Last Value:</label>
                              <span className="reading-value">{String(alloc.lastEndingReading).trim()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!collapsedCards[alloc.id] && (
                        <>
                          <div className="card-header">
                            <div className="room-info-container">
                              <h3>Room {alloc.room.number}</h3>
                              <span className="residential-badge">🏠 RESIDENTIAL</span>
                            </div>
                            <span className="service-badge">{alloc.service.serviceCategory}</span>
                          </div>

                          <div className="card-body">
                            <div className="info-row">
                              <label>Service:</label>
                              <span>{alloc.service.consumerName}</span>
                            </div>

                            <div className="info-row">
                              <label>Meter No:</label>
                              <span>{alloc.service.meterNo}</span>
                            </div>

                            <div className="info-row">
                              <label>Consumer No:</label>
                              <span>{alloc.service.consumerNo}</span>
                            </div>

                            <div className="info-row">
                              <label>Load:</label>
                              <span>{alloc.service.load}</span>
                            </div>

                            <div className="info-row">
                              <label>Room Rent:</label>
                              <span>₹{alloc.room.rent.toLocaleString()}</span>
                            </div>

                            <div className="info-row">
                              <label>Category:</label>
                              <span>Residential ({alloc.room.beds} bed{alloc.room.beds !== 1 ? 's' : ''})</span>
                            </div>

                            {alloc.lastReadingDate && (
                              <>
                                <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ecf0f1' }}>
                                  <label>Last Reading Date:</label>
                                  <span>{new Date(alloc.lastReadingDate).toLocaleDateString()}</span>
                                </div>
                                {alloc.lastEndingReading && (
                                  <div className="info-row">
                                    <label>Last Ending Reading:</label>
                                    <span style={{ fontWeight: '700', color: '#2c3e50' }}>{String(alloc.lastEndingReading).trim()}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}

                      <div className="card-footer">
                        {selectedAllocationId === alloc.id ? (
                          <span className="selected-badge">✓ Selected</span>
                        ) : (
                          <span style={{ color: '#3498db', fontWeight: '600', fontSize: '12px' }}>Click to Select</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
