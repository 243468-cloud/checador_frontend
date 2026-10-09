'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { settingsApi, registerCompany, TenantSettingsDTO, CompanyRegistrationData } from '@/lib/api';
import { Building2, Plus, Loader2, AlertCircle, Link as LinkIcon, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  if (!user || user.role !== 'SUPERUSER') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-rose-600" />
            Gestión de Empresas (Tenants)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualiza y da de alta nuevos clientes en el sistema SaaS.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nueva Empresa
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
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
                  <th className="px-6 py-4">ID / Tenant ID</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Slug (URL)</th>
                  <th className="px-6 py-4">Suscripción</th>
                  <th className="px-6 py-4">Fecha Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      #{t.id} <span className="text-gray-400">({t.tenantId})</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {t.companyName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-mono text-xs">
                        {t.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        t.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        t.subscriptionStatus === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {t.createdAt ? format(new Date(t.createdAt), "d 'de' MMMM, yyyy", { locale: es }) : 'N/A'}
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
    </div>
  );
}
