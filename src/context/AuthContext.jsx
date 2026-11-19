// Frontend: src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { TOKEN_KEY, USER_KEY } from '../utils/axiosConfig';

const AuthContext = createContext(null);
const PASSWORD_FLAG_KEY = 'nexevent_requires_pwd_change';

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(
    () => localStorage.getItem(PASSWORD_FLAG_KEY) === 'true'
  );
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    if (requiresPasswordChange) {
      localStorage.setItem(PASSWORD_FLAG_KEY, 'true');
    } else {
      localStorage.removeItem(PASSWORD_FLAG_KEY);
    }
  }, [requiresPasswordChange]);

  /**
   * login({ email, password } | { rollNumber, password })
   * Sends credentials directly to FastAPI.
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      // 🟢 SEND DIRECTLY: Matches the Body(...) declaration on the backend
      const { data } = await api.post('/auth/login', credentials);
      
      setToken(data.token);
      setUser(data.user);
      setRequiresPasswordChange(data.requires_password_change || false);
      
      return data.user;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setRequiresPasswordChange(false);
  }, []);

  const clearPasswordChangeFlag = useCallback(() => {
    setRequiresPasswordChange(false);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated,
      requiresPasswordChange,
      role: user?.role ?? null,
      erp: user?.erp ?? null,
      department: user?.department ?? null,
      year: user?.year ?? null,
      login,
      logout,
      clearPasswordChangeFlag,
    }),
    [token, user, loading, isAuthenticated, requiresPasswordChange, login, logout, clearPasswordChangeFlag]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}