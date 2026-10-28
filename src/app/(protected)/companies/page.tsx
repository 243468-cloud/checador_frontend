'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { settingsApi, registerCompany, TenantSettingsDTO, CompanyRegistrationData } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { Building2, Plus, Loader2, AlertCircle, Link as LinkIcon, ShieldCheck, Edit2, Palette, Image as ImageIcon, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AVAILABLE_MODULES = [
  { id: 'schedules', label: 'Horarios y Turnos' },
  { id: 'reports', label: 'Reportes y Exportación Excel' },
  { id: 'lateArrivals', label: 'Control de Retardos' },
  { id: 'rankings', label: 'Ranking & Recompensas' },
];

export default function CompaniesPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantSettingsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal de registro
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

  // Modal de edición de Branding e Íconos (Exclusivo Superusuario Maestro)
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
      setTenants(data);
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
      fetchTenants(); // Recargar lista
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
      activeModules: t.activeModules && t.activeModules.length > 0
        ? t.activeModules
        : ['schedules', 'reports', 'lateArrivals', 'rankings'],
    });
  };

  const toggleModule = (modId: string) => {
    setEditForm(prev => ({
      ...prev,
      activeModules: prev.activeModules.includes(modId)
        ? prev.activeModules.filter(m => m !== modId)
        : [...prev.activeModules, modId],
    }));
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingBranding(true);
    try {
      await settingsApi.updateTenantBranding(editTarget.tenantId, {
        companyName: editForm.companyName,
        primaryColor: editForm.primaryColor,
        logoUrl: editForm.logoUrl || null,
        iconUrl: editForm.iconUrl || null,
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

  if (!user || user.role !== 'SUPERUSER') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Building2 className="text-rose-600" />
              Gestión de Empresas (Perfil Maestro)
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Crea o cierra empresas, personaliza su ícono/logo/color y habilita módulos (Horarios, Reportes, Retardos).
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nueva Empresa
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={32} className="animate-spin text-rose-600" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">ID / Tenant</th>
                    <th className="px-6 py-4">Empresa & Ícono</th>
                    <th className="px-6 py-4">Slug / Enlaces</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones Maestro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">
                        #{t.id} <span className="text-gray-400">(Tenant {t.tenantId})</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: t.primaryColor || '#e11d48',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {t.iconUrl || t.logoUrl ? (
                              <img src={(t.iconUrl || t.logoUrl) ?? ''} alt={t.companyName} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
                            ) : (
                              <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>
                                {t.companyName?.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{t.companyName}</div>
                            <div className="text-xs text-gray-400">Color: {t.primaryColor || '#4F46E5'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-mono text-xs w-max">
                            {t.slug}
                          </span>
                          <div className="flex gap-2 mt-1">
                            <a href={`/${t.slug}/login`} target="_blank" className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium" title="Abrir Login">
                              <LinkIcon size={12} /> Login
                            </a>
                            <a href={`/${t.slug}/register`} target="_blank" className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-medium" title="Abrir Registro">
                              <LinkIcon size={12} /> Registro
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                          t.subscriptionStatus === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {t.subscriptionStatus || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEditModal(t)}
                          className="bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 size={14} />
                          Editar Ícono / Módulos / Estado
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No hay empresas registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Personalizar Empresa (Ícono, Logo, Color, Módulos, Estado) */}
        {editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Palette className="text-rose-600" size={20} />
                  Configurar Empresa: {editTarget.companyName}
                </h2>
                <button
                  onClick={() => setEditTarget(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBranding} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Nombre de la Empresa
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.companyName}
                      onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Estado de Suscripción
                    </label>
                    <select
                      value={editForm.subscriptionStatus}
                      onChange={e => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="ACTIVE">ACTIVA (Abierta)</option>
                      <option value="TRIAL">PRUEBA (Trial)</option>
                      <option value="SUSPENDED">SUSPENDIDA (Cerrada temporalmente)</option>
                      <option value="CANCELED">CANCELADA (Cerrada)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Color Principal (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editForm.primaryColor}
                        onChange={e => setEditForm({ ...editForm, primaryColor: e.target.value })}
                        className="h-9 w-12 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={editForm.primaryColor}
                        onChange={e => setEditForm({ ...editForm, primaryColor: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      URL del Logo (HTTPS PNG/JPG/WEBP)
                    </label>
                    <input
                      type="url"
                      value={editForm.logoUrl}
                      onChange={e => setEditForm({ ...editForm, logoUrl: e.target.value })}
                      placeholder="https://ejemplo.com/logo.png"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      URL del Ícono PWA / Pestaña (HTTPS PNG/JPG/WEBP)
                    </label>
                    <input
                      type="url"
                      value={editForm.iconUrl}
                      onChange={e => setEditForm({ ...editForm, iconUrl: e.target.value })}
                      placeholder="https://ejemplo.com/icono.png"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-rose-600" />
                    Módulos Habilitados para los Administradores de esta Empresa
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_MODULES.map(mod => (
                      <label
                        key={mod.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.activeModules.includes(mod.id)}
                          onChange={() => toggleModule(mod.id)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>{mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingBranding}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm disabled:opacity-50"
                  >
                    {savingBranding && <Loader2 size={16} className="animate-spin" />}
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nueva Empresa */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="text-rose-600" size={20} />
                  Alta de Nueva Empresa
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Nombre Empresa
                    </label>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={handleCompanyNameChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="Ej. Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Slug (URL)
                    </label>
                    <input
                      type="text"
                      required
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="acme-corp"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 pb-1 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-500"/>
                      Datos del Administrador Principal
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={form.adminFullName}
                      onChange={e => setForm({ ...form, adminFullName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={form.adminEmail}
                      onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="admin@acme.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={form.adminUsername}
                      onChange={e => setForm({ ...form, adminUsername: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Contraseña
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={form.adminPassword}
                      onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="Contraseña segura"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Crear Empresa
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
