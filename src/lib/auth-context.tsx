'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as apiLogin, LoginResponse } from '@/lib/api';
import { registerServiceWorker, subscribeUserToPush } from '@/lib/push';

interface AuthContextType {
  user: LoginResponse | null;
  isLoading: boolean;
  login: (username: string, password: string, slug?: string) => Promise<void>;
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
      setIsLoading(false);
      return;
    }

    // Carga optimista desde localStorage para evitar flash de pantalla vacía
    try {
      setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem('user');
      setIsLoading(false);
      return;
    }

    // P7: Validar el JWT en cookie contra el servidor usando fetch directo
    // (NO apiFetch — ese redirige automáticamente en 401, causando doble redirect)
    fetch('/api/proxy/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          // Token expirado o inválido — cerrar sesión
          localStorage.removeItem('user');
          setUser(null);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return;
        }

        if (res.ok) {
          // Actualizar con datos frescos del servidor (rol, sucursal, etc.)
          const serverUser = await res.json();
          const merged = { ...JSON.parse(stored), ...serverUser };
          localStorage.setItem('user', JSON.stringify(merged));
          setUser(merged);
          autoSubscribePush();
        }
        // Para cualquier otro error (503 Render fría, timeout, red) —
        // conservar el usuario cacheado. El middleware y el backend rechazarán
        // las llamadas reales si el token realmente no sirve.
      })
      .catch(() => {
        // Error de red — conservar usuario cacheado, no cerrar sesión
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

  const login = async (username: string, password: string, slug?: string) => {
    // Llama al route handler de Next.js, no al backend directamente
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, slug }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al iniciar sesión' }));
      throw new Error(err.error || 'Error al iniciar sesión');
    }

    const data = await res.json();
    
    const clearClientStorage = async () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if (typeof window !== 'undefined' && 'caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (e) {
        console.error('Error al limpiar almacenamiento del cliente:', e);
      }
    };

    // Si inicia sesión un tenant distinto, limpiamos TODA la caché, localStorage y sessionStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const oldUser = JSON.parse(stored);
        if (oldUser.tenantId !== data.tenantId || oldUser.id !== data.id) {
          await clearClientStorage();
        }
      } catch (e) {
        await clearClientStorage();
      }
    }

    if (data.tenantSlug) {
      localStorage.setItem('tenantSlug', data.tenantSlug);
    }
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-changed'));
    }
    autoSubscribePush();
  };

  const setUserOnly = (userData: LoginResponse) => {
    if (userData.tenantSlug) {
      localStorage.setItem('tenantSlug', userData.tenantSlug);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-changed'));
    }
  };

  const logout = async () => {
    // Recuperar el slug de la empresa del usuario actual antes de vaciar el almacenamiento
    const targetSlug = localStorage.getItem('tenantSlug') || user?.tenantSlug;

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    // Limpieza total agresiva de caches, localStorage y sessionStorage para hermeticidad multi-tenant
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.error('Error al limpiar almacenamiento en logout:', e);
    }
    setUser(null);
    window.location.href = targetSlug ? `/${encodeURIComponent(targetSlug)}/login` : '/login';
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
