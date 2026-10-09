'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { settingsApi, TenantSettingsDTO } from '@/lib/api';
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

export default function TenantLoginPage({ params }: { params: { slug: string } }) {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [tenantInfo, setTenantInfo] = useState<TenantSettingsDTO | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  useEffect(() => {
    // Cargar información pública del tenant
    settingsApi.getPublicSettings(params.slug)
      .then(data => setTenantInfo(data))
      .catch(err => {
        // Fallback genérico o manejar error si no existe
      })
      .finally(() => setTenantLoading(false));
  }, [params.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // El login sigue siendo el mismo, enviando username y password
      // Al hacer login, el JWT en la base de datos se asociará al username
      await login(form.username.trim(), form.password.trim());
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return <div className="login-page-container flex justify-center items-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="login-page-container">
      <div className="login-centered-card animate-slide-up">
        {/* Brand logo & title */}
        <div className="login-brand-header">
          <div className="brand-logo-img-container">
            {tenantInfo ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xl">
                {tenantInfo.companyName.substring(0,2).toUpperCase()}
              </div>
            ) : (
              <img src="/logo.png" alt="Logo" />
            )}
          </div>
          <h1 className="brand-title">{tenantInfo ? tenantInfo.companyName : 'Checador de Asistencia'}</h1>
          <p className="brand-subtitle">Control de Asistencia & Turnos</p>
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
          <p className="register-prompt" style={{ marginTop: '-8px' }}>
            ¿Quieres registrar tu empresa?{' '}
            <Link href="/registro-empresa" className="register-link" style={{ color: '#ff2d55' }}>
              Comienza aquí
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
          background-color: #f2f2f7;
          font-family: var(--font-inter, sans-serif);
        }

        .login-centered-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 24px;
          padding: 40px 32px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
        }

        .login-brand-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-logo-img-container {
          width: 80px;
          height: 80px;
          margin: 0 auto 16px;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .brand-logo-img-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .brand-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #000000;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .brand-subtitle {
          font-size: 0.85rem;
          color: #8e8e93;
          margin-top: 4px;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group-field {
          display: flex;
          flex-direction: column;
        }

        .form-label-text {
          display: none; /* Hide labels for minimalist look, relying on placeholders */
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-field-icon {
          position: absolute;
          left: 16px;
          color: #8e8e93;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .form-input-element {
          width: 100%;
          background: #f2f2f7;
          border: 1px solid transparent;
          border-radius: 14px;
          padding: 16px 16px 16px 44px;
          font-size: 1rem;
          color: #000000;
          font-weight: 500;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input-element.has-toggle {
          padding-right: 44px;
        }

        .form-input-element::placeholder {
          color: #8e8e93;
          font-weight: 400;
        }

        .form-input-element:focus {
          background: #ffffff;
          border-color: #007aff;
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
        }

        .input-field-wrapper:focus-within .input-field-icon {
          color: #007aff;
        }

        .toggle-password-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #8e8e93;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
        }

        .login-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 59, 48, 0.1);
          color: #ff3b30;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .error-icon {
          flex-shrink: 0;
        }

        .login-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ff2d55;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 16px;
          font-size: 1.05rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s ease;
          margin-top: 8px;
        }

        .login-action-btn:hover:not(:disabled) {
          background: #ff375f;
        }

        .login-action-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .login-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-card-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }

        .register-prompt {
          font-size: 0.85rem;
          color: #8e8e93;
          margin: 0;
        }

        .register-link {
          color: #007aff;
          font-weight: 500;
          text-decoration: none;
        }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #8e8e93;
        }

        .emerald-icon {
          color: #34c759;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
