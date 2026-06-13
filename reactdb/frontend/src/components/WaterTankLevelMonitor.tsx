import { useEffect, useState } from 'react';
import './WaterTankLevelMonitor.css';
import './WaterTankMain.css';

interface MeterGraphReading {
  timestamp: string;
  v1?: number;
  v2?: number;
  v3?: number;
  v4?: number;
  v6?: number;
  v9?: number;
}

interface MainTankReading {
  timestamp: string;
  v10?: number;
  v14?: number;
}

// Request the pins we need
const BLYNK_API_URL = 'https://blynk.cloud/external/api/get?token=2NMuxK5u-e8X0yB7nF0Ye459GIGH21jC&V1&V2&V3&V4&V6&V9';

// Main Tank API (separate token + pins V10 & V14)
const MAIN_TANK_API_URL = 'https://blynk.cloud/external/api/get?token=w-R8a_nmrqsPSdWhD7WFTKn02G6ptVtu&V10&V14';

// Parse Blynk response to a map of pin->value. Supports JSON object, arrays, or simple text.
const parseBlynkResponse = (text: string): Record<string, number> => {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const out: Record<string, number> = {};
      for (const k of Object.keys(parsed)) {
        const n = parseFloat(String((parsed as any)[k]));
        if (Number.isFinite(n)) out[k] = n;
      }
      return out;
    }
  } catch {
    // fallthrough
  }

  // lines
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.reduce((acc, line, i) => {
      const n = parseFloat(line);
      if (Number.isFinite(n)) acc[`V${i + 1}`] = n;
      return acc;
    }, {} as Record<string, number>);
  }

  // comma-separated
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.reduce((acc, part, i) => {
      const n = parseFloat(part);
      if (Number.isFinite(n)) acc[`V${i + 1}`] = n;
      return acc;
    }, {} as Record<string, number>);
  }

  const single = parseFloat(trimmed);
  if (Number.isFinite(single)) return { V1: single };
  return {};
};

// (replaced by formatPinValue)

