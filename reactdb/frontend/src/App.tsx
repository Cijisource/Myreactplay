import { useState, useEffect, useRef } from 'react';
import './App.css';
import './styles/mobile.css';
//import RentalCollection from './components/RentalCollection';
import RentalCollectionDetails from './components/RentalCollectionDetails';
import Diagnostic from './components/Diagnostic';
import TenantManagement from './components/TenantManagement';
import RoomOccupancy from './components/RoomOccupancy';
import RoomManagement from './components/RoomManagement';
import ComplaintsManagement from './components/ComplaintsManagement';
import LoginScreen from './components/LoginScreen';
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';
import TransactionManagement from './components/TransactionManagement';
import StockManagement from './components/StockManagement';
import GuestCheckinManagement from './components/GuestCheckinManagement';
import RollingBanner from './components/RollingBanner';
import ServiceConsumptionDetails from './components/ServiceConsumptionDetails';
import WaterTankLevelMonitor from './components/WaterTankLevelMonitor';
import TenantElectricityCharges from './components/TenantElectricityCharges';
import MiscUploads from './components/MiscUploads';
import DailyStatusManagement from './components/DailyStatusManagement';
import ActiveSessionsManagement from './components/ActiveSessionsManagement';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

type Page = 'home' | 'diagnostic' | 'rental-collection' | 'tenants' | 'occupancy' | 'daily-status' | 'room-management' | 'complaints' | 'active-sessions' | 'users' | 'roles' | 'transactions' | 'stock' | 'guest-checkin' | 'misc-uploads' | 'consumption' | 'water-tank-monitor' | 'electricity-charges';

type NavItem = {
  page: Page;
  label: string;
  roles: string[];
};

type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

// Role requirements for each screen
const SCREEN_ROLES: Record<Page, string[]> = {
  home: [],
  diagnostic: ['admin'],
  'rental-collection': ['admin', 'manager', 'accountant', 'property_manager'],
  tenants: ['admin', 'manager', 'property_manager', 'accountant'],
  occupancy: ['admin', 'manager', 'property_manager', 'utilities_manager'],
  'daily-status': ['admin', 'manager', 'maintenance', 'property_manager', 'utilities_manager'],
  'room-management': ['admin', 'manager', 'property_manager', 'accountant'],
  complaints: ['admin', 'manager', 'maintenance', 'utilities_manager'],
  'active-sessions': ['admin'],
  users: ['admin'],
  roles: ['admin'],
  transactions: ['admin', 'manager', 'accountant'],
  stock: ['admin', 'manager', 'inventory_manager'],
  'guest-checkin': ['admin', 'manager', 'maintenance', 'property_manager'],
  'misc-uploads': ['admin', 'manager', 'maintenance', 'property_manager'],
  consumption: ['admin', 'manager', 'utilities_manager'],
  'water-tank-monitor': ['admin', 'manager', 'utilities_manager'],
  'electricity-charges': ['admin', 'manager']
};

// Navigation grouped into logical sections with role-aware submenu items.
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { page: 'home', label: 'Home', roles: SCREEN_ROLES.home },
      { page: 'daily-status', label: 'Daily Status', roles: SCREEN_ROLES['daily-status'] },
      { page: 'water-tank-monitor', label: 'Sintex Tank Monitor', roles: SCREEN_ROLES['water-tank-monitor'] }
    ]
  },
  {
    key: 'occupancy',
    label: 'Occupancy & Tenants',
    items: [
      { page: 'guest-checkin', label: 'Guest Check-In', roles: SCREEN_ROLES['guest-checkin'] },
      { page: 'room-management', label: 'Room Management', roles: SCREEN_ROLES['room-management'] },
      { page: 'tenants', label: 'Tenant Management', roles: SCREEN_ROLES.tenants }
    ]
  },
  {
    key: 'billing',
    label: 'Payments & Billing',
    items: [
      { page: 'rental-collection', label: 'Rental Collection', roles: SCREEN_ROLES['rental-collection'] },
      { page: 'transactions', label: 'Transactions', roles: SCREEN_ROLES.transactions }
    ]
  },
  {
    key: 'utilities',
    label: 'Utilities & Services',
    items: [
      { page: 'consumption', label: 'Service Consumption', roles: SCREEN_ROLES.consumption },
      { page: 'misc-uploads', label: 'Misc Uploads', roles: SCREEN_ROLES['misc-uploads'] },
      { page: 'complaints', label: 'Complaints', roles: SCREEN_ROLES.complaints }
    ]
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      { page: 'active-sessions', label: 'Active Sessions', roles: SCREEN_ROLES['active-sessions'] },
      { page: 'users', label: 'Users', roles: SCREEN_ROLES.users },
      { page: 'roles', label: 'Roles & Access', roles: SCREEN_ROLES.roles },
      { page: 'stock', label: 'Stock', roles: SCREEN_ROLES.stock },
      { page: 'diagnostic', label: 'Diagnostic', roles: SCREEN_ROLES.diagnostic }
    ]
  }
];

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(group => group.items);

