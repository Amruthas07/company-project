import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/threat';
import { authApi, usersApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password: string, department?: string, title?: string) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sentinel_jwt_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const storedToken = localStorage.getItem('sentinel_jwt_token');
      if (storedToken) {
        const currentUser = await authApi.me();
        setUser(currentUser);
      } else {
        // Default login as Lead SecOps Admin (Arjun Sharma) for immediate out-of-the-box demo experience
        const res = await authApi.login('arjun.sharma@cyberdefense.in', 'Sentinel@2026');
        localStorage.setItem('sentinel_jwt_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      }
    } catch (err: any) {
      console.warn('[Auth] Token verification failed, logging in as Arjun Sharma:', err?.message);
      try {
        const res = await authApi.login('arjun.sharma@cyberdefense.in', 'Sentinel@2026');
        localStorage.setItem('sentinel_jwt_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      } catch (fallbackErr) {
        console.error('[Auth] Failed default login:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('sentinel_jwt_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, department?: string, title?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.register({ name, email, password, department, title });
      localStorage.setItem('sentinel_jwt_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Email may already be in use.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sentinel_jwt_token');
    setToken(null);
    setUser(null);
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const allUsers = await usersApi.getAll();
      const target = allUsers.find((u) => u.id === userId);
      if (target) {
        // Authenticate as this user
        const res = await authApi.login(target.email, 'Sentinel@2026');
        localStorage.setItem('sentinel_jwt_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      }
    } catch (err) {
      console.error('[Auth] Failed to switch user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
    } catch (err) {
      console.warn('[Auth] Failed to refresh current user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        switchUser,
        refreshUser,
      }}
    >
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
