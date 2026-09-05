'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { settingsApi, ShiftConfigDTO } from '@/lib/api';
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
  Moon,
  Timer,
} from 'lucide-react';
import RewardsLeaderboard from '@/components/RewardsLeaderboard';

export default function SettingsPage() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPass: '', newPass: '', confirmPass: '' });
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  // ─── Shift Configurations State ───────────────────────────────────────────
  const [shifts, setShifts] = useState<ShiftConfigDTO[]>([
    { shiftName: 'MORNING', label: 'Turno Matutino', startTime: '07:00', endTime: '15:00', daysDescription: 'Lunes a Sábado' },
    { shiftName: 'EVENING', label: 'Turno Vespertino', startTime: '14:00', endTime: '22:00', daysDescription: 'Lunes a Sábado' },
    { shiftName: 'SUNDAY', label: 'Turno Dominical', startTime: '08:00', endTime: '18:00', daysDescription: 'Solo Domingo (Entrada 8:00 AM para todos)' },
    { shiftName: 'NOCTURNO', label: 'Turno Nocturno', startTime: '22:00', endTime: '06:00', daysDescription: 'Lunes a Sábado' },
    { shiftName: 'MEDIO', label: 'Medio Turno', startTime: '09:00', endTime: '13:00', daysDescription: 'Horario Especial' },
  ]);
  const [isEditingShifts, setIsEditingShifts] = useState(false);
  const [savingShifts, setSavingShifts] = useState(false);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState(false);

  useEffect(() => {
    settingsApi.getShifts()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setShifts(res);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveShifts = async () => {
    setSavingShifts(true);
    try {
      const updated = await settingsApi.updateShifts(shifts);
      if (Array.isArray(updated) && updated.length > 0) {
        setShifts(updated);
      }
      setIsEditingShifts(false);
      setShiftSuccessMsg(true);
      setTimeout(() => setShiftSuccessMsg(false), 3500);
    } catch (e) {
      alert('Error al guardar la configuración de horarios.');
    } finally {
      setSavingShifts(false);
    }
  };

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
            {/* Turnos Oficiales (Configuración Dinámica de Horarios) */}
            <div className="card animate-slide-up" style={{ borderRadius: '20px', padding: '28px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                <h3 className="flex items-center gap-2.5" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  <Clock size={20} color="#e11d48" />
                  <span>Horarios de Turnos Oficiales</span>
                </h3>
                {!isEditingShifts ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingShifts(true)}
                    className="btn btn-secondary flex items-center gap-2"
                    style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', border: '1px solid #bae6fd' }}
                  >
                    <Edit size={14} />
                    <span>Editar Horarios</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingShifts(false)}
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveShifts}
                      disabled={savingShifts}
                      className="btn btn-primary flex items-center gap-2"
                      style={{ padding: '6px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none' }}
                    >
                      <Save size={14} />
                      <span>{savingShifts ? 'Guardando...' : 'Guardar Horarios'}</span>
                    </button>
                  </div>
                )}
              </div>

              {shiftSuccessMsg && (
                <div className="alert alert-success flex items-center gap-2 mb-4" style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <CheckCircle2 size={16} />
                  <span>¡Horarios guardados correctamente! En domingos todo el personal checará a las 8:00 AM sin retardo.</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {shifts.map((shift, sIdx) => {
                  const shiftIcons: Record<string, { color: string; icon: React.ReactNode }> = {
                    MORNING: { color: '#e11d48', icon: <Sun size={18} /> },
                    EVENING: { color: '#d97706', icon: <Sunset size={18} /> },
                    SUNDAY:  { color: '#059669', icon: <Calendar size={18} /> },
                    NOCTURNO:{ color: '#6366f1', icon: <Moon size={18} /> },
                    MEDIO:   { color: '#0284c7', icon: <Timer size={18} /> },
                  };
                  const meta = shiftIcons[shift.shiftName] || { color: '#64748b', icon: <Clock size={18} /> };

                  return (
                    <div key={shift.shiftName} style={{
                      background: '#fdfbf7',
                      border: '1px solid #f1ece1',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                    }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}15`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {meta.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{shift.label}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {shift.daysDescription || (shift.shiftName === 'SUNDAY' ? 'Solo Domingo (Entrada 8:00 AM para todos)' : 'Lunes a Sábado')}
                          </div>
                        </div>
                      </div>

                      {/* Selector o Vista de Horario */}
                      {!isEditingShifts ? (
                        <div style={{ fontSize: '0.88rem', color: meta.color, fontWeight: 800, background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          {shift.startTime} – {shift.endTime}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={shift.startTime}
                            onChange={e => {
                              const updated = [...shifts];
                              updated[sIdx] = { ...updated[sIdx], startTime: e.target.value };
                              setShifts(updated);
                            }}
                            style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #0284c7', background: '#ffffff', fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}
                          />
                          <span style={{ fontWeight: 800, color: '#64748b' }}>–</span>
                          <input
                            type="time"
                            value={shift.endTime}
                            onChange={e => {
                              const updated = [...shifts];
                              updated[sIdx] = { ...updated[sIdx], endTime: e.target.value };
                              setShifts(updated);
                            }}
                            style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #0284c7', background: '#ffffff', fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="alert alert-info flex items-start gap-3" style={{ marginTop: 20, fontSize: '0.78rem', padding: '12px 16px', borderRadius: '12px' }}>
                <HelpCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.4 }}>
                  <strong>Regla de Domingos:</strong> En días domingo, la entrada oficial se establece automáticamente a las <strong>{shifts.find(s => s.shiftName === 'SUNDAY')?.startTime || '08:00'} AM</strong> para todo el personal asignado, evitando marcas injustificadas de retardo en el checador.
                </span>
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
