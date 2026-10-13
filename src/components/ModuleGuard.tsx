'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';

export default function ModuleGuard({ children, requiredModule }: { children: React.ReactNode; requiredModule: string }) {
  const { settings, loading } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!settings?.activeModules?.includes(requiredModule)) {
        // Fail-closed: redirigir si no está activo el módulo o si settings no ha cargado
        router.replace('/dashboard');
      }
    }
  }, [settings, loading, router, requiredModule]);

  if (loading) return <div>Cargando...</div>;
  if (!settings?.activeModules?.includes(requiredModule)) {
    return null; // No renderizar mientras redirige
  }

  return <>{children}</>;
}
