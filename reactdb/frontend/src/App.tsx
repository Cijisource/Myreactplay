import { useState, useEffect, useRef } from 'react';
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
import ServiceConsumptionDetails from './components/ServiceConsumptionDetails';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

type Page = 'home' | 'diagnostic' | 'payment' | 'tenants' | 'occupancy' | 'occupancy-links' | 'complaints' | 'services' | 'eb-payments' | 'users' | 'roles' | 'transactions' | 'stock' | 'daily-status' | 'service-allocation' | 'consumption';

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
  'service-allocation': ['admin', 'manager', 'utilities_manager'],
  consumption: ['admin', 'manager', 'utilities_manager']
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
  { page: 'consumption', label: 'Service Consumption', roles: SCREEN_ROLES.consumption },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>('loading');
  const [dbStatus, setDbStatus] = useState<string>('loading');
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollPosRef = useRef(0);
  const { isAuthenticated, user, logout } = useAuth();

  // Debug logging for authentication state
  useEffect(() => {
    console.log('[AppContent] Auth state changed:', {
      isAuthenticated,
      user: user ? { id: user.id, username: user.username, roles: user.roles } : null,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, user]);

  // Close mobile menu when page changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [currentPage]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const userMenuEl = document.querySelector('.user-profile-dropdown');
      const navSidebarEl = document.querySelector('.nav-sidebar');
      
      if (userMenuEl && !userMenuEl.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (navSidebarEl && !navSidebarEl.contains(e.target as Node) && 
          !(e.target as Element).classList?.contains('hamburger-btn')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-hide header on scroll
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isScrollingDown = currentScrollPos > lastScrollPosRef.current;
      
      // Adaptive threshold based on screen size
      let scrollThreshold = 50; // Default for mobile
      
      if (window.innerWidth > 1024) {
        scrollThreshold = 100; // Desktop
      } else if (window.innerWidth > 768) {
        scrollThreshold = 75; // Tablet landscape
      } else {
        scrollThreshold = 50; // Tablet portrait and mobile
      }
      
      if (isScrollingDown && currentScrollPos > scrollThreshold) {
        if (!headerHidden) {
          setHeaderHidden(true);
        }
      } else {
        if (headerHidden) {
          setHeaderHidden(false);
        }
      }
      
      lastScrollPosRef.current = currentScrollPos;
    };
    
    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [headerHidden]);

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
    console.log('[AppContent] Not authenticated, showing login screen');
    return <LoginScreen />;
  }

  console.log('[AppContent] Authenticated, rendering app with currentPage:', currentPage);

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

    if (currentPage === 'consumption') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.consumption}>
          <ServiceConsumptionDetails />
        </ProtectedRoute>
      );
    }

    console.log('[AppContent] Rendering home page for user:', user?.username);
    return (
      <div className="container">
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
      <div className={`top-header-bar ${headerHidden ? 'hidden' : ''}`}>
        <div className="header-left">
          <button 
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Menu"
          >
            ☰
          </button>
          <div className="app-branding">
            <span className="app-logo">🏢</span>
            <span className="app-name">Mansion</span>
          </div>
        </div>
        
        <div className="header-center">
          <h1 className="page-title">
            {(() => {
              if (currentPage === 'home') return 'Dashboard';
              const pageNames: { [key in Page]?: string } = {
                'occupancy': 'Room Occupancy',
                'occupancy-links': 'Occupancy Links',
                'tenants': 'Tenants',
                'payment': 'Payments',
                'complaints': 'Complaints',
                'services': 'Services',
                'consumption': 'Consumption',
                'eb-payments': 'EB Payments',
                'users': 'Users',
                'roles': 'Roles',
                'transactions': 'Transactions',
                'stock': 'Stock',
                'daily-status': 'Daily Status',
                'service-allocation': 'Allocations',
                'diagnostic': 'Diagnostic'
              };
              return pageNames[currentPage] || (currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace('-', ' '));
            })()}
          </h1>
        </div>
        
        <div className="header-right">
          <div className="user-profile-dropdown">
            <button 
              className="user-profile-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title={user?.name || user?.username}
            >
              <span className="user-avatar">{(user?.name || user?.username || 'U')[0].toUpperCase()}</span>
              <span className="user-name-short">{user?.name || user?.username}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {userMenuOpen && (
              <div className="user-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-user-name">{user?.name || user?.username}</div>
                  <div className="dropdown-user-roles">{user?.roles || 'Guest'}</div>
                  {user?.lastLogin && (
                    <div className="dropdown-last-login">
                      Last Login: {new Date(user.lastLogin).toLocaleDateString()} {new Date(user.lastLogin).toLocaleTimeString()}
                    </div>
                  )}
                  {user?.nextLoginDuration && (
                    <div className="dropdown-next-login">
                      Valid for: {user.nextLoginDuration} day{user.nextLoginDuration !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <hr className="dropdown-divider" />
                <button 
                  className="dropdown-logout-btn"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={`nav-sidebar ${mobileMenuOpen ? 'open' : ''} ${headerHidden ? 'header-hidden' : ''}`}>
        <div className="nav-items-container">
          {NAV_ITEMS.map(item => {
            const userRoles = user?.roles?.split(',').map(r => r.trim()).filter(r => r) || [];
            const hasAccess = item.roles.length === 0 || userRoles.some(r => item.roles.includes(r));
            
            if (item.label === 'Tenant Management') {
              console.log('[Nav Debug] Tenant Management visibility:', {
                userRoles,
                requiredRoles: item.roles,
                hasAccess,
                userRolesString: user?.roles
              });
            }
            
            if (!hasAccess) return null;
            
            return (
              <button 
                key={item.page}
                className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(item.page);
                  setMobileMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className={currentPage === 'home' ? 'main-content' : 'main-content with-top-space'}>
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
