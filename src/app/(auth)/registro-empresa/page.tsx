'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerCompany } from '@/lib/api';
import {
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
  Link as LinkIcon
} from 'lucide-react';

export default function RegisterCompanyPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    companyName: '',
    slug: '',
    adminFullName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-generar slug a partir del nombre de la empresa
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setForm((p) => ({ ...p, companyName: name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerCompany({
        companyName: form.companyName.trim(),
        slug: form.slug.trim(),
        adminFullName: form.adminFullName.trim(),
        adminUsername: form.adminUsername.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      });

      // Redirigir al login después del registro exitoso
      router.push('/login?registered=true&slug=' + form.slug.trim());
    } catch (err: any) {
      setError(err.message || 'Error al registrar la empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-container">
      <div className="bg-glow bg-glow-center" />
      <div className="bg-grid-overlay" />

      <div className="register-centered-card animate-slide-up" style={{ maxWidth: '600px' }}>
        <Link href="/login" className="back-link">
          <ArrowLeft size={16} />
          <span>Volver al Login</span>
        </Link>

        <div className="register-brand-header">
          <div className="brand-icon-box">
            <Building2 size={24} />
          </div>
          <h1 className="brand-title" style={{ fontSize: '1.35rem', fontWeight: 800 }}>Registra tu Empresa</h1>
          <p className="brand-subtitle">Crea tu propio panel de asistencia en segundos</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-grid-2col">
            {/* Empresa */}
            <div className="form-group-field">
              <label className="form-label-text">Nombre de Empresa *</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon"><Building2 size={18} /></span>
                <input
                  type="text"
                  className="form-input-element"
                  placeholder="Ej. Mi Empresa"
                  value={form.companyName}
                  onChange={handleCompanyNameChange}
                  required
                />
              </div>
            </div>

            {/* Slug */}
            <div className="form-group-field">
              <label className="form-label-text">Identificador URL (Slug) *</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon"><LinkIcon size={18} /></span>
                <input
                  type="text"
                  className="form-input-element"
                  placeholder="ej-mi-empresa"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2col">
            {/* Admin Full Name */}
            <div className="form-group-field">
              <label className="form-label-text">Tu Nombre Completo *</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon"><User size={18} /></span>
                <input
                  type="text"
                  className="form-input-element"
                  placeholder="Ej. Juan Pérez"
                  value={form.adminFullName}
                  onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Admin Email */}
            <div className="form-group-field">
              <label className="form-label-text">Tu Correo Electrónico *</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon"><Mail size={18} /></span>
                <input
                  type="email"
                  className="form-input-element"
                  placeholder="juan@empresa.com"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2col">
            {/* Admin Username */}
            <div className="form-group-field">
              <label className="form-label-text">Usuario Administrador *</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon"><User size={18} /></span>
                <input
                  type="text"
                  className="form-input-element"
                  placeholder="Ej. admin"
                  value={form.adminUsername}
                  onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group-field">
              <label className="form-label-text">Contraseña *</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input-element has-toggle"
                  placeholder="Crea una contraseña segura"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="register-error-banner" role="alert">
              <AlertCircle size={18} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="register-action-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Creando entorno...</span>
              </>
            ) : (
              <>
                <span>Crear Mi Empresa</span>
                <UserPlus size={18} />
              </>
            )}
          </button>
        </form>

        <div className="register-card-footer">
          <p className="login-prompt">
            ¿Ya tienes una cuenta de empresa?{' '}
            <Link href="/login" className="login-link">
              Inicia sesión aquí
            </Link>
          </p>
          <div className="security-badge">
            <ShieldCheck size={14} className="emerald-icon" />
            <span>Tus datos están protegidos y aislados</span>
          </div>
        </div>
      </div>

      <style>{`
        /* Reuse styles from register/page.tsx */
        .register-page-container { min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; background-color: #faf8f5; position: relative; overflow: hidden; }
        .bg-grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px); background-size: 36px 36px; pointer-events: none; }
        .bg-glow-center { position: absolute; width: 520px; height: 520px; border-radius: 50%; filter: blur(140px); background: radial-gradient(circle, rgba(225, 29, 72, 0.12), rgba(217, 119, 6, 0.08) 70%); pointer-events: none; }
        .register-centered-card { width: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(24px); border: 1px solid rgba(225, 29, 72, 0.15); border-radius: 20px; padding: 36px 32px 28px; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.06), 0 0 20px rgba(225, 29, 72, 0.08); position: relative; z-index: 10; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #94a3b8; text-decoration: none; margin-bottom: 20px; transition: color 0.15s ease; }
        .back-link:hover { color: #fb7185; }
        .register-brand-header { text-align: center; margin-bottom: 24px; }
        .brand-icon-box { width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 14px; background: linear-gradient(135deg, rgba(225, 29, 72, 0.2), rgba(225, 29, 72, 0.05)); border: 1px solid rgba(225, 29, 72, 0.3); color: #fb7185; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(225, 29, 72, 0.25); }
        .brand-title { font-size: 1.5rem; font-weight: 800; color: #0f172a !important; letter-spacing: -0.5px; margin: 0; }
        .brand-subtitle { font-size: 0.8rem; color: #475569 !important; margin-top: 4px; font-weight: 600; }
        .register-form { display: flex; flex-direction: column; gap: 16px; }
        .form-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 480px) { .form-grid-2col { grid-template-columns: 1fr; } }
        .form-group-field { display: flex; flex-direction: column; gap: 6px; }
        .form-label-text { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569 !important; }
        .input-field-wrapper { position: relative; display: flex; align-items: center; }
        .input-field-icon { position: absolute; left: 14px; color: #e11d48 !important; display: flex; align-items: center; pointer-events: none; }
        .form-input-element { width: 100%; background: #fdfbf7 !important; border: 1px solid #e2e8f0 !important; border-radius: 12px; padding: 11px 14px 11px 42px; font-size: 0.85rem; color: #0f172a !important; font-weight: 600; outline: none; transition: all 0.2s ease; }
        .form-input-element.has-toggle { padding-right: 44px; }
        .form-input-element::placeholder { color: #94a3b8 !important; font-weight: 500; }
        .form-input-element:focus { border-color: #e11d48 !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.12) !important; }
        .toggle-password-btn { position: absolute; right: 12px; background: transparent; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; padding: 6px; border-radius: 6px; }
        .toggle-password-btn:hover { color: #0f172a; }
        .register-error-banner { display: flex; align-items: flex-start; gap: 10px; background: rgba(225, 29, 72, 0.1); border: 1px solid rgba(225, 29, 72, 0.25); color: #e11d48; padding: 12px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 600; }
        .error-icon { flex-shrink: 0; margin-top: 1px; }
        .register-action-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, #e11d48, #be123c) !important; color: #ffffff !important; border: none; border-radius: 12px; padding: 13px 20px; font-size: 0.9rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(225, 29, 72, 0.35) !important; margin-top: 6px; }
        .register-action-btn:hover:not(:disabled) { background: linear-gradient(135deg, #f43f5e, #e11d48) !important; box-shadow: 0 8px 24px rgba(225, 29, 72, 0.5) !important; transform: translateY(-1px); }
        .register-action-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .register-card-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1ece1; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .login-prompt { font-size: 0.82rem; color: #475569 !important; margin: 0; font-weight: 600; }
        .login-link { color: #e11d48 !important; font-weight: 800; text-decoration: none; }
        .login-link:hover { text-decoration: underline; }
        .security-badge { display: flex; align-items: center; gap: 6px; font-size: 0.73rem; color: #64748b; }
        .emerald-icon { color: #10b981; }
        .spin-icon { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
