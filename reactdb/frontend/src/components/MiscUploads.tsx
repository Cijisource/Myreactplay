import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../api';
import './ManagementStyles.css';
import './MiscUploads.css';

type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';
type CaptureMode = 'photo' | 'video' | null;

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string | null;
  source: 'files' | 'camera';
  status: UploadStatus;
  progress: number;
  attempts: number;
  error?: string;
  resultUrl?: string;
  blobName?: string;
}

interface UploadedMiscFile {
  blobName: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  note?: string;
  uploadedAt: string | null;
}

const MAX_UPLOAD_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 700;

const getSupportedRecordingMimeType = (): string => {
  const candidateTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];

  for (const mimeType of candidateTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return 'video/webm';
};

const sleep = (delayMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, delayMs));

const createItemId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatDisplayDate = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatDisplayTime = (value: string | null): string => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const isPreviewable = (file: File): boolean => file.type.startsWith('image/') || file.type.startsWith('video/');

const getCategoryForFile = (file: File): string => {
  if (file.type.startsWith('image/')) return 'photos';
  if (file.type.startsWith('video/')) return 'recordings';
  if (file.type.startsWith('audio/')) return 'recordings';
  return 'documents';
};

export default function MiscUploads() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedMiscFile[]>([]);
  const [note, setNote] = useState('');
  const [parallelism, setParallelism] = useState(3);
  const [selectedMonth, setSelectedMonth] = useState(formatMonthKey(new Date()));
  const [uploadedLoading, setUploadedLoading] = useState(false);
  const [uploadedError, setUploadedError] = useState<string | null>(null);
  const [deletingBlobName, setDeletingBlobName] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const queueRef = useRef<UploadItem[]>([]);

  const queuedCount = useMemo(() => queue.filter(item => item.status === 'queued' || item.status === 'failed').length, [queue]);
  const uploading = useMemo(() => queue.some(item => item.status === 'uploading'), [queue]);
  const filesByDate = useMemo(() => {
    return uploadedFiles.reduce<Record<string, UploadedMiscFile[]>>((groups, file) => {
      const parsedDate = file.uploadedAt ? new Date(file.uploadedAt) : null;
      const dateKey = parsedDate && !Number.isNaN(parsedDate.getTime()) ? formatDateKey(parsedDate) : 'unknown';
      groups[dateKey] = groups[dateKey] || [];
      groups[dateKey].push(file);
      return groups;
    }, {});
  }, [uploadedFiles]);
  const calendarDays = useMemo(() => {
    const [yearText, monthText] = selectedMonth.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlankDays = firstDay.getDay();

    return [
      ...Array.from({ length: leadingBlankDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const date = new Date(year, monthIndex, index + 1);
        return formatDateKey(date);
      })
    ];
  }, [selectedMonth]);
  const monthFileCount = useMemo(() => {
    return uploadedFiles.filter(file => {
      if (!file.uploadedAt) return false;
      const parsedDate = new Date(file.uploadedAt);
      return !Number.isNaN(parsedDate.getTime()) && formatMonthKey(parsedDate) === selectedMonth;
    }).length;
  }, [selectedMonth, uploadedFiles]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const attachCameraStream = useCallback(async () => {
    const videoElement = videoRef.current;
    const stream = streamRef.current;

    if (!videoElement || !stream) {
      return;
    }

    if (videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
    }

    try {
      await videoElement.play();
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Unable to show camera preview.');
    }
  }, []);

  const loadUploadedFiles = useCallback(async () => {
    try {
      setUploadedLoading(true);
      setUploadedError(null);
      const response = await apiService.getMiscellaneousFiles();
      setUploadedFiles(response.data.files || []);
    } catch (error) {
      setUploadedError(error instanceof Error ? error.message : 'Failed to load uploaded files');
    } finally {
      setUploadedLoading(false);
    }
  }, []);

  const deleteUploadedFile = useCallback(async (blobName: string, queueItemId?: string) => {
    if (!window.confirm('Delete this file from blob storage?')) {
      return;
    }

    try {
      setDeletingBlobName(blobName);
      setUploadedError(null);
      await apiService.deleteMiscellaneousFile(blobName);
      setUploadedFiles(prev => prev.filter(file => file.blobName !== blobName));

      if (queueItemId) {
        setQueue(prev => {
          const target = prev.find(item => item.id === queueItemId);
          if (target?.previewUrl) {
            URL.revokeObjectURL(target.previewUrl);
          }
          return prev.filter(item => item.id !== queueItemId);
        });
      }
    } catch (error) {
      setUploadedError(error instanceof Error ? error.message : 'Failed to delete uploaded file');
    } finally {
      setDeletingBlobName(null);
    }
  }, []);

  const addFiles = useCallback((files: File[], source: 'files' | 'camera') => {
    const nextItems = files.map(file => ({
      id: createItemId(),
      file,
      previewUrl: isPreviewable(file) ? URL.createObjectURL(file) : null,
      source,
      status: 'queued' as UploadStatus,
      progress: 0,
      attempts: 0
    }));

    setQueue(prev => [...nextItems, ...prev]);
  }, []);

  const stopCamera = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setRecording(false);
    setRecordingSeconds(0);
    setCaptureMode(null);
  }, []);

  const startCamera = useCallback(async (mode: Exclude<CaptureMode, null>) => {
    try {
      stopCamera();
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: mode === 'video'
      });

      streamRef.current = stream;
      setCaptureMode(mode);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Unable to start camera.');
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError('Photo capture failed.');
      return;
    }

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));

    if (!blob) {
      setCameraError('Photo capture failed.');
      return;
    }

    addFiles([new File([blob], `misc-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })], 'camera');
  }, [addFiles]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = getSupportedRecordingMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = event => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      addFiles([new File([blob], `misc-recording-${Date.now()}.${extension}`, { type: mimeType })], 'camera');
      chunksRef.current = [];
      setRecording(false);
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };

    recorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(seconds => seconds + 1);
    }, 1000);
  }, [addFiles]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setQueue(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(item => item.id !== id);
    });
  }, []);

  const clearFinished = useCallback(() => {
    setQueue(prev => {
      prev.forEach(item => {
        if (item.status === 'uploaded' && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return prev.filter(item => item.status !== 'uploaded');
    });
  }, []);

  const uploadOne = useCallback(async (item: UploadItem) => {
    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
      try {
        updateItem(item.id, {
          status: 'uploading',
          attempts: attempt,
          error: undefined,
          progress: attempt === 1 ? 0 : item.progress
        });

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('category', getCategoryForFile(item.file));
        formData.append('note', note);

        const response = await apiService.uploadMiscellaneousFile(formData, progress => {
          updateItem(item.id, { progress });
        });

        updateItem(item.id, {
          status: 'uploaded',
          progress: 100,
          resultUrl: response.data.url,
          blobName: response.data.blobName
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';

        if (attempt >= MAX_UPLOAD_ATTEMPTS) {
          updateItem(item.id, {
            status: 'failed',
            error: message,
            progress: 0,
            attempts: attempt
          });
          return;
        }

        updateItem(item.id, {
          status: 'uploading',
          error: `${message}. Retrying...`,
          attempts: attempt
        });
        await sleep(BASE_RETRY_DELAY_MS * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250));
      }
    }
  }, [note, updateItem]);

  const uploadQueue = useCallback(async () => {
    const candidates = queue.filter(item => item.status === 'queued' || item.status === 'failed');
    let nextIndex = 0;
    const workerCount = Math.min(parallelism, candidates.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < candidates.length) {
        const item = candidates[nextIndex];
        nextIndex += 1;
        await uploadOne(item);
      }
    });

    await Promise.all(workers);
    await loadUploadedFiles();
  }, [loadUploadedFiles, parallelism, queue, uploadOne]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    loadUploadedFiles();
  }, [loadUploadedFiles]);

  useEffect(() => {
    if (captureMode) {
      void attachCameraStream();
    }
  }, [attachCameraStream, captureMode]);

  useEffect(() => {
    return () => {
      stopCamera();
      queueRef.current.forEach(item => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [stopCamera]);

  return (
    <div className="management-container misc-uploads">
      <h1>Misc Uploads</h1>

      <div className="misc-upload-layout">
        <section className="misc-panel">
          <h3>Upload Source</h3>

          <div className="misc-field">
            <label htmlFor="misc-files">Files</label>
            <input
              id="misc-files"
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              onChange={event => {
                addFiles(Array.from(event.target.files || []), 'files');
                event.target.value = '';
              }}
            />
          </div>

          <div className="misc-field">
            <label htmlFor="misc-note">Note</label>
            <textarea
              id="misc-note"
              value={note}
              maxLength={300}
              onChange={event => setNote(event.target.value)}
            />
          </div>

          <div className="misc-field">
            <label htmlFor="misc-parallelism">Parallel Uploads</label>
            <select
              id="misc-parallelism"
              value={parallelism}
              onChange={event => setParallelism(Number(event.target.value))}
              disabled={uploading}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>

          <div className="misc-actions">
            <button type="button" className="btn btn-primary" onClick={uploadQueue} disabled={uploading || queuedCount === 0}>
              {uploading ? 'Uploading...' : `Upload ${queuedCount}`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearFinished} disabled={uploading || !queue.some(item => item.status === 'uploaded')}>
              Clear Uploaded
            </button>
          </div>

          <div className="misc-camera">
            <h3>Camera</h3>
            {captureMode && (
              <video ref={videoRef} className="misc-camera-preview" autoPlay muted playsInline />
            )}
            {cameraError && <div className="misc-error">{cameraError}</div>}
            <div className="misc-actions">
              {!captureMode && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => startCamera('photo')}>
                    Photo
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => startCamera('video')}>
                    Video
                  </button>
                </>
              )}
              {captureMode === 'photo' && (
                <>
                  <button type="button" className="btn btn-primary" onClick={capturePhoto}>
                    Capture
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={stopCamera}>
                    Close
                  </button>
                </>
              )}
              {captureMode === 'video' && (
                <>
                  {recording ? (
                    <button type="button" className="btn btn-danger" onClick={stopRecording}>
                      <span className="misc-recording-dot" />
                      Stop {recordingSeconds}s
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={startRecording}>
                      Record
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={stopCamera}>
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="misc-panel">
          <div className="misc-queue-header">
            <h3>Queue</h3>
            <span>{queue.length} file{queue.length === 1 ? '' : 's'}</span>
          </div>

          {queue.length === 0 ? (
            <p className="misc-empty">No files selected</p>
          ) : (
            <div className="misc-file-list">
              {queue.map(item => (
                <div className="misc-file-item" key={item.id}>
                  <div className="misc-preview">
                    {item.file.type.startsWith('image/') && item.previewUrl ? (
                      <img src={item.previewUrl} alt="" />
                    ) : item.file.type.startsWith('video/') && item.previewUrl ? (
                      <video src={item.previewUrl} muted />
                    ) : (
                      <span>{getCategoryForFile(item.file).slice(0, 3).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="misc-file-main">
                    <p className="misc-file-name">{item.file.name}</p>
                    <p className="misc-file-meta">
                      {formatFileSize(item.file.size)} · {item.file.type || 'unknown'} · {item.source}
                    </p>
                    <div className="misc-progress-track">
                      <div className="misc-progress-fill" style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
                    </div>
                    <div className="misc-status-row">
                      <span>{item.status} · attempt {item.attempts || 0}/{MAX_UPLOAD_ATTEMPTS}</span>
                      <div className="misc-actions">
                        {item.resultUrl && (
                          <a className="misc-success-link" href={item.resultUrl} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        )}
                        {item.status !== 'uploading' && (
                          <button
                            type="button"
                            className={`btn btn-sm ${item.blobName ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => item.blobName ? deleteUploadedFile(item.blobName, item.id) : removeItem(item.id)}
                            disabled={item.blobName === deletingBlobName}
                          >
                            {item.blobName ? 'Delete' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                    {item.error && <div className="misc-error">{item.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="misc-panel misc-calendar-panel">
        <div className="misc-calendar-toolbar">
          <div>
            <h3>Uploaded Files</h3>
            <p>{monthFileCount} file{monthFileCount === 1 ? '' : 's'} in selected month</p>
          </div>
          <div className="misc-calendar-controls">
            <input
              type="month"
              value={selectedMonth}
              onChange={event => setSelectedMonth(event.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={loadUploadedFiles} disabled={uploadedLoading}>
              {uploadedLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {uploadedError && <div className="misc-error">{uploadedError}</div>}

        <div className="misc-calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
            <span key={dayName}>{dayName}</span>
          ))}
        </div>

        <div className="misc-calendar-grid">
          {calendarDays.map((dateKey, index) => {
            if (!dateKey) {
              return <div className="misc-calendar-day misc-calendar-day-empty" key={`empty-${index}`} />;
            }

            const dayFiles = filesByDate[dateKey] || [];
            const dayNumber = Number(dateKey.slice(-2));

            return (
              <div className="misc-calendar-day" key={dateKey} title={formatDisplayDate(dateKey)}>
                <div className="misc-calendar-date">
                  <span>{dayNumber}</span>
                  <small>{dayFiles.length ? `${dayFiles.length} file${dayFiles.length === 1 ? '' : 's'}` : ''}</small>
                </div>

                {dayFiles.length === 0 ? (
                  <p className="misc-calendar-empty-day">No uploads</p>
                ) : (
                  <div className="misc-calendar-files">
                    {dayFiles.map(file => (
                      <article className="misc-calendar-file" key={file.blobName}>
                        <div>
                          <a className="misc-file-name" href={file.url} target="_blank" rel="noopener noreferrer">
                            {file.originalName}
                          </a>
                          <p className="misc-file-meta">
                            {formatDisplayTime(file.uploadedAt)} · {formatFileSize(file.size)} · {file.category}
                          </p>
                          {file.note && <p className="misc-calendar-note">{file.note}</p>}
                        </div>
                        <div className="misc-calendar-file-actions">
                          <a className="misc-success-link" href={file.url} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteUploadedFile(file.blobName)}
                            disabled={deletingBlobName === file.blobName}
                          >
                            {deletingBlobName === file.blobName ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {uploadedFiles.length > 0 && filesByDate.unknown && (
          <div className="misc-unknown-date">
            <h4>Unknown Date</h4>
            <div className="misc-calendar-files">
              {filesByDate.unknown.map(file => (
                <article className="misc-calendar-file" key={file.blobName}>
                  <div>
                    <a className="misc-file-name" href={file.url} target="_blank" rel="noopener noreferrer">
                      {file.originalName}
                    </a>
                    <p className="misc-file-meta">
                      {formatFileSize(file.size)} · {file.mimeType}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteUploadedFile(file.blobName)}
                    disabled={deletingBlobName === file.blobName}
                  >
                    {deletingBlobName === file.blobName ? 'Deleting...' : 'Delete'}
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
