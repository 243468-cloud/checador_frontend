'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getPublicBranches, registerEmployee, Branch } from '@/lib/api';
import {
  Clock,
  User,
  Lock,
  Mail,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Sun,
  Moon,
  Calendar,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setTokenAndUser } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    email: '',
    branchId: '',
    shiftType: 'MORNING' as 'MORNING' | 'EVENING' | 'SUNDAY' | 'MIXED',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(true);

  useEffect(() => {
    getPublicBranches()
      .then(data => {
        setBranches(data);
        if (data.length > 0) {
          setForm(p => ({ ...p, branchId: String(data[0].id) }));
        }
      })
      .catch(() => {})
      .finally(() => setFetchingBranches(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.branchId) {
      setError('Por favor selecciona una sucursal.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerEmployee({
        username: form.username.trim().toLowerCase(),
        password: form.password.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        branchId: Number(form.branchId),
        shiftType: form.shiftType,
      });

      // Save token and user in context
      setTokenAndUser(res.token, res);

      // Redirect to check-in or dashboard
      if (res.role === 'EMPLOYEE') {
        router.push('/checkin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-container">
      {/* Background Glow */}
      <div className="bg-glow bg-glow-center" />
      <div className="bg-grid-overlay" />

      <div className="register-centered-card animate-slide-up">
        {/* Back Link */}
        <Link href="/login" className="back-link">
          <ArrowLeft size={16} />
          <span>Volver al Login</span>
        </Link>

        {/* Header */}
        <div className="register-brand-header">
          <div className="brand-logo-img-container" style={{ background: '#ffffff', padding: '8px', borderRadius: '16px', width: '120px', margin: '0 auto 12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <img src="/logo.png" alt="Vía Gourmet Restaurante" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <h1 className="brand-title" style={{ fontSize: '1.35rem', fontWeight: 800 }}>Registro de Empleado</h1>
          <p className="brand-subtitle">Crea tu cuenta oficial para Vía Gourmet</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="register-form">
          {/* Nombre completo */}
          <div className="form-group-field">
            <label className="form-label-text" htmlFor="fullName">
              Nombre Completo *
            </label>
            <div className="input-field-wrapper">
              <span className="input-field-icon">
                <User size={18} />
              </span>
              <input
                id="fullName"
                type="text"
                className="form-input-element"
                placeholder="Ej. Juan Pérez García"
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Usuario */}
          <div className="form-group-field">
            <label className="form-label-text" htmlFor="reg-username">
              Nombre de Usuario *
            </label>
            <div className="input-field-wrapper">
              <span className="input-field-icon">
                <User size={18} />
              </span>
              <input
                id="reg-username"
                type="text"
                className="form-input-element"
                placeholder="Ej. juanperez"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group-field">
            <label className="form-label-text" htmlFor="email">
              Correo Electrónico (Opcional)
            </label>
            <div className="input-field-wrapper">
              <span className="input-field-icon">
                <Mail size={18} />
              </span>
              <input
                id="email"
                type="email"
                className="form-input-element"
                placeholder="juan@empresa.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Sucursal y Turno en Grid de 2 columnas */}
          <div className="form-grid-2col">
            {/* Sucursal */}
            <div className="form-group-field">
              <label className="form-label-text" htmlFor="branchId">
                Sucursal *
              </label>
              <div className="input-field-wrapper">
                <span className="input-field-icon">
                  <Building2 size={18} />
                </span>
                <select
                  id="branchId"
                  className="form-select-element"
                  value={form.branchId}
                  onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))}
                  required
                  disabled={fetchingBranches}
                >
                  {fetchingBranches ? (
                    <option value="">Cargando sucursales...</option>
                  ) : branches.length === 0 ? (
                    <option value="">No hay sucursales activas</option>
                  ) : (
                    branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Turno */}
            <div className="form-group-field">
              <label className="form-label-text" htmlFor="shiftType">
                Turno Asignado *
              </label>
              <div className="input-field-wrapper">
                <span className="input-field-icon">
                  <Clock size={18} />
                </span>
                <select
                  id="shiftType"
                  className="form-select-element"
                  value={form.shiftType}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      shiftType: e.target.value as 'MORNING' | 'EVENING' | 'SUNDAY' | 'MIXED',
                    }))
                  }
                  required
                >
                  <option value="MORNING">Matutino (Mañana 7:00-15:00)</option>
                  <option value="EVENING">Vespertino (Tarde 15:00-23:00)</option>
                  <option value="SUNDAY">Dominical (Domingo 8:00-18:00)</option>
                  <option value="MIXED">Mixto (Intermedio 11:00-19:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contraseña */}
          <div className="form-group-field">
            <label className="form-label-text" htmlFor="reg-password">
              Contraseña *
            </label>
            <div className="input-field-wrapper">
              <span className="input-field-icon">
                <Lock size={18} />
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input-element has-toggle"
                placeholder="Crea una contraseña segura"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="register-error-banner" role="alert">
              <AlertCircle size={18} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="register-submit-btn"
            className="register-action-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Registrando cuenta...</span>
              </>
            ) : (
              <>
                <span>Crear Mi Cuenta</span>
                <UserPlus size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="register-card-footer">
          <p className="login-prompt">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="login-link">
              Inicia sesión aquí
            </Link>
          </p>
          <div className="security-badge">
            <ShieldCheck size={14} className="emerald-icon" />
            <span>Registro oficial de empleados</span>
          </div>
        </div>
      </div>

      <style>{`
        .register-page-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background-color: #070b12;
          position: relative;
          overflow: hidden;
        }

        .bg-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        .bg-glow-center {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(140px);
          background: radial-gradient(circle, rgba(59, 130, 246, 0.22), transparent 70%);
          pointer-events: none;
        }

        .register-centered-card {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(59, 130, 246, 0.18);
          border-radius: 20px;
          padding: 36px 32px 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65),
                      0 0 30px rgba(59, 130, 246, 0.12);
          position: relative;
          z-index: 10;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #94a3b8;
          text-decoration: none;
          margin-bottom: 20px;
          transition: color 0.15s ease;
        }

        .back-link:hover {
          color: #60a5fa;
        }

        .register-brand-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .brand-icon-box {
          width: 52px;
          height: 52px;
          margin: 0 auto 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05));
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
        }

        .brand-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .brand-subtitle {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 480px) {
          .form-grid-2col {
            grid-template-columns: 1fr;
          }
        }

        .form-group-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label-text {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-field-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.15s ease;
        }

        .form-input-element,
        .form-select-element {
          width: 100%;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 11px 14px 11px 42px;
          font-size: 0.85rem;
          color: #f8fafc;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-select-element {
          appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%3C%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 38px;
        }

        .form-select-element option {
          background: #0f172a;
          color: #f8fafc;
        }

        .form-input-element.has-toggle {
          padding-right: 44px;
        }

        .form-input-element::placeholder {
          color: #475569;
        }

        .input-field-wrapper:focus-within .input-field-icon {
          color: #38bdf8;
        }

        .form-input-element:focus,
        .form-select-element:focus {
          border-color: #3b82f6;
          background: rgba(30, 41, 59, 0.95);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .toggle-password-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: color 0.15s ease;
        }

        .toggle-password-btn:hover {
          color: #f8fafc;
        }

        .register-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fb7185;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          line-height: 1.4;
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .register-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 13px 20px;
          font-size: 0.9rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
          margin-top: 6px;
        }

        .register-action-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.55);
          transform: translateY(-1px);
        }

        .register-action-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .register-action-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .register-card-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }

        .login-prompt {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0;
        }

        .login-link {
          color: #60a5fa;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .login-link:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.73rem;
          color: #64748b;
        }

        .emerald-icon {
          color: #10b981;
        }

        .spin-icon {
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
