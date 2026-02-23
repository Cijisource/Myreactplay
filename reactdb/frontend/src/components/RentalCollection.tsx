import { useState, useEffect } from 'react';
import { apiService } from '../api';
import './RentalCollection.css';

interface SummaryData {
  month: string;
  total_occupancies: number;
  total_records: number;
  total_collected: number;
  total_outstanding: number;
}

interface UnpaidTenant {
  month: string;
  outstanding_count: number;
  total_outstanding: number;
}

interface UnpaidDetail {
  OccupancyId: number;
  pending_amount: number;
  collected_amount: number;
  records_count: number;
  latest_date: string;
}

export default function RentalCollection() {
  const [summary, setSummary] = useState<SummaryData[]>([]);
  const [unpaidTenants, setUnpaidTenants] = useState<UnpaidTenant[]>([]);
  const [unpaidDetails, setUnpaidDetails] = useState<UnpaidDetail[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, unpaidRes] = await Promise.all([
        apiService.getRentalSummary(),
        apiService.getUnpaidTenants(),
      ]);
      
      console.log('Summary response:', summaryRes.data);
      console.log('Unpaid response:', unpaidRes.data);
      
      setSummary(summaryRes.data);
      setUnpaidTenants(unpaidRes.data);
      
      if (unpaidRes.data.length > 0) {
        setSelectedMonth(unpaidRes.data[0].month);
        const detailsRes = await apiService.getUnpaidDetails(unpaidRes.data[0].month);
        setUnpaidDetails(detailsRes.data);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch rental data';
      setError(errorMsg);
      console.error('Error fetching rental data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    try {
      const res = await apiService.getUnpaidDetails(month);
      console.log('Details response:', res.data);
      setUnpaidDetails(res.data);
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  if (loading) {
    return (
      <div className="rental-container">
        <div className="loading">Loading rental data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rental-container">
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  const totalCollected = summary.reduce((sum, s) => sum + (s.total_collected || 0), 0);
  const totalOutstanding = summary.reduce((sum, s) => sum + (s.total_outstanding || 0), 0);
  const totalOccupancies = new Set(summary.map(s => s.total_occupancies)).size;

  return (
    <div className="rental-container">
      <div className="rental-header">
        <h1>Rental Collection Dashboard</h1>
        <p>Monitor rental payments and identify outstanding dues</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <div className="card-content">
            <h3>Total Collected</h3>
            <p className="amount">₹ {totalCollected.toLocaleString()}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-content">
            <h3>Outstanding Due</h3>
            <p className="amount unpaid">₹ {totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-content">
            <h3>Active Properties</h3>
            <p className="amount">{totalOccupancies}</p>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="section">
        <h2>Monthly Summary</h2>
        {summary.length > 0 ? (
          <div className="table-wrapper">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Properties</th>
                  <th>Total Records</th>
                  <th>Total Collected</th>
                  <th>Outstanding Due</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.month}</strong></td>
                    <td>{row.total_occupancies}</td>
                    <td>{row.total_records}</td>
                    <td className="paid">₹ {parseFloat(row.total_collected.toString()).toLocaleString()}</td>
                    <td className="unpaid">₹ {parseFloat(row.total_outstanding.toString()).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="info-box">No rental data available</div>
        )}
      </div>

      {/* Unpaid Tenants by Month */}
      <div className="section">
        <h2>Unpaid Tenants by Month</h2>
        {unpaidTenants.length > 0 ? (
          <>
            <div className="month-selector">
              <label>Select Month:</label>
              <select value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)}>
                {unpaidTenants.map((tenant) => (
                  <option key={tenant.month} value={tenant.month}>
                    {tenant.month} ({tenant.outstanding_count} unpaid)
                  </option>
                ))}
              </select>
            </div>

            {unpaidDetails.length > 0 ? (
              <div className="table-wrapper">
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Occupancy ID</th>
                      <th>Pending Amount</th>
                      <th>Collected Amount</th>
                      <th>Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidDetails.map((detail, idx) => (
                      <tr key={idx}>
                        <td className="tenant-id">Occupancy #{detail.OccupancyId}</td>
                        <td className="amount">₹ {parseFloat(detail.pending_amount.toString()).toLocaleString()}</td>
                        <td className="paid">₹ {parseFloat(detail.collected_amount.toString()).toLocaleString()}</td>
                        <td>{detail.records_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="info-box">
                No unpaid records for {selectedMonth}
              </div>
            )}
          </>
        ) : (
          <div className="info-box">
            No unpaid rental records found
          </div>
        )}
      </div>
    </div>
  );
}
