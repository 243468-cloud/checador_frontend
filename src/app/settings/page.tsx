'use client';

import { useState } from 'react';
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
  Key,
  Edit,
  Save,
  X,
  Award,
} from 'lucide-react';
import RewardsLeaderboard from '@/components/RewardsLeaderboard';

export default function SettingsPage() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPass: '', newPass: '', confirmPass: '' });
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (passForm.newPass.length < 6) {
      setPassError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (passForm.newPass !== passForm.confirmPass) {
      setPassError('Las contraseñas no coinciden');
      return;
    }

    setPassSuccess(true);
    setTimeout(() => {
      setPassSuccess(false);
      setShowPasswordModal(false);
      setPassForm({ currentPass: '', newPass: '', confirmPass: '' });
    }, 1500);
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        {/* Header */}
        <div className="page-header mb-8">
          <div>
            <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Perfil de Usuario & Configuración
            </h1>
            <p className="page-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Ajustes de cuenta, turnos de trabajo y estado del sistema
            </p>
          </div>
        </div>

        {/* 1. TOP USER PROFILE CARD */}
        <div className="card mb-8 animate-slide-up" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)',
          border: '1px solid rgba(225, 29, 72, 0.18)',
          boxShadow: '0 12px 32px -8px rgba(225, 29, 72, 0.08), 0 4px 14px rgba(0,0,0,0.03)',
          borderRadius: '20px',
          padding: '32px',
        }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 mb-6" style={{ borderBottom: '1px solid #f1ece1' }}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                color: '#ffffff',
                fontWeight: 800, fontSize: '1.75rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(225, 29, 72, 0.3)',
                border: '3px solid #ffffff',
                flexShrink: 0,
              }}>
                {(user?.fullName || 'U').slice(0, 2).toUpperCase()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
                    {user?.fullName || 'Usuario Vía Gourmet'}
                  </h2>
                  <span className="badge badge-primary" style={{ fontSize: '11px', padding: '5px 12px', fontWeight: 800, borderRadius: '20px' }}>
                    {user?.role === 'SUPERUSER' ? 'SUPERUSUARIO' : user?.role === 'ADMIN' ? 'ADMINISTRADOR' : 'EMPLEADO'}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  Sucursal Asignada: <strong style={{ color: '#0f172a', marginLeft: '4px' }}>{user?.branchName || 'Global Vía Gourmet'}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="btn btn-primary flex items-center gap-2.5"
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                }}
              >
                <Key size={16} />
                <span>Cambiar Contraseña</span>
              </button>
            </div>
          </div>

          {/* Profile Metadata Details Grid */}
          <div className="grid-2-columns" style={{ gap: '20px' }}>
            <div className="p-5 rounded-xl" style={{ background: '#fdfbf7', border: '1px solid #f1ece1', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                Nombre de Usuario
              </div>
              <div style={{ fontSize: '0.96rem', color: '#0f172a', fontWeight: 800 }}>
                {user?.fullName || `ID: ${user?.userId}`}
              </div>
            </div>

            <div className="p-5 rounded-xl" style={{ background: '#fdfbf7', border: '1px solid #f1ece1', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                Rol de Acceso
              </div>
              <div style={{ fontSize: '0.96rem', color: '#e11d48', fontWeight: 800 }}>
                {user?.role === 'SUPERUSER' ? 'Superusuario Global' : user?.role === 'ADMIN' ? 'Administrador de Sucursal' : 'Empleado Oficial'}
              </div>
            </div>

            <div className="p-5 rounded-xl" style={{ background: '#fdfbf7', border: '1px solid #f1ece1', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                Sucursal Base
              </div>
              <div style={{ fontSize: '0.96rem', color: '#0f172a', fontWeight: 800 }}>
                {user?.branchName || 'Vía Gourmet'}
              </div>
            </div>

            <div className="p-5 rounded-xl" style={{ background: '#fdfbf7', border: '1px solid #f1ece1', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                Estado de Cuenta
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: '2px' }}>
                <CheckCircle2 size={16} color="#059669" />
                <span style={{ fontSize: '0.96rem', color: '#059669', fontWeight: 800 }}>Activo & Verificado</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SHIFTS & PWA & SYSTEM STATUS GRID (Solo para Administradores y Superusuarios) */}
        {user?.role !== 'EMPLOYEE' && (
          <div className="grid-2-columns" style={{ gap: '24px' }}>
            {/* Turnos Oficiales */}
            <div className="card animate-slide-up" style={{ borderRadius: '20px', padding: '28px' }}>
              <h3 className="flex items-center gap-2.5" style={{ marginBottom: 24, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                <Clock size={20} color="#e11d48" />
                <span>Horarios de Turnos Oficiales</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { name: 'Turno Matutino', time: '7:00 – 15:00', days: 'Lunes a Sábado', color: '#e11d48', icon: <Sun size={20} /> },
                  { name: 'Turno Vespertino', time: '15:00 – 23:00', days: 'Lunes a Sábado', color: '#d97706', icon: <Sunset size={20} /> },
                  { name: 'Turno Dominical', time: '8:00 – 18:00', days: 'Solo Domingo', color: '#059669', icon: <Calendar size={20} /> },
                ].map(shift => (
                  <div key={shift.name} style={{
                    background: '#fdfbf7',
                    border: '1px solid #f1ece1',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 18,
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${shift.color}15`, color: shift.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {shift.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: 4 }}>{shift.name}</div>
                      <div style={{ fontSize: '0.86rem', color: shift.color, fontWeight: 800, marginBottom: 2 }}>{shift.time}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>{shift.days}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="alert alert-info flex items-start gap-3" style={{ marginTop: 24, fontSize: '0.8rem', padding: '14px 18px', borderRadius: '12px' }}>
                <HelpCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ lineHeight: 1.4 }}>Los horarios se aplican globalmente. Para ajustar tolerancias GPS o retardo por sucursal, consulta al administrador.</span>
              </div>
            </div>

            {/* Aplicación PWA & Estado */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.1s', borderRadius: '20px', padding: '28px' }}>
              <h3 className="flex items-center gap-2.5" style={{ marginBottom: 24, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                <Smartphone size={20} color="#e11d48" />
                <span>Aplicación Móvil PWA & Sistema</span>
              </h3>
              <div className="alert alert-success flex items-center gap-3 mb-6" style={{ padding: '16px 18px', borderRadius: '12px' }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.4 }}>PWA instalada y lista para funcionar en segundo plano.</span>
              </div>

              <div className="p-5 rounded-xl" style={{ background: '#fdfbf7', border: '1px solid #f1ece1', padding: '20px 24px', borderRadius: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '14px' }}>
                  Servicios del Sistema Vía Gourmet:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Servidor Backend API', status: 'En Línea', ok: true },
                    { label: 'Base de Datos MySQL', status: 'Activa', ok: true },
                    { label: 'Validación GPS Sucursal', status: 'Habilitada', ok: true },
                    { label: 'Push Notifications Móvil', status: 'Sincronizado', ok: true },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>{item.label}</span>
                      <span className="badge badge-success" style={{ fontSize: '10px', padding: '4px 10px', fontWeight: 800, borderRadius: '20px' }}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD MODAL */}
        {showPasswordModal && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="modal-header">
                <div className="modal-header-title">
                  <Key size={20} color="#e11d48" />
                  <span>Cambiar Contraseña</span>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setShowPasswordModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <div className="modal-body">
                  {passSuccess ? (
                    <div className="alert alert-success flex items-center gap-2">
                      <CheckCircle2 size={18} />
                      <span>¡Contraseña actualizada correctamente!</span>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Contraseña Actual *</label>
                        <input
                          type="password"
                          placeholder="Ingresa tu contraseña actual"
                          value={passForm.currentPass}
                          onChange={e => setPassForm(p => ({ ...p, currentPass: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Nueva Contraseña *</label>
                        <input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={passForm.newPass}
                          onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Confirmar Nueva Contraseña *</label>
                        <input
                          type="password"
                          placeholder="Repite la nueva contraseña"
                          value={passForm.confirmPass}
                          onChange={e => setPassForm(p => ({ ...p, confirmPass: e.target.value }))}
                          required
                        />
                      </div>

                      {passError && <div className="alert alert-danger" style={{ fontSize: '0.8rem' }}>{passError}</div>}
                    </>
                  )}
                </div>

                {!passSuccess && (
                  <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={() => setShowPasswordModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary flex items-center gap-2">
                      <Save size={16} />
                      <span>Actualizar Contraseña</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
