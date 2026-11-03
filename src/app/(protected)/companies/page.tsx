'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { settingsApi, registerCompany, TenantSettingsDTO, CompanyRegistrationData } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ImageUploadField from '@/components/ImageUploadField';
import {
  Building2,
  Plus,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Edit3,
  Palette,
  CheckSquare,
  X,
  Check,
  Copy,
} from 'lucide-react';

const AVAILABLE_MODULES = [
  { id: 'schedules', label: 'Horarios y Turnos' },
  { id: 'reports', label: 'Reportes y Exportación Excel' },
  { id: 'lateArrivals', label: 'Control de Retardos' },
  { id: 'rankings', label: 'Ranking & Recompensas' },
];

const PRESET_COLORS = [
  { name: 'Rojo Carmesí', hex: '#e11d48' },
  { name: 'Naranja Ámbar', hex: '#d97706' },
  { name: 'Azul Índigo', hex: '#4f46e5' },
  { name: 'Azul Océano', hex: '#0284c7' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Morado Real', hex: '#7c3aed' },
  { name: 'Rosa Fucsia', hex: '#db2777' },
  { name: 'Pizarra Oscuro', hex: '#0f172a' },
];

export default function CompaniesPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantSettingsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modal de registro de nueva empresa
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CompanyRegistrationData>({
    companyName: '',
    slug: '',
    adminFullName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
  });

  // Modal de edición de Branding e Íconos
  const [editTarget, setEditTarget] = useState<TenantSettingsDTO | null>(null);
  const [editForm, setEditForm] = useState({
    companyName: '',
    primaryColor: '#e11d48',
    logoUrl: '',
    iconUrl: '',
    subscriptionStatus: 'ACTIVE',
    activeModules: ['schedules', 'reports', 'lateArrivals', 'rankings'] as string[],
  });
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getAllTenants();
      // Filtrar solo empresas reales (tenantId > 0)
      setTenants(data.filter((t) => t.tenantId > 0));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerCompany(form);
      setShowModal(false);
      setForm({
        companyName: '',
        slug: '',
        adminFullName: '',
        adminUsername: '',
        adminEmail: '',
        adminPassword: '',
      });
      fetchTenants();
    } catch (err: any) {
      alert(err.message || 'Error al crear la empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (t: TenantSettingsDTO) => {
    setEditTarget(t);
    setEditForm({
      companyName: t.companyName || '',
      primaryColor: t.primaryColor || '#e11d48',
      logoUrl: t.logoUrl || '',
      iconUrl: t.iconUrl || '',
      subscriptionStatus: t.subscriptionStatus || 'ACTIVE',
      activeModules:
        t.activeModules && t.activeModules.length > 0
          ? t.activeModules
          : ['schedules', 'reports', 'lateArrivals', 'rankings'],
    });
  };

  const toggleModule = (modId: string) => {
    setEditForm((prev) => ({
      ...prev,
      activeModules: prev.activeModules.includes(modId)
        ? prev.activeModules.filter((m) => m !== modId)
        : [...prev.activeModules, modId],
    }));
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingBranding(true);
    try {
      const finalLogo = editForm.logoUrl.trim();
      const finalIcon = (editForm.iconUrl.trim() || finalLogo) || null;

      await settingsApi.updateTenantBranding(editTarget.tenantId, {
        companyName: editForm.companyName.trim(),
        primaryColor: editForm.primaryColor,
        logoUrl: finalLogo || null,
        iconUrl: finalIcon,
        subscriptionStatus: editForm.subscriptionStatus,
      });
      await settingsApi.updateTenantModules(editTarget.tenantId, editForm.activeModules);
      setEditTarget(null);
      fetchTenants();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar configuración de la empresa');
    } finally {
      setSavingBranding(false);
    }
  };

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSlug(key);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (!user || user.role !== 'SUPERUSER') {
    return <div className="p-6 text-center text-red-500 font-bold">Acceso denegado</div>;
  }

  const getOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://checador-frontend.vercel.app';
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        {/* Encabezado */}
        <div className="page-header mb-6">
          <div style={{ flex: 1 }}>
            <h1 className="page-title flex items-center gap-2.5">
              <Building2 size={24} style={{ color: 'var(--color-primary, #e11d48)' }} />
              <span>Logos y Matrices de Empresas</span>
            </h1>
            <p className="page-subtitle">
              Sube el logo de cada empresa (desde celular o lap en Base64), elige sus colores y administra sus links de acceso.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center gap-2"
            style={{
              padding: '12px 22px',
              borderRadius: '100px',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)',
            }}
          >
            <Plus size={18} />
            <span>Nueva Empresa</span>
          </button>
        </div>

        {error && (
          <div className="alert alert-danger flex items-center gap-3 mb-6" style={{ borderRadius: 16 }}>
            <AlertCircle size={20} />
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 180 }} />
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="empty-state">
            <Building2 size={44} color="#8e8e93" />
            <p style={{ marginTop: 12, color: '#64748b' }}>No hay empresas registradas aún.</p>
            <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
              Crear primera empresa
            </button>
          </div>
        ) : (
          /* Tarjetas modernas de cada Matriz */
          <div className="grid-2 stagger" style={{ gap: '20px' }}>
            {tenants.map((t) => {
              const brandColor = t.primaryColor || '#e11d48';
              const logo = t.logoUrl || t.iconUrl || null;
              const loginLink = `${getOrigin()}/${t.slug}/login`;
              const regLink = `${getOrigin()}/${t.slug}/register`;
              const isLoginCopied = copiedSlug === `login-${t.id}`;
              const isRegCopied = copiedSlug === `reg-${t.id}`;

              return (
                <div
                  key={t.id}
                  className="card animate-slide-up"
                  style={{
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: '16px',
                            background: logo ? '#ffffff' : brandColor,
                            border: logo ? '1.5px solid #e2e8f0' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={t.companyName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                            />
                          ) : (
                            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.3rem' }}>
                              {(t.companyName || 'EM').substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                              {t.companyName}
                            </h3>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '100px',
                                background: '#f1f5f9',
                                color: '#475569',
                              }}
                            >
                              Tenant #{t.tenantId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: brandColor,
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                              Color: <strong style={{ color: brandColor }}>{brandColor}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '100px',
                          background: t.subscriptionStatus === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: t.subscriptionStatus === 'ACTIVE' ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {t.subscriptionStatus === 'ACTIVE' ? 'ACTIVA' : t.subscriptionStatus || 'ACTIVA'}
                      </span>
                    </div>

                    {/* Enlaces de Login y Registro */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 14,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Acceso de Login:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyUrl(loginLink, `login-${t.id}`)}
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#0284c7', gap: 4 }}
                          >
                            {isLoginCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isLoginCopied ? 'Copiado' : 'Copiar'}</span>
                          </button>
                          <a
                            href={`/${t.slug}/login`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: brandColor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              textDecoration: 'none',
                            }}
                          >
                            <span>Abrir</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Registro de Empleados:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyUrl(regLink, `reg-${t.id}`)}
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#16a34a', gap: 4 }}
                          >
                            {isRegCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isRegCopied ? 'Copiado' : 'Copiar'}</span>
                          </button>
                          <a
                            href={`/${t.slug}/register`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              textDecoration: 'none',
                            }}
                          >
                            <span>Abrir</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón de acción destacado */}
                  <button
                    onClick={() => openEditModal(t)}
                    className="btn btn-primary flex items-center justify-center gap-2"
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '11px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      width: '100%',
                    }}
                  >
                    <Edit3 size={15} />
                    <span>Cambiar Logo, Color y Módulos</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Editar Logo / Branding / Módulos */}
        {editTarget && (
          <div className="modal-overlay" onClick={() => setEditTarget(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-title">
                  <Palette size={20} color="var(--color-primary, #e11d48)" />
                  <span>Configurar Logo y Diseño: {editTarget.companyName}</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px' }}
                  onClick={() => setEditTarget(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBranding}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Subida de Logo en Base64 */}
                  <ImageUploadField
                    label="Logo de la Empresa (para la pantalla de Login y Navegación)"
                    value={editForm.logoUrl}
                    onChange={(val) => setEditForm((p) => ({ ...p, logoUrl: val }))}
                    primaryColor={editForm.primaryColor}
                    companyName={editForm.companyName}
                    helperText="Puedes subir una imagen desde tu celular o laptop. Se convertirá automáticamente en Base64 sin usar servidores externos."
                  />

                  {/* Nombre y Estado */}
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nombre de la Empresa *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={editForm.companyName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, companyName: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Estado de Suscripción</label>
                      <select
                        className="form-select"
                        value={editForm.subscriptionStatus}
                        onChange={(e) =>
                          setEditForm({ ...editForm, subscriptionStatus: e.target.value })
                        }
                      >
                        <option value="ACTIVE">ACTIVA</option>
                        <option value="TRIAL">PRUEBA</option>
                        <option value="SUSPENDED">SUSPENDIDA</option>
                        <option value="CANCELED">CANCELADA</option>
                      </select>
                    </div>
                  </div>

                  {/* Color Principal */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                      Color de la Marca y Botón de Inicio de Sesión
                    </label>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {PRESET_COLORS.map((pc) => (
                        <button
                          key={pc.hex}
                          type="button"
                          onClick={() => setEditForm((p) => ({ ...p, primaryColor: pc.hex }))}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: pc.hex,
                            border:
                              editForm.primaryColor.toLowerCase() === pc.hex.toLowerCase()
                                ? '3px solid #0f172a'
                                : '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                          title={pc.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={editForm.primaryColor}
                        onChange={(e) =>
                          setEditForm({ ...editForm, primaryColor: e.target.value })
                        }
                        style={{
                          width: 32,
                          height: 30,
                          padding: 0,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: 'transparent',
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.primaryColor}
                        onChange={(e) =>
                          setEditForm({ ...editForm, primaryColor: e.target.value })
                        }
                        style={{ width: 110, padding: '6px 10px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  {/* Módulos Habilitados */}
                  <div style={{ paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckSquare size={15} color="#e11d48" />
                      <span>Módulos Activos para los Administradores</span>
                    </label>
                    <div className="grid-2" style={{ gap: 8 }}>
                      {AVAILABLE_MODULES.map((mod) => (
                        <label
                          key={mod.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.activeModules.includes(mod.id)}
                            onChange={() => toggleModule(mod.id)}
                            style={{ accentColor: '#e11d48' }}
                          />
                          <span>{mod.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={savingBranding}
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                  >
                    {savingBranding ? (
                      <>
                        <Loader2 size={16} className="spin-icon" /> Guardando...
                      </>
                    ) : (
                      'Guardar Logo y Cambios'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-full"
                    onClick={() => setEditTarget(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Alta de Nueva Empresa */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div
              className="modal-card"
              style={{ maxWidth: 640 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-title">
                  <Building2 size={20} color="#e11d48" />
                  <span>Alta de Nueva Empresa / Matriz</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px' }}
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Nombre de la Empresa *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Ej. Acme Gourmet"
                        value={form.companyName}
                        onChange={handleCompanyNameChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Slug de Acceso (URL) *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="acme-gourmet"
                        value={form.slug}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                          })
                        }
                      />
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Acceso será: /{form.slug || 'nombre'}/login
                      </span>
                    </div>
                  </div>

                  <div style={{ margin: '14px 0 10px', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-1.5" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                      <ShieldCheck size={16} color="#10b981" />
                      <span>Administrador Principal de la Empresa</span>
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label>Nombre Completo *</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Juan Pérez"
                          value={form.adminFullName}
                          onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Correo Electrónico *</label>
                        <input
                          type="email"
                          required
                          className="form-input"
                          placeholder="admin@empresa.com"
                          value={form.adminEmail}
                          onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Usuario *</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="admin.usuario"
                          value={form.adminUsername}
                          onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Contraseña *</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          className="form-input"
                          placeholder="Mínimo 6 caracteres"
                          value={form.adminPassword}
                          onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spin-icon" /> Creando...
                      </>
                    ) : (
                      'Crear Empresa'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-full"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
