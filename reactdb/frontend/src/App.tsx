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
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';
import TransactionManagement from './components/TransactionManagement';
import StockManagement from './components/StockManagement';
import DailyStatusManagement from './components/DailyStatusManagement';
import ServiceAllocationManagement from './components/ServiceAllocationManagement';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

type Page = 'home' | 'diagnostic' | 'payment' | 'tenants' | 'occupancy' | 'occupancy-links' | 'complaints' | 'services' | 'eb-payments' | 'users' | 'roles' | 'transactions' | 'stock' | 'daily-status' | 'service-allocation';

// Role requirements for each screen
const SCREEN_ROLES: Record<Page, string[]> = {
  home: [],
  diagnostic: ['admin'],
  payment: ['admin', 'manager', 'accountant'],
  tenants: ['admin', 'manager', 'property_manager'],
  occupancy: ['admin', 'manager', 'property_manager'],
  'occupancy-links': ['admin', 'manager', 'property_manager'],
  complaints: ['admin', 'manager', 'maintenance'],
  services: ['admin', 'manager', 'utilities_manager'],
  'eb-payments': ['admin', 'manager', 'accountant'],
  users: ['admin'],
  roles: ['admin'],
  transactions: ['admin', 'manager', 'accountant'],
  stock: ['admin', 'manager', 'inventory_manager'],
  'daily-status': ['admin', 'manager', 'maintenance'],
  'service-allocation': ['admin', 'manager', 'utilities_manager']
};

// Navigation menu items with labels and required roles
const NAV_ITEMS: Array<{ page: Page; label: string; roles: string[] }> = [
  { page: 'home', label: 'Home', roles: [] },
  { page: 'occupancy-links', label: 'Occupancy Links', roles: SCREEN_ROLES['occupancy-links'] },
  { page: 'occupancy', label: 'Room Occupancy', roles: SCREEN_ROLES.occupancy },
  { page: 'tenants', label: 'Tenant Management', roles: SCREEN_ROLES.tenants },
  { page: 'payment', label: 'Payment Tracking', roles: SCREEN_ROLES.payment },
  { page: 'complaints', label: 'Complaints', roles: SCREEN_ROLES.complaints },
  { page: 'services', label: 'Service Details', roles: SCREEN_ROLES.services },
  { page: 'eb-payments', label: 'EB Payments', roles: SCREEN_ROLES['eb-payments'] },
  { page: 'users', label: 'Users', roles: SCREEN_ROLES.users },
  { page: 'roles', label: 'Roles & Access', roles: SCREEN_ROLES.roles },
  { page: 'transactions', label: 'Transactions', roles: SCREEN_ROLES.transactions },
  { page: 'stock', label: 'Stock', roles: SCREEN_ROLES.stock },
  { page: 'daily-status', label: 'Daily Status', roles: SCREEN_ROLES['daily-status'] },
  { page: 'service-allocation', label: 'Service Allocation', roles: SCREEN_ROLES['service-allocation'] },
  { page: 'diagnostic', label: 'Diagnostic', roles: SCREEN_ROLES.diagnostic }
];

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>('loading');
  const [dbStatus, setDbStatus] = useState<string>('loading');
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user, logout } = useAuth();

  // Close mobile menu when page changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPage]);

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
    if (currentPage === 'diagnostic') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.diagnostic}>
          <Diagnostic />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'payment') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.payment}>
          <PaymentTracking />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'tenants') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.tenants}>
          <TenantManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'occupancy') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.occupancy}>
          <RoomOccupancy />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'occupancy-links') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['occupancy-links']}>
          <OccupancyLinks />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'complaints') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.complaints}>
          <ComplaintsManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'services') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.services}>
          <ServiceDetailsManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'eb-payments') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['eb-payments']}>
          <EBServicePaymentsManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'users') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.users}>
          <UserManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'roles') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.roles}>
          <RoleManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'transactions') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.transactions}>
          <TransactionManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'stock') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.stock}>
          <StockManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'daily-status') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['daily-status']}>
          <DailyStatusManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'service-allocation') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['service-allocation']}>
          <ServiceAllocationManagement />
        </ProtectedRoute>
      );
    }

    return (
      <div className="container">
        <div className="home-header">
          <div>
            <h1>🏰 Mansion Management System</h1>
            <p>Welcome back, {user?.name || user?.username}!</p>
            <p className="user-roles">Roles: {user?.roles || 'None'}</p>
          </div>
          <button 
            className="logout-btn"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
        
        <div className="nav-wrapper">
          <button 
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
          
          <div className={`nav-buttons ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            {NAV_ITEMS.map(item => {
              // Check if user has access to this page
              const hasAccess = item.roles.length === 0 || user?.roles.split(',').some(r => item.roles.includes(r.trim()));
              
              if (!hasAccess) return null;
              
              return (
                <button 
                  key={item.page}
                  className={`nav-btn ${currentPage === item.page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(item.page)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
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
              'users': 'User & Role Management',
              'transactions': 'Transaction Management',
              'stock': 'Stock Management',
              'daily-status': 'Daily Room Status Management',
              'service-allocation': 'Service Room Allocation Management',
              'tenants': 'Tenant Management',
              'occupancy': '🏠 Room Occupancy Dashboard',
              'occupancy-links': '🔗 Room-Tenant Occupancy Links',
              'payment': 'Rental Payment Tracking',
              'complaints': 'Complaints Management',
              'services': '⚡ Service Details Management',
              'eb-payments': '💡 EB Service Payments Management',
              'diagnostic': 'RentalCollection Table Diagnostic'
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
