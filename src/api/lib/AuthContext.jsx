import { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '@/apiClient';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const token = appParams.token || localStorage.getItem('ph_sports_access_token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      // Static mode for production
      if (import.meta.env.MODE === 'production') {
        // Mock user data for static mode
        const mockUser = {
          id: 1,
          email: 'demo@sportsync.edu',
          name: 'Demo User',
          role: 'admin',
          profile_complete: true,
          teacher_status: 'approved'
        };
        setUser(mockUser);
        setIsAuthenticated(true);
      } else {
        // Development mode - call actual API
        const currentUser = await apiClient.get('/auth/me');
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('ph_sports_access_token');
    // Optional: call logout endpoint
    // apiClient.post('/auth/logout').catch(() => {});
    window.location.href = '/';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
