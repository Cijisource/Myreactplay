import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin } from '../api';

interface User {
  id: number;
  username: string;
  name: string;
  roles: string;
  nextLoginDuration?: number | null;
  lastLogin?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Shared localStorage key used purely to broadcast logout across tabs via the 'storage' event.
const GLOBAL_LOGOUT_KEY = 'global-logout-broadcast';

const readTabStorageItem = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeTabStorageItem = (key: string, value: string): void => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted/private browsing contexts.
  }
};

const removeTabStorageItem = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restricted/private browsing contexts.
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutTimer, setLogoutTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoLogoutTimer = () => {
    if (logoutTimer) {
      console.log('[Auto-Logout] Clearing existing timer');
      clearTimeout(logoutTimer);
      setLogoutTimer(null);
    }
  };

  const setupAutoLogout = (nextLoginDuration: number | null | undefined, expiryTimestamp?: number | null) => {
    const durationDays = Number(nextLoginDuration);
    const now = Date.now();
    const absoluteExpiry = Number.isFinite(expiryTimestamp) && expiryTimestamp !== null && expiryTimestamp !== undefined
      ? expiryTimestamp
      : (Number.isFinite(durationDays) && durationDays > 0 ? now + (durationDays * 24 * 60 * 60 * 1000) : null);

    console.log('[Auto-Logout] setupAutoLogout called with:', {
      nextLoginDuration,
      durationDays,
      absoluteExpiry,
      now,
      type: typeof nextLoginDuration
    });

    clearAutoLogoutTimer();

    if (!absoluteExpiry || absoluteExpiry <= now) {
      removeTabStorageItem('sessionExpiresAt');
      console.log('[Auto-Logout] No valid expiry found; auto-logout not scheduled');
      return;
    }

    const remainingMs = absoluteExpiry - now;
    console.log(`[Auto-Logout] Scheduling logout for ${remainingMs}ms from now`, {
      expiresAt: new Date(absoluteExpiry).toISOString(),
      remainingMs,
      days: durationDays
    });

    writeTabStorageItem('sessionExpiresAt', String(absoluteExpiry));

    const timer = setTimeout(() => {
      console.log('[Auto-Logout] ⏰ Session expired, logging out user');
      logout();
    }, remainingMs);

    setLogoutTimer(timer);
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    try {
      const storedUser = readTabStorageItem('user');
      const storedToken = readTabStorageItem('authToken');
      const storedExpiry = Number(readTabStorageItem('sessionExpiresAt'));
      
      console.log('[Auth] Checking for stored session on mount:', {
        hasStoredUser: !!storedUser,
        hasStoredToken: !!storedToken,
        hasStoredExpiry: !!storedExpiry,
        storedExpiry
      });
      
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        const validStoredExpiry = Number.isFinite(storedExpiry) && storedExpiry > Date.now();

        if (!validStoredExpiry) {
          console.log('[Auth] Stored session expired on mount, clearing it');
          removeTabStorageItem('authToken');
          removeTabStorageItem('refreshToken');
          removeTabStorageItem('user');
          removeTabStorageItem('sessionExpiresAt');
          setUser(null);
        } else {
          console.log('[Auth] Restored user from localStorage:', {
            id: parsedUser.id,
            username: parsedUser.username,
            nextLoginDuration: parsedUser.nextLoginDuration,
            storedExpiry
          });
          setUser(parsedUser);
          setupAutoLogout(parsedUser.nextLoginDuration, storedExpiry);
        }
      } else {
        console.log('[Auth] No stored session found on mount');
      }
    } catch (err) {
      console.error('Error restoring auth state:', err);
      removeTabStorageItem('user');
      removeTabStorageItem('authToken');
      removeTabStorageItem('refreshToken');
      removeTabStorageItem('sessionExpiresAt');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiLogin(username, password);
      
      // Validate response structure
      if (!response || !response.token || !response.user) {
        console.error('[Auth] Invalid response structure:', response);
        throw new Error('Invalid login response: missing token or user data');
      }
      
      console.log('[Auth] Login response received:', {
        token: response.token ? 'present' : 'missing',
        user: response.user,
        roles: response.user.roles,
        rolesType: typeof response.user.roles
      });
      
      // Validate that roles field exists and is a string
      if (!response.user.roles) {
        console.error('[Auth] Missing roles in response, defaulting to "user"');
        response.user.roles = 'user';
      }
      
      if (typeof response.user.roles !== 'string') {
        console.error('[Auth] Roles is not a string:', response.user.roles);
        response.user.roles = String(response.user.roles || 'user');
      }
      
      // Store token and user info
      writeTabStorageItem('authToken', response.token);
      if (response.refreshToken) {
        writeTabStorageItem('refreshToken', response.refreshToken);
      }

      const durationDays = Number(response.user.nextLoginDuration);
      const expiryTimestamp = Number.isFinite(durationDays) && durationDays > 0
        ? Date.now() + (durationDays * 24 * 60 * 60 * 1000)
        : null;

      writeTabStorageItem('user', JSON.stringify(response.user));
      if (expiryTimestamp) {
        writeTabStorageItem('sessionExpiresAt', String(expiryTimestamp));
      } else {
        removeTabStorageItem('sessionExpiresAt');
      }
      
      console.log('[Auth] User data stored in localStorage:', {
        user: {
          id: response.user.id,
          username: response.user.username,
          roles: response.user.roles,
          nextLoginDuration: response.user.nextLoginDuration,
          nextLoginDurationType: typeof response.user.nextLoginDuration,
          expiryTimestamp
        }
      });
      
      setUser(response.user);
      
      // Setup auto-logout based on NextLoginDuration
      console.log('[Auth] About to setup auto-logout with nextLoginDuration:', response.user.nextLoginDuration);
      setupAutoLogout(response.user.nextLoginDuration, expiryTimestamp);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('[Auth Error]', { username, error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = (broadcast: boolean = true) => {
    console.log('[Auth] logout() called', {
      hasTimer: !!logoutTimer,
      currentUser: user ? { id: user.id, username: user.username } : null,
      stack: new Error().stack
    });

    clearAutoLogoutTimer();

    removeTabStorageItem('authToken');
    removeTabStorageItem('refreshToken');
    removeTabStorageItem('user');
    removeTabStorageItem('sessionExpiresAt');
    setUser(null);
    setError(null);

    // Notify other tabs so logout applies to every open tab, not just this one.
    if (broadcast) {
      try {
        localStorage.setItem(GLOBAL_LOGOUT_KEY, String(Date.now()));
      } catch {
        // Ignore storage failures in restricted/private browsing contexts.
      }
    }
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };

    // Fired when another tab writes to GLOBAL_LOGOUT_KEY; this tab was not the initiator.
    const handleCrossTabStorageEvent = (event: StorageEvent) => {
      if (event.key === GLOBAL_LOGOUT_KEY && event.newValue) {
        logout(false);
      }
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    window.addEventListener('storage', handleCrossTabStorageEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
      window.removeEventListener('storage', handleCrossTabStorageEvent);
    };
  }, [logout]);

  const clearError = () => {
    setError(null);
  };

  const hasRole = (role: string): boolean => {
    if (!user || !user.roles) return false;
    const normalizedRole = role.trim().toLowerCase();
    return user.roles
      .split(',')
      .map(r => r.trim().toLowerCase())
      .filter(r => r)
      .includes(normalizedRole);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles
      .split(',')
      .map(r => r.trim().toLowerCase())
      .filter(r => r);
    return roles.some(role => userRoles.includes(role.trim().toLowerCase()));
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    error,
    clearError,
    hasRole,
    hasAnyRole
  };

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
      }
    };
  }, [logoutTimer]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
