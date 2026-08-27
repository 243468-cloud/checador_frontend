'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as apiLogin, LoginResponse } from '@/lib/api';
import { registerServiceWorker, subscribeUserToPush } from '@/lib/push';

interface AuthContextType {
  user: LoginResponse | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setTokenAndUser: (token: string, user: LoginResponse) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const autoSubscribePush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      registerServiceWorker().then(() => {
        subscribeUserToPush().catch(() => {});
      });
    }
  };

  useEffect(() => {
    // Restaurar sesión desde localStorage
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
        autoSubscribePush();
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  // Keep-Alive background ping to prevent Render free tier spin-down (ping every 10 minutes)
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const pingBackend = () => {
      fetch(`${API_BASE}/api/branches/public`).catch(() => {});
    };

    pingBackend();
    const interval = setInterval(pingBackend, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    autoSubscribePush();
  };

  const setTokenAndUser = (token: string, userData: LoginResponse) => {
    localStorage.setItem('token', token);
    if (userData.refreshToken) {
      localStorage.setItem('refreshToken', userData.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setTokenAndUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
