import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/apiClient';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext(null);

function clearAccountData() {
  queryClientInstance.cancelQueries();
  queryClientInstance.clear();
}

function accountError(error) {
  if (error.response?.status === 401) {
    return { type: 'auth_required', message: 'Sign in with your email and password to continue.' };
  }
  return {
    type: 'auth_error',
    message: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? 'The server took too long to respond. Please try again.'
      : 'We could not load your account. Check your connection and try again.',
  };
}

function validUser(user) {
  if (!user || typeof user.email !== 'string' || !user.email.trim()) throw new Error('Invalid account response');
  return user;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const authRequest = useRef(0);
  const accountId = useRef(null);
  // Keep cookie-changing requests in order. Logout waits for any in-flight login
  // so a late Set-Cookie response cannot restore a session after signing out.
  const mutations = useRef(Promise.resolve());
  const enqueue = useCallback(callback => {
    const task = mutations.current.then(callback, callback);
    mutations.current = task.catch(() => {});
    return task;
  }, []);

  const acceptUser = useCallback(currentUser => {
    if (accountId.current !== currentUser.id) clearAccountData();
    accountId.current = currentUser.id;
    setUser(currentUser);
    setAuthError(null);
  }, []);

  const checkUserAuth = useCallback(async () => {
    const requestId = ++authRequest.current;
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await mutations.current;
      if (requestId !== authRequest.current) return null;
      const currentUser = validUser(await apiClient.get('/auth/me'));
      if (requestId !== authRequest.current) return null;
      acceptUser(currentUser);
      return currentUser;
    } catch (error) {
      if (requestId !== authRequest.current) return null;
      accountId.current = null;
      clearAccountData();
      setUser(null);
      setAuthError(accountError(error));
      return null;
    } finally {
      if (requestId === authRequest.current) setIsLoadingAuth(false);
    }
  }, [acceptUser]);

  const authenticate = useCallback((path, credentials) => {
    const requestId = ++authRequest.current;
    setIsLoadingAuth(true);
    setAuthError(null);
    setUser(null);
    accountId.current = null;
    clearAccountData();
    return enqueue(async () => {
      try {
        const currentUser = validUser(await apiClient.post(path, credentials));
        if (requestId !== authRequest.current) return null;
        acceptUser(currentUser);
        return currentUser;
      } catch (error) {
        if (requestId !== authRequest.current) return null;
        setAuthError({ type: 'auth_error', message: error.response?.data?.error || 'Unable to sign in. Please try again.' });
        throw error;
      } finally {
        if (requestId === authRequest.current) setIsLoadingAuth(false);
      }
    });
  }, [acceptUser, enqueue]);

  const login = useCallback(credentials => authenticate('/auth/login', credentials), [authenticate]);
  const register = useCallback(credentials => authenticate('/auth/register', credentials), [authenticate]);

  const logout = useCallback(() => {
    const requestId = ++authRequest.current;
    setIsLoadingAuth(true);
    return enqueue(async () => {
      try {
        await apiClient.post('/auth/logout');
        if (requestId !== authRequest.current) return false;
        accountId.current = null;
        clearAccountData();
        setUser(null);
        setAuthError({ type: 'auth_required', message: 'You have signed out. Sign in to continue.' });
        return true;
      } catch {
        if (requestId === authRequest.current) {
          setAuthError({ type: 'auth_error', message: 'Sign-out did not complete. Check your connection and try again.' });
        }
        return false;
      } finally {
        if (requestId === authRequest.current) setIsLoadingAuth(false);
      }
    });
  }, [enqueue]);

  useEffect(() => {
    // Remove credentials left by the previous prototype. Sessions now use HttpOnly cookies.
    localStorage.removeItem('ph_sports_access_token');
    localStorage.removeItem('token');
    checkUserAuth();
    const sessionExpired = () => {
      if (!accountId.current) return;
      authRequest.current += 1;
      accountId.current = null;
      clearAccountData();
      setUser(null);
      setIsLoadingAuth(false);
      setAuthError({ type: 'auth_required', message: 'Your session has expired. Please sign in again.' });
    };
    window.addEventListener('ph-sports:session-expired', sessionExpired);
    return () => {
      authRequest.current += 1;
      window.removeEventListener('ph-sports:session-expired', sessionExpired);
    };
  }, [checkUserAuth]);

  const navigateToLogin = () => { window.location.href = '/login'; };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, authError,
      login, register, logout, navigateToLogin, checkUserAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
