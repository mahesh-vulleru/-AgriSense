import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextInstance.js';
import authService from '../services/authService.js';
import { getStoredToken } from '../services/api.js';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  // Initialize and hydrate authentication session on initial load
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const currentToken = getStoredToken();
      if (!currentToken) {
        return;
      }

      try {
        const data = await authService.getCurrentUser();
        if (isMounted && data?.success && data?.user) {
          setUser(data.user);
          setToken(currentToken);
          setIsAuthenticated(true);
        }
      } catch {
        if (isMounted) {
          authService.logout();
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh user data manually if needed
  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const data = await authService.getCurrentUser();
      if (data?.success && data?.user) {
        setUser(data.user);
        setToken(currentToken);
        setIsAuthenticated(true);
      }
    } catch {
      authService.logout();
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Login handler
  const login = async (email, password, rememberMe = true) => {
    setError(null);
    try {
      const data = await authService.login({ email, password, rememberMe });
      setUser(data.user);
      setToken(data.token);
      setIsAuthenticated(true);
      return data;
    } catch (err) {
      const message = err.message || 'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    }
  };

  // Registration handler
  const register = async (formData) => {
    setError(null);
    try {
      const data = await authService.register(formData);
      setUser(data.user);
      setToken(data.token);
      setIsAuthenticated(true);
      return data;
    } catch (err) {
      const message = err.message || 'Registration failed. Please check your inputs.';
      setError(message);
      throw err;
    }
  };

  // Logout handler
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
