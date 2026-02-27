import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AuthUser, Register, Login } from '@canopy/shared';
import { authRegister, authLogin, authGetMe, getAuthToken, setAuthToken, isApiConfigured } from '@/api/client';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (data: Login) => Promise<void>;
  register: (data: Register) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // If API is not configured, skip auth check and allow access
      if (!isApiConfigured()) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: 'local-user',
            name: 'Local User',
            email: 'local@canopy.dev',
            role: 'admin',
            createdAt: new Date().toISOString(),
          },
        }));
        return;
      }

      try {
        const user = await authGetMe();
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch {
        // Token is invalid, clear it
        setAuthToken(null);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (data: Login) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authLogin(data);
      setAuthToken(response.token);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message = err?.data?.error?.message || err?.message || 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const register = useCallback(async (data: Register) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authRegister(data);
      setAuthToken(response.token);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message = err?.data?.error?.message || err?.message || 'Registration failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
