import { useState, useEffect } from 'react';
import { apiService } from './api';
import './App.css';
//import RentalCollection from './components/RentalCollection';
import Diagnostic from './components/Diagnostic';
import PaymentTracking from './components/PaymentTracking';
import TenantManagement from './components/TenantManagement';
import RoomOccupancy from './components/RoomOccupancy';
import OccupancyLinks from './components/OccupancyLinks';
import ComplaintsManagement from './components/ComplaintsManagement';
import ServiceDetailsManagement from './components/ServiceDetailsManagement';
import EBServicePaymentsManagement from './components/EBServicePaymentsManagement';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './components/AuthContext';

type Page = 'home' | 'rental' | 'diagnostic' | 'payment' | 'tenants' | 'occupancy' | 'occupancy-links' | 'complaints' | 'services' | 'eb-payments';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [backendStatus, setBackendStatus] = useState<string>('loading');
  const [dbStatus, setDbStatus] = useState<string>('loading');
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user, logout } = useAuth();

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

    if (currentPage === 'home' && isAuthenticated) {
      fetchStatus();
    }
  }, [currentPage, isAuthenticated]);

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    //if (currentPage === 'rental') {
      //return <RentalCollection />;
    //}
    
    if (currentPage === 'diagnostic') {
      return <Diagnostic />;
    }

    if (currentPage === 'payment') {
      return <PaymentTracking />;
    }

    if (currentPage === 'tenants') {
      return <TenantManagement />;
    }

    if (currentPage === 'occupancy') {
      return <RoomOccupancy />;
    }

    if (currentPage === 'occupancy-links') {
      return <OccupancyLinks />;
    }

    if (currentPage === 'complaints') {
      return <ComplaintsManagement />;
    }

    if (currentPage === 'services') {
      return <ServiceDetailsManagement />;
    }

    if (currentPage === 'eb-payments') {
      return <EBServicePaymentsManagement />;
    }

    return (
      <div className="container">
        <div className="home-header">
          <div>
            <h1>🏰 Mansion Management System</h1>
            <p>Welcome back, {user?.username}!</p>
          </div>
          <button 
            className="logout-btn"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
        
        <div className="nav-buttons">
          <button 
            className="nav-btn active"
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('occupancy-links')}
          >
            Occupancy Links
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('occupancy')}
          >
            Room Occupancy
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('tenants')}
          >
            Tenant Management
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('rental')}
          >
            Rental Collection
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('payment')}
          >
            Payment Tracking
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('complaints')}
          >
            Complaints Management
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('services')}
          >
            Service Details
          </button>
          <button 
            className="nav-btn"
            onClick={() => setCurrentPage('eb-payments')}
          >
            EB Payments
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
      <div className="top-header-bar">
        <button
          className="back-home-btn"
          onClick={() => setCurrentPage('home')}
          disabled={currentPage === 'home'}
        >
          {currentPage === 'home' ? '🏠 Home' : '← Back to Home'}
        </button>
        <div className="page-title">
          {(() => {
            if (currentPage === 'home') return 'Mansion Management';
            const pageNames: { [key in Page]?: string } = {
              'eb-payments': 'EB Payments',
              'services': 'Service Details',
              'occupancy-links': 'Occupancy Links'
            };
            return pageNames[currentPage] || (currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace('-', ' '));
          })()}
        </div>
      </div>
      <div className={currentPage === 'home' ? '' : 'page-with-header'}>
        {renderPage()}
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
