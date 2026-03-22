import { useState, useEffect } from 'react';
import { apiService } from '../api';
import './ManagementStyles.css';
import './MonthlyMeterReading.css';

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

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        setLoading(true);
        const response = await apiService.getServiceAllocationsForReading();
        setAllocations(response.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service allocations');
        console.error('Error fetching allocations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocations();
  }, []);

  const filteredAllocations = allocations.filter(alloc =>
    searchTerm === '' ||
    alloc.room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alloc.service.consumerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(alloc.service.meterNo).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectAllocation = async (alloc: ServiceAllocation) => {
    setSelectedAllocationId(alloc.id);
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

      const consumptionRes = await apiService.createServiceConsumption(consumptionData);
      const serviceConsumptionId = consumptionRes.data.id;

      // Calculate pro-rata charges
      await apiService.calculateProRataCharges(serviceConsumptionId, formData.unitRate || chargePerUnit);

      setSuccessMessage(`✓ Meter reading recorded and charges calculated successfully!`);
      setFormData({
        serviceAllocId: 0,
        readingTakenDate: new Date().toISOString().split('T')[0],
        startingMeterReading: '',
        endingMeterReading: '',
        unitRate: chargePerUnit
      });
      setSelectedAllocationId(null);
      setShowForm(false);
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record meter reading';
      setError(errorMsg);
      console.error('Error recording meter reading:', err);
    }
  };

  return (
    <div className="meter-reading-container">
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
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Close Form' : '+ Add Reading'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="meter-reading-form">
          <h2 className="form-section-title">Record Meter Reading</h2>
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
                      type="number"
                      name="endingMeterReading"
                      value={formData.endingMeterReading}
                      onChange={handleInputChange}
                      placeholder="This month's reading"
                      required
                    />
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

                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    💾 Save & Calculate Charges
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAllocationId(null);
                      setFormData({
                        serviceAllocId: 0,
                        readingTakenDate: new Date().toISOString().split('T')[0],
                        startingMeterReading: '',
                        endingMeterReading: '',
                        unitRate: chargePerUnit
                      });
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
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading service allocations...</p>
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="empty-state">No service allocations found</p>
        </div>
      ) : (
        <div className="allocations-grid">
          {filteredAllocations.map(alloc => (
            <div
              key={alloc.id}
              className={`allocation-card ${selectedAllocationId === alloc.id ? 'selected' : ''}`}
              onClick={() => handleSelectAllocation(alloc)}
            >
              <div className="card-header">
                <h3>Room {alloc.room.number}</h3>
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
  );
}
