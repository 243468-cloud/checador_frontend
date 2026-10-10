'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';

export default function ModuleGuard({ children, requiredModule }: { children: React.ReactNode; requiredModule: string }) {
  const { settings, loading } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!settings) {
        // Fail-closed si no se pudo cargar la configuración
        router.replace('/dashboard');
      } else if (settings.activeModules && !settings.activeModules.includes(requiredModule)) {
        // Redirigir si el módulo no está activo
        router.replace('/dashboard');
      }
    }
  }, [settings, loading, router, requiredModule]);

  if (loading) return <div>Cargando...</div>;
  if (!settings || (settings.activeModules && !settings.activeModules.includes(requiredModule))) {
    return null; // No renderizar mientras redirige
  }

  return <>{children}</>;
}
