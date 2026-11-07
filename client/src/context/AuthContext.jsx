import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './authContextInstance.js';
import authService from '../services/authService.js';
import { getStoredToken, setStoredUser } from '../services/api.js';

export const AuthProvider = ({ children }) => {
  const initialToken = getStoredToken();
  const cachedUser = initialToken ? authService.getCachedUser() : null;

  const [token, setToken] = useState(() => initialToken);
  const [user, setUser] = useState(() => cachedUser);
  // If we already have stored token and cached user, don't block the UI with loading skeleton
  const [loading, setLoading] = useState(() => Boolean(initialToken && !cachedUser));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialToken));
  const [error, setError] = useState(null);

  // Initialize and verify authentication session on initial load
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const currentToken = getStoredToken();
      if (!currentToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const data = await authService.getCurrentUser();
        if (isMounted && data?.success && data?.user) {
          setUser(data.user);
          setToken(currentToken);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Only clear authentication if it's an unauthorized error (401)
        if (isMounted && (err?.status === 401 || err?.response?.status === 401)) {
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
    } catch (err) {
      if (err?.status === 401 || err?.response?.status === 401) {
        authService.logout();
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      }
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

  // Update in-memory and persisted user profile
  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updatedUserData };
      setStoredUser(nextUser);
      return nextUser;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      loading,
      error,
      login,
      register,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, token, isAuthenticated, loading, error, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
