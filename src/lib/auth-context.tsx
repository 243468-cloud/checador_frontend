'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as apiLogin, LoginResponse, authApi } from '@/lib/api';
import { registerServiceWorker, subscribeUserToPush } from '@/lib/push';

interface AuthContextType {
  user: LoginResponse | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserOnly: (user: LoginResponse) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const autoSubscribePush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      registerServiceWorker().then(() => {
        subscribeUserToPush(true).catch(() => {});
      });
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');

    if (!stored) {
      // No hay sesión guardada — terminar loading inmediatamente
      setIsLoading(false);
      return;
    }

    // Optimistic: mostrar el usuario de localStorage para evitar flash de carga
    try {
      setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem('user');
      setIsLoading(false);
      return;
    }

    // P7: Validar que el JWT en cookie sigue siendo válido contra el servidor
    // Si el token expiró o fue manipulado, el servidor devolverá 401 y cerramos sesión
    authApi.getMe()
      .then((serverUser) => {
        // Actualizar con los datos frescos del servidor (por si cambió el rol, sucursal, etc.)
        const merged = { ...JSON.parse(stored), ...serverUser };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
        autoSubscribePush();
      })
      .catch(() => {
        // Token expirado o inválido — limpiar sesión
        localStorage.removeItem('user');
        setUser(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Keep-Alive background ping
  useEffect(() => {
    const pingBackend = () => {
      fetch(`/api/proxy/branches/public`).catch(() => {});
    };

    pingBackend();
    const interval = setInterval(pingBackend, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (username: string, password: string) => {
    // Llama al route handler de Next.js, no al backend directamente
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al iniciar sesión' }));
      throw new Error(err.error || 'Error al iniciar sesión');
    }

    const data = await res.json();
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    autoSubscribePush();
  };

  const setUserOnly = (userData: LoginResponse) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUserOnly, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