const msToDuration = (ms?: number) => {
  if (!ms || !Number.isFinite(ms)) return '--';
  const total = Math.floor(ms / 1000);
  const secs = total % 60;
  const mins = Math.floor((total % 3600) / 60);
  const hrs = Math.floor(total / 3600);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatPinValue = (pin: string, value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  switch (pin) {
    case 'V4':
      return `${value}%`;
    case 'V1':
      return `${value} cm`;
    case 'V2':
    case 'V3':
      return `${value} L`;
    case 'V6':
      return msToDuration(value);
    case 'V9':
      return `${value} ft`;
    default:
      return String(value);
  }
};

// Small SVG speedometer component
function Speedometer({ value = 0, max = 100, size = 160, label = '' }: { value?: number; max?: number; size?: number; label?: string }) {
  const safeMax = max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? value : 0;
  const ratio = Math.max(0, Math.min(1, safeValue / safeMax));
  const cx = size / 2;
  const cy = size / 2 + 4;
  const r = size * 0.38;
  const startAngle = -120;
  const endAngle = 120;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polar = (angle: number) => ({ x: cx + r * Math.cos(toRad(angle)), y: cy + r * Math.sin(toRad(angle)) });
  const start = polar(startAngle);
  const end = polar(endAngle);
  const current = polar(startAngle + (endAngle - startAngle) * ratio);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const filledLargeArc = Math.abs((startAngle + (endAngle - startAngle) * ratio) - startAngle) > 180 ? 1 : 0;
  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  const fillPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${filledLargeArc} 1 ${current.x} ${current.y}`;
  const fillColor = ratio > 0.8 ? '#f97316' : ratio > 0.55 ? '#facc15' : '#22c55e';
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) / 4) * index;
    const inner = polar(angle);
    const outer = { x: cx + (r + 8) * Math.cos(toRad(angle)), y: cy + (r + 8) * Math.sin(toRad(angle)) };
    const label = Math.round((safeMax / 4) * index);
    const labelPos = { x: cx + (r + 18) * Math.cos(toRad(angle)), y: cy + (r + 18) * Math.sin(toRad(angle)) + 4 };
    return { inner, outer, label, labelPos };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r + 14} fill="#fbfcff" opacity={0.8} />
      <path d={trackPath} stroke="#dbeafe" strokeWidth={16} fill="none" strokeLinecap="round" />
      <path d={fillPath} stroke={fillColor} strokeWidth={16} fill="none" strokeLinecap="round" />
      {ticks.map((tick, index) => (
        <g key={index}>
          <line x1={tick.inner.x} y1={tick.inner.y} x2={tick.outer.x} y2={tick.outer.y} stroke="#94a3b8" strokeWidth={2} />
          <text x={tick.labelPos.x} y={tick.labelPos.y} fontSize={10} textAnchor="middle" fill="#334155" fontWeight={600}>
            {tick.label}
          </text>
        </g>
      ))}
      <line x1={cx} y1={cy} x2={current.x} y2={current.y} stroke="#0f172a" strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={10} fill="#0f172a" />
      <circle cx={cx} cy={cy} r={5} fill="#ffffff" />
      <text x={cx} y={cy + r * 0.9} fontSize={12} textAnchor="middle" fill="#475569">
        {label}
      </text>
      <text x={cx} y={cy + r * 0.9 + 16} fontSize={14} textAnchor="middle" fill="#0f172a" fontWeight={700}>
        {Math.round(safeValue)}
      </text>
    </svg>
  );
}

export default function WaterTankLevelMonitor(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestReading, setLatestReading] = useState<MeterGraphReading | null>(null);
  const [history, setHistory] = useState<MeterGraphReading[]>([]);
  const [speedometerMax, setSpeedometerMax] = useState<number>(100);

  // Main tank state
  const [mainLoading, setMainLoading] = useState(false);
  const [mainError, setMainError] = useState<string | null>(null);
  const [mainTank, setMainTank] = useState<MainTankReading | null>(null);
  const [mainHistory, setMainHistory] = useState<MainTankReading[]>([]);

  const chartMaxValue = Math.max(
    1,
    ...history.flatMap((p) => [p.v1 ?? 0, p.v2 ?? 0, p.v3 ?? 0, p.v4 ?? 0, p.v6 ?? 0, p.v9 ?? 0]),
    latestReading?.v1 ?? 0,
    latestReading?.v2 ?? 0,
    latestReading?.v3 ?? 0,
    latestReading?.v4 ?? 0,
    latestReading?.v6 ?? 0,
    latestReading?.v9 ?? 0
  );

  const fetchMeterValues = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(BLYNK_API_URL);
      if (!response.ok) throw new Error(`Failed to load Blynk meter values: ${response.status} ${response.statusText}`);

      const text = await response.text();
      const map = parseBlynkResponse(text);

      if (Object.keys(map).length > 0) {
        const reading: MeterGraphReading = {
          timestamp: new Date().toLocaleString(),
          v1: map['V1'] ?? map['1'] ?? undefined,
          v2: map['V2'] ?? map['2'] ?? undefined,
          v3: map['V3'] ?? map['3'] ?? undefined,
          v4: map['V4'] ?? map['4'] ?? undefined,
          v6: map['V6'] ?? map['6'] ?? undefined,
          v9: map['V9'] ?? map['9'] ?? undefined,
        };

        setLatestReading(reading);
        setHistory((prev) => [reading, ...prev].slice(0, 12));
      } else {
        throw new Error('Unexpected Blynk response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Blynk meter values');
      console.error('WaterTankLevelMonitor fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeterValues();
  }, []);

  useEffect(() => {
    // keep default max at least as large as observed data
    const observedMax = Math.max(1, chartMaxValue);
    setSpeedometerMax((cur) => (cur < observedMax ? observedMax : cur));
  }, [chartMaxValue]);

  const fetchMainTankValues = async () => {
    setMainLoading(true);
    setMainError(null);
    try {
      const response = await fetch(MAIN_TANK_API_URL);
      if (!response.ok) throw new Error(`Failed to load Main Tank values: ${response.status} ${response.statusText}`);
      const text = await response.text();
      const map = parseBlynkResponse(text);
      if (Object.keys(map).length > 0) {
        const reading = {
          timestamp: new Date().toLocaleString(),
          v10: map['V10'] ?? map['10'] ?? undefined,
          v14: map['V14'] ?? map['14'] ?? undefined,
        };
        setMainTank(reading);
      setMainHistory((prev) => [reading, ...prev].slice(0, 12));
      } else {
        throw new Error('Unexpected Main Tank response format');
      }
    } catch (err) {
      setMainError(err instanceof Error ? err.message : 'Failed to load main tank values');
      console.error('Main tank fetch error:', err);
    } finally {
      setMainLoading(false);
    }
  };

  useEffect(() => {
    fetchMainTankValues();
  }, []);

  return (
    <div className="water-tank-monitor-container">
      <div className="water-tank-monitor-panel">
        <div className="water-tank-monitor-header">
          <div>
            <h2>Sintex Tank Monitor</h2>
            <p>Live tank reading values from Blynk pins V1, V2, V3, V4 and V6.</p>
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <label style={{fontSize:12,color:'#475569'}}>Gauge max</label>
            <input
              type="number"
              min={1}
              value={speedometerMax}
              onChange={(e) => setSpeedometerMax(Math.max(1, Number(e.target.value) || 1))}
              style={{width:100,padding:6,borderRadius:8,border:'1px solid #d1e3ff'}}
            />
            <button className="graph-refresh-btn" onClick={fetchMeterValues}>{loading ? 'Refreshing…' : 'Refresh Data'}</button>
          </div>
        </div>

        {error && <div className="message error">{error}</div>}

        {loading && !latestReading ? (
          <div className="meter-graph-loading">
            <div className="loading-spinner"></div>
            <span>Loading water tank values...</span>
          </div>
        ) : (
          <>
            <div className="meter-graph-summary">
              <div className="meter-graph-summary-card"><div className="summary-title">V1 (cm)</div><div className="summary-value">{formatPinValue('V1', latestReading?.v1 ?? null)}</div><div className="summary-meta">{latestReading?.timestamp ?? 'N/A'}</div></div>
              <div className="meter-graph-summary-card"><div className="summary-title">V2 (L)</div><div className="summary-value">{formatPinValue('V2', latestReading?.v2 ?? null)}</div><div className="summary-meta">{latestReading?.timestamp ?? 'N/A'}</div></div>
              <div className="meter-graph-summary-card"><div className="summary-title">V3 (L)</div><div className="summary-value">{formatPinValue('V3', latestReading?.v3 ?? null)}</div><div className="summary-meta">{latestReading?.timestamp ?? 'N/A'}</div></div>
              <div className="meter-graph-summary-card"><div className="summary-title">V4 (%)</div><div className="summary-value">{formatPinValue('V4', latestReading?.v4 ?? null)}</div><div className="summary-meta">{latestReading?.timestamp ?? 'N/A'}</div></div>
              <div className="meter-graph-summary-card"><div className="summary-title">V6 (uptime)</div><div className="summary-value">{formatPinValue('V6', latestReading?.v6 ?? null)}</div><div className="summary-meta">{latestReading?.timestamp ?? 'N/A'}</div></div>
              <div className="meter-graph-summary-card"><div className="summary-title">V9 (ft)</div><div className="summary-value">{formatPinValue('V9', latestReading?.v9 ?? null)}</div><div className="summary-meta">{latestReading?.timestamp ?? 'N/A'}</div></div>
            </div>

            <div className="v4-gauge-panel">
              <div className="v4-gauge-card">
                <Speedometer
                  value={latestReading?.v4 ?? 0}
                  max={100}
                  size={240}
                  label="V4 (%)"
                />
              </div>
            </div>

            <div className="speedometer-grid">
              {[
                {k: 'V1', v: latestReading?.v1, max: 100, label: 'V1 (cm)', size: 160},
                {k: 'V2', v: latestReading?.v2, max: 1000, label: 'Consumed Ltrs', size: 160},
                {k: 'V3', v: latestReading?.v3, max: 1000, label: 'V3 (L)', size: 160},
                {k: 'V6', v: latestReading?.v6, max: speedometerMax || chartMaxValue || 100, label: 'V6 (ms)', size: 160},
                {k: 'V9', v: latestReading?.v9, max: 3.5, label: 'V9 (ft)', size: 160}
              ].map((it) => (
                <div key={it.k} className="speedometer-card">
                  <Speedometer
                    value={it.v ?? 0}
                    max={it.max}
                    size={it.size}
                    label={it.label}
                  />
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div className="meter-graph-history">
                <div className="history-header">Recent History</div>
                <div className="meter-graph-history-list">
                  {history.map((point) => (
                    <div key={point.timestamp} className="meter-graph-history-item">
                      <div className="history-label">{point.timestamp}</div>
                      <div className="history-values">
                        <span>V1: {formatPinValue('V1', point.v1)}</span>
                        <span>V2: {formatPinValue('V2', point.v2)}</span>
                        <span>V3: {formatPinValue('V3', point.v3)}</span>
                        <span>V4: {formatPinValue('V4', point.v4)}</span>
                        <span>V6: {formatPinValue('V6', point.v6)}</span>
                        <span>V9: {formatPinValue('V9', point.v9)}</span>
                      </div>
                      <div className="history-ratio">Max {Math.max(point.v1||0, point.v2||0, point.v3||0, point.v4||0, point.v6||0, point.v9||0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="main-tank-panel">
        <div className="main-tank-header">
          <div className="main-tank-title">Main Tank</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="graph-refresh-btn" onClick={fetchMainTankValues}>{mainLoading ? 'Refreshing…' : 'Refresh Main Tank'}</button>
          </div>
        </div>

        {mainError && <div className="message error">{mainError}</div>}

        <div className="main-tank-speedometer">
          <div>
            {mainTank ? Speedometer({ value: mainTank.v10 ?? 0, max: 100, size: 260, label: 'Main Tank %' }) : <div className="meter-graph-loading">{mainLoading ? 'Loading…' : 'No data'}</div>}
          </div>
          <div className="main-tank-meta">
            <div style={{fontWeight:700,fontSize:16}}>{mainTank ? formatPinValue('V10', mainTank.v10 ?? null) : '--'}</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:6}}>V10</div>
            <div style={{height:12}} />
            <div style={{fontWeight:600}}>{mainTank ? formatPinValue('V14', mainTank.v14 ?? null) : '--'}</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:6}}>V14</div>
          </div>
        </div>

        {mainHistory.length > 0 && (
          <div className="main-tank-history">
            <div className="history-header">Main Tank History</div>
            <div className="meter-graph-history-list">
              {mainHistory.map((point) => (
                <div key={point.timestamp} className="meter-graph-history-item">
                  <div className="history-label">{point.timestamp}</div>
                  <div className="history-values">
                    <span>V10: {formatPinValue('V10', point.v10 ?? null)}</span>
                    <span>V14: {formatPinValue('V14', point.v14 ?? null)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
