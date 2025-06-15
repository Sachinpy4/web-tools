'use client'

import React, { createContext, useState, useEffect, useContext, useRef } from 'react'
import { apiRequest } from '@/lib/apiClient';
import { toast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  sessionTimeRemaining: number | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  refreshSession: async () => false,
  sessionTimeRemaining: null,
});

// Session timeout configuration
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING_MS = 10 * 60 * 1000; // Show warning 10 minutes before expiry
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null);
  
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<boolean>(false);
  const userRef = useRef<User | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Wrapped setters to keep refs in sync
  const setUserWithRef = (newUser: User | null) => {
    setUser(newUser);
    userRef.current = newUser; // Keep ref in sync
  };

  const setTokenWithRef = (newToken: string | null) => {
    setToken(newToken);
    tokenRef.current = newToken; // Keep ref in sync
  };

  // Update last activity time
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  };

  // Set up activity listeners
  useEffect(() => {
    const handleActivity = () => updateActivity();

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  // Session timeout management
  const startSessionTimer = () => {
    clearSessionTimers();
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Check session status every minute
    sessionCheckRef.current = setInterval(() => {
      const currentUser = userRef.current;
      const currentToken = tokenRef.current;
      
      if (!currentUser || !currentToken) {
        return;
      }

      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const timeRemaining = SESSION_TIMEOUT_MS - timeSinceActivity;

      setSessionTimeRemaining(Math.max(0, timeRemaining));

      // Show warning if approaching timeout
      if (timeRemaining <= SESSION_WARNING_MS && timeRemaining > 0 && !warningShownRef.current) {
        warningShownRef.current = true;
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
        
        toast({
          title: 'Session Expiring Soon',
          description: `Your session will expire in ${minutesRemaining} minute(s). Click anywhere to extend your session.`,
          variant: 'destructive',
          duration: 8000,
        });
      }

      // Auto-logout if session expired
      if (timeRemaining <= 0) {
        handleSessionExpiry();
      }
    }, SESSION_CHECK_INTERVAL);
  };

  const clearSessionTimers = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  };

  const handleSessionExpiry = () => {
    clearSessionTimers();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTokenWithRef(null);
    setUserWithRef(null);
    setSessionTimeRemaining(null);
    
    toast({
      title: 'Session Expired',
      description: 'Your session has expired due to inactivity. Please log in again.',
      variant: 'destructive',
      duration: 5000,
    });

    // Redirect to login if on admin page
    if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/settings')) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
    }
  };

  // Refresh session function
  const refreshSession = async (): Promise<boolean> => {
    if (!tokenRef.current) return false;

    try {
      const response = await apiRequest<{status: string; data: User}>('/auth/me', {
        requireAuth: true,
        noRedirect: true
      });
      
      setUserWithRef(response.data);
      updateActivity(); // Reset activity timer
      
      toast({
        title: 'Session Extended',
        description: 'Your session has been extended successfully.',
        duration: 3000,
      });
      
      return true;
    } catch (error) {
      handleSessionExpiry();
      return false;
    }
  };

  // Initialize auth state from localStorage and validate token
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser && storedUser !== "undefined") {
        try {
          // Try to parse the stored user first
          const parsedUser = JSON.parse(storedUser);
          
          // Validate the token by making a request to get user profile
          const response = await apiRequest<{status: string; data: User}>('/auth/me', {
            requireAuth: true,
            noRedirect: true // Prevent automatic redirect during validation
          });
         
          // Token is valid, set the user data from response
          setTokenWithRef(storedToken);
          setUserWithRef(response.data);
          startSessionTimer(); // Start session management
        } catch (error: any) {
          // If it's a network error and we have stored user data, use it temporarily
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setTokenWithRef(storedToken);
              setUserWithRef(parsedUser);
              startSessionTimer(); // Start session management even with cached data
            } catch (parseError) {
              // If can't parse stored user, clear everything
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setTokenWithRef(null);
              setUserWithRef(null);
            }
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTokenWithRef(null);
            setUserWithRef(null);
          }
        }
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();

    // Cleanup on unmount
    return () => {
      clearSessionTimers();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{status: string; data: {id: string; name: string; email: string; role: string; token: string}}>('auth/login', {
        method: 'POST',
        body: { email, password },
        noRedirect: true // Prevent automatic redirect on auth errors
      });
      
      // Extract data from the nested response structure
      const { data } = response;
      const token = data.token;
      const user: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role
      };
      
      // Save token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setTokenWithRef(token);
      setUserWithRef(user);
      
      // Start session management
      startSessionTimer();
      
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${user.name}!`,
        duration: 3000,
      });
      
      return true;
    } catch (error) {
      setError('An error occurred. Please try again later.');
      
      // Re-throw the error so the login page can handle specific error codes
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    clearSessionTimers();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTokenWithRef(null);
    setUserWithRef(null);
    setSessionTimeRemaining(null);
    
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
      duration: 3000,
    });
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      login, 
      logout, 
      refreshSession,
      sessionTimeRemaining 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 