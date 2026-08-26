'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Clock,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import InstallPwaCard from '@/components/InstallPwaCard';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password.trim());
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Background elements */}
      <div className="bg-glow bg-glow-center" />
      <div className="bg-grid-overlay" />

      <div className="login-centered-card animate-slide-up">
        {/* Brand logo & title */}
        <div className="login-brand-header">
          <div className="brand-logo-img-container" style={{ background: '#ffffff', padding: '8px', borderRadius: '16px', width: '130px', margin: '0 auto 12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <img src="/logo.png" alt="Vía Gourmet Restaurante" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <h1 className="brand-title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>Checador de Asistencia</h1>
          <p className="brand-subtitle">Control de Asistencia & Turnos — Vía Gourmet</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group-field">
            <label className="form-label-text" htmlFor="username">
              Usuario
            </label>
            <div className="input-field-wrapper">
              <span className="input-field-icon">
                <User size={18} />
              </span>
              <input
                id="username"
                type="text"
                className="form-input-element"
                placeholder="Ingresa tu nombre de usuario"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group-field">
            <label className="form-label-text" htmlFor="password">
              Contraseña
            </label>
            <div className="input-field-wrapper">
              <span className="input-field-icon">
                <Lock size={18} />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input-element has-toggle"
                placeholder="Ingresa tu contraseña"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
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
            <div className="login-error-banner" role="alert">
              <AlertCircle size={18} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="login-btn"
            className="login-action-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-card-footer">
          <p className="register-prompt">
            ¿Eres un empleado nuevo?{' '}
            <Link href="/register" className="register-link">
              Regístrate aquí
            </Link>
          </p>
          <div className="security-badge">
            <ShieldCheck size={14} className="emerald-icon" />
            <span>Acceso seguro al sistema empresarial</span>
          </div>

          <InstallPwaCard />
        </div>
      </div>

      <style>{`
        .login-page-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background-color: #faf8f5;
          position: relative;
          overflow: hidden;
        }

        .bg-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        .bg-glow-center {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(140px);
          background: radial-gradient(circle, rgba(225, 29, 72, 0.12), rgba(217, 119, 6, 0.08) 70%);
          pointer-events: none;
        }

        .login-centered-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(225, 29, 72, 0.15);
          border-radius: 20px;
          padding: 44px 36px 32px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.06),
                      0 0 20px rgba(225, 29, 72, 0.08);
          position: relative;
          z-index: 10;
        }

        .login-brand-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-icon-box {
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.2), rgba(225, 29, 72, 0.05));
          border: 1px solid rgba(225, 29, 72, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a !important;
          letter-spacing: -0.5px;
          margin: 0;
          font-family: var(--font-montserrat, 'Montserrat'), sans-serif;
        }

        .brand-subtitle {
          font-size: 0.82rem;
          color: #475569 !important;
          margin-top: 4px;
          font-weight: 600;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label-text {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569 !important;
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-field-icon {
          position: absolute;
          left: 14px;
          color: #e11d48 !important;
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.15s ease;
        }

        .form-input-element {
          width: 100%;
          background: #fdfbf7 !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px;
          padding: 13px 14px 13px 42px;
          font-size: 0.88rem;
          color: #0f172a !important;
          font-weight: 600;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input-element.has-toggle {
          padding-right: 44px;
        }

        .form-input-element::placeholder {
          color: #94a3b8 !important;
          font-weight: 500;
        }

        .input-field-wrapper:focus-within .input-field-icon {
          color: #e11d48 !important;
        }

        .form-input-element:focus {
          border-color: #e11d48 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.12) !important;
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
          color: #0f172a;
        }

        .login-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(225, 29, 72, 0.1);
          border: 1px solid rgba(225, 29, 72, 0.25);
          color: #e11d48;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .login-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #e11d48, #be123c) !important;
          color: #ffffff !important;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 0.92rem;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(225, 29, 72, 0.35) !important;
          margin-top: 4px;
        }

        .login-action-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #f43f5e, #e11d48) !important;
          box-shadow: 0 8px 24px rgba(225, 29, 72, 0.5) !important;
          transform: translateY(-1px);
        }

        .login-action-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-action-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-card-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #f1ece1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .register-prompt {
          font-size: 0.82rem;
          color: #475569 !important;
          margin: 0;
          font-weight: 600;
        }

        .register-link {
          color: #e11d48 !important;
          font-weight: 800;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .register-link:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
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
