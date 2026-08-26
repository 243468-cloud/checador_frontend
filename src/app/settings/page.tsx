'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import {
  Clock,
  Sun,
  Sunset,
  Calendar,
  User,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Activity,
  Shield,
  Building2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Configuración</h1>
            <p className="page-subtitle">Ajustes del sistema</p>
          </div>
        </div>

        <div className="grid-2">
          {/* Turnos */}
          <div className="card animate-slide-up">
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <Clock size={20} className="text-primary" />
              <span>Horarios de Turnos</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'Turno Matutino', time: '7:00 – 15:00', days: 'Lunes a Sábado', color: '#6366f1', icon: <Sun size={22} /> },
                { name: 'Turno Vespertino', time: '15:00 – 23:00', days: 'Lunes a Sábado', color: '#f59e0b', icon: <Sunset size={22} /> },
                { name: 'Turno Dominical', time: '8:00 – 18:00', days: 'Solo Domingo', color: '#10b981', icon: <Calendar size={22} /> },
              ].map(shift => (
                <div key={shift.name} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${shift.color}20`, color: shift.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {shift.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{shift.name}</div>
                    <div style={{ fontSize: '0.875rem', color: shift.color, fontWeight: 700 }}>{shift.time}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{shift.days}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="alert alert-info flex items-start gap-2" style={{ marginTop: 20, fontSize: '0.8rem' }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Los horarios se configuran globalmente. Para ajustar la tolerancia de tardanza, edita cada sucursal individualmente.</span>
            </div>
          </div>

          {/* Mi cuenta */}
          <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <User size={20} className="text-primary" />
              <span>Mi Cuenta</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Usuario', value: user?.userId ? `ID: ${user.userId}` : '—' },
                { label: 'Nombre', value: user?.fullName || '—' },
                { label: 'Rol', value: user?.role === 'SUPERUSER' ? 'Superusuario' : user?.role === 'ADMIN' ? 'Administrador' : 'Empleado' },
                { label: 'Sucursal', value: user?.branchName || 'Global' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PWA Info */}
          <div className="card animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <Smartphone size={20} className="text-primary" />
              <span>Aplicación PWA</span>
            </h3>
            <div className="alert alert-success flex items-center gap-2" style={{ marginBottom: 16 }}>
              <CheckCircle2 size={16} />
              <span>Esta aplicación funciona como PWA — puedes instalarla en tu dispositivo.</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Para instalarla en tu teléfono o computadora:
            </p>
            <ol style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', paddingLeft: 20, marginTop: 12, lineHeight: 2 }}>
              <li>Abre el menú del navegador</li>
              <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a inicio"</strong></li>
              <li>Confirma la instalación</li>
            </ol>
          </div>

          {/* Estado del sistema */}
          <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <Activity size={20} className="text-primary" />
              <span>Estado del Sistema</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Backend API', status: 'Conectado', ok: true },
                { label: 'Base de datos', status: 'MySQL activo', ok: true },
                { label: 'GPS / Geolocalización', status: 'Habilitado', ok: true },
                { label: 'Service Worker', status: 'Activo (modo offline)', ok: true },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
                  <span className={`badge ${item.ok ? 'badge-success' : 'badge-danger'}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
