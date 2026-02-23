import { useState, useEffect } from 'react';
import { apiService } from './api';
import './App.css';
import RentalCollection from './components/RentalCollection';
import Diagnostic from './components/Diagnostic';

type Page = 'home' | 'rental' | 'diagnostic';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [backendStatus, setBackendStatus] = useState<string>('loading');
  const [dbStatus, setDbStatus] = useState<string>('loading');
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
        console.log('API Base URL:', apiBaseUrl);
        console.log('Fetching backend health...');
        // Check backend health
        const healthRes = await apiService.getHealth();
        console.log('Backend health:', healthRes.data);
        setBackendStatus('connected');

        // Check database connection
        const dbRes = await apiService.getDatabaseStatus();
        console.log('Database status:', dbRes.data);
        setDbStatus('connected');

        // Fetch tables
        const tablesRes = await apiService.getTables();
        console.log('Tables:', tablesRes.data);
        setTables(tablesRes.data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error fetching data:', errorMsg);
        setError(errorMsg);
        setBackendStatus('error');
        setDbStatus('error');
      }
    };

    if (currentPage === 'home') {
      fetchStatus();
    }
  }, [currentPage]);

  const renderPage = () => {
    if (currentPage === 'rental') {
      return <RentalCollection />;
    }
    
    if (currentPage === 'diagnostic') {
      return <Diagnostic />;
    }

    return (
      <div className="container">
        <h1>Mansion App</h1>
        
        <div className="nav-buttons">
          <button 
            className="nav-btn active"
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('rental')}
          >
            Rental Collection
          </button>
          <button 
            className="nav-btn diagnostic"
            onClick={() => setCurrentPage('diagnostic')}
          >
            Diagnostic
          </button>
        </div>
        
        <div className="status-section">
          <h2>System Status</h2>
          <div className={`status-item ${backendStatus}`}>
            <span>Backend:</span>
            <span className="badge">{backendStatus.toUpperCase()}</span>
          </div>
          <div className={`status-item ${dbStatus}`}>
            <span>Database:</span>
            <span className="badge">{dbStatus.toUpperCase()}</span>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}

        {tables.length > 0 && (
          <div className="tables-section">
            <h2>Database Tables</h2>
            <ul className="table-list">
              {tables.map((table: any, idx: number) => (
                <li key={idx}>{table.TABLE_NAME}</li>
              ))}
            </ul>
          </div>
        )}

        {!error && tables.length === 0 && backendStatus !== 'loading' && (
          <div className="info-box">
            No tables found in database or still loading...
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {currentPage !== 'home' && (
        <div className="header-nav">
          <button 
            className="back-btn"
            onClick={() => setCurrentPage('home')}
          >
            ← Back to Home
          </button>
        </div>
      )}
      {renderPage()}
    </>
  );
}

export default App;