const getGroupKeyForPage = (page: Page): string | null => {
  const group = NAV_GROUPS.find(navGroup => navGroup.items.some(item => item.page === page));
  return group?.key ?? null;
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(() => getGroupKeyForPage('home'));
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [timeForNextLogin, setTimeForNextLogin] = useState<string | null>(null);
  const lastScrollPosRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const getValidityEndTime = (lastLogin?: string | null, nextLoginDuration?: number | null) => {
      if (!lastLogin || !Number.isFinite(Number(nextLoginDuration)) || Number(nextLoginDuration) <= 0) {
        return null;
      }

      const lastLoginTime = new Date(lastLogin).getTime();
      if (Number.isNaN(lastLoginTime)) {
        return null;
      }

      return lastLoginTime + (Number(nextLoginDuration) * 24 * 60 * 60 * 1000);
    };

    const formatRemainingTime = (remainingMs: number) => {
      const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    };

    const updateCountdown = () => {
      const validityEndTime = getValidityEndTime(user?.lastLogin, user?.nextLoginDuration);
      if (!validityEndTime) {
        setTimeForNextLogin(null);
        return;
      }

      const remainingMs = validityEndTime - Date.now();
      if (remainingMs <= 0) {
        setTimeForNextLogin('Expired');
        return;
      }

      setTimeForNextLogin(`Time for next login: ${formatRemainingTime(remainingMs)}`);
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [user?.lastLogin, user?.nextLoginDuration]);

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

  useEffect(() => {
    const pageGroupKey = getGroupKeyForPage(currentPage);
    if (!pageGroupKey) {
      return;
    }

    setActiveGroupKey(pageGroupKey);
  }, [currentPage]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const userMenuEl = document.querySelector('.user-profile-dropdown');
      const navEl = document.querySelector('.header-nav');
      const clickedHamburger = Boolean(target?.closest('.hamburger-btn'));
      
      if (userMenuEl && !userMenuEl.contains(target as Node)) {
        setUserMenuOpen(false);
      }

      if (navEl && !navEl.contains(target as Node) && !clickedHamburger) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-hide header on scroll
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      // Get scroll position from multiple sources for compatibility
      const scrollPos = window.scrollY || 
                       document.documentElement.scrollTop || 
                       document.body.scrollTop || 
                       0;
      
      const isScrollingDown = scrollPos > lastScrollPosRef.current;
      
      // Adaptive threshold based on screen size
      let scrollThreshold = 50; // Default for mobile
      
      if (window.innerWidth > 1024) {
        scrollThreshold = 100; // Desktop
      } else if (window.innerWidth > 768) {
        scrollThreshold = 75; // Tablet landscape
      } else {
        scrollThreshold = 50; // Tablet portrait and mobile
      }
      
      // Debug: log scroll events
      console.log('Scroll detected:', { scrollPos, isScrollingDown, scrollThreshold, headerHidden });
      
      if (isScrollingDown && scrollPos > scrollThreshold) {
        if (!headerHiddenRef.current) {
          headerHiddenRef.current = true;
          setHeaderHidden(true);
          console.log('Header hidden at scroll pos:', scrollPos);
        }
      } else if (scrollPos <= scrollThreshold || !isScrollingDown) {
        if (headerHiddenRef.current) {
          headerHiddenRef.current = false;
          setHeaderHidden(false);
          console.log('Header shown at scroll pos:', scrollPos);
        }
      }
      
      lastScrollPosRef.current = scrollPos;
      ticking = false;
    };
    
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };
    
    // Listen on multiple elements for compatibility
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
    };
  }, []);

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    console.log('[AppContent] Not authenticated, showing login screen');
    return <LoginScreen />;
  }

  console.log('[AppContent] Authenticated, rendering app with currentPage:', currentPage);

  const userRoles = user?.roles
    ?.split(',')
    .map(r => r.trim().toLowerCase())
    .filter(r => r) || [];
  const hasAccessToItem = (item: NavItem) => item.roles.length === 0 || userRoles.some(r => item.roles.includes(r));
  const visibleNavGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(hasAccessToItem)
    }))
    .filter(group => group.items.length > 0);

  const toggleGroup = (groupKey: string) => {
    setActiveGroupKey(prev => (prev === groupKey ? prev : groupKey));
  };

  const renderPage = () => {
    if (currentPage === 'diagnostic') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES.diagnostic}>
          <Diagnostic />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'rental-collection') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['rental-collection']}>
          <RentalCollectionDetails />
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

    if (currentPage === 'daily-status') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['daily-status']}>
          <DailyStatusManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'room-management') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['room-management']}>
          <RoomManagement />
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

    if (currentPage === 'active-sessions') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['active-sessions']}>
          <ActiveSessionsManagement />
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

    if (currentPage === 'guest-checkin') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['guest-checkin']}>
          <GuestCheckinManagement />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'misc-uploads') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['misc-uploads']}>
          <MiscUploads />
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

    if (currentPage === 'water-tank-monitor') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['water-tank-monitor']}>
          <WaterTankLevelMonitor />
        </ProtectedRoute>
      );
    }

    if (currentPage === 'electricity-charges') {
      return (
        <ProtectedRoute requiredRoles={SCREEN_ROLES['electricity-charges']}>
          <TenantElectricityCharges />
        </ProtectedRoute>
      );
    }

    console.log('[AppContent] Rendering home page for user:', user?.username);
    return (
      <>
        <RollingBanner />
        <div className="container">
        </div>
      </>
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
            <span className="app-name">Gnanabi Mansion</span>
          </div>
        </div>
        
        <div className="header-center">
          <h2 className="page-title">
            {NAV_ITEMS.find(item => item.page === currentPage)?.label || 'Gnanabi Mansion'}
          </h2>
        </div>

        <div className={`header-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <div className={`nav-items-container`}>
            {visibleNavGroups.map(group => {
              const groupHasActivePage = group.items.some(item => item.page === currentPage);
              const isExpanded = activeGroupKey === group.key;

              return (
                <div className={`nav-group ${isExpanded ? 'open' : ''}`} key={group.key}>
                  <button
                    className={`nav-group-toggle ${groupHasActivePage ? 'active' : ''}`}
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={isExpanded}
                    aria-controls={`submenu-${group.key}`}
                  >
                    <span className="nav-group-label">{group.label}</span>
                    <span className={`nav-group-arrow ${isExpanded ? 'open' : ''}`}>▾</span>
                  </button>

                  <div className={`nav-submenu ${isExpanded ? 'open' : ''}`} id={`submenu-${group.key}`}>
                    {group.items.map(item => (
                      <button
                        key={item.page}
                        className={`nav-item nav-subitem ${currentPage === item.page ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPage(item.page);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
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
                    <>
                      <div className="dropdown-next-login">
                        Valid for: {user.nextLoginDuration} day{user.nextLoginDuration !== 1 ? 's' : ''}
                      </div>
                      {timeForNextLogin && (
                        <div className="dropdown-next-login-time">
                          {timeForNextLogin}
                        </div>
                      )}
                    </>
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
