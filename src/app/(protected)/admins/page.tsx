'use client';

import { useEffect, useState } from 'react';
import { adminApi, branchApi, Employee, Branch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  ShieldCheck,
  Plus,
  Building2,
  Mail,
  X,
  Loader2,
  Crown,
} from 'lucide-react';

export default function AdminsPage() {
  const [superusers, setSuperusers] = useState<Employee[]>([]);
  const [admins, setAdmins] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<'SUPERUSERS' | 'ADMINS'>('SUPERUSERS');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'SUPERUSER' | 'ADMIN'>('SUPERUSER');
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    branchId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.getSuperusers().catch(() => []),
      adminApi.getAll().catch(() => []),
      branchApi.getAll().catch(() => []),
    ])
      .then(([sList, aList, bList]) => {
        setSuperusers(sList);
        setAdmins(aList);
        setBranches(bList);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateSuperuser = () => {
    setEditTarget(null);
    setModalMode('SUPERUSER');
    setForm({ username: '', password: '', fullName: '', email: '', branchId: '' });
    setError('');
    setShowModal(true);
  };

  const openCreateBranchAdmin = () => {
    setEditTarget(null);
    setModalMode('ADMIN');
    setForm({
      username: '',
      password: '',
      fullName: '',
      email: '',
      branchId: branches[0]?.id ? String(branches[0].id) : '',
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (target: Employee, mode: 'SUPERUSER' | 'ADMIN') => {
    setEditTarget(target);
    setModalMode(mode);
    setForm({
      username: target.username,
      password: '',
      fullName: target.fullName,
      email: target.email || '',
      branchId: String(target.branchId || ''),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await adminApi.update(editTarget.id, {
          fullName: form.fullName,
          email: form.email,
        });
        if (form.password && form.password.trim().length > 0) {
          if (form.password.trim().length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
          }
          await adminApi.changePassword(editTarget.id, form.password.trim());
        }
      } else if (modalMode === 'SUPERUSER') {
        await adminApi.createSuperuser({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email,
        });
      } else {
        await adminApi.create({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email,
          branchId: Number(form.branchId),
        });
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!editTarget) return;
    await adminApi.toggleActive(editTarget.id);
    setShowModal(false);
    load();
  };

  const currentList = activeTab === 'SUPERUSERS' ? superusers : admins;
  const filteredList = currentList.filter(
    (item) =>
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email && item.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const initials = (name: string) =>
    (name || 'SA')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">Perfiles de Super Administradores</h1>
            <p className="page-subtitle">
              Edita perfiles maestros, cambia contraseñas o gestiona administradores de sucursales
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'SUPERUSERS' ? (
              <button
                id="btn-new-superadmin"
                className="btn btn-primary"
                onClick={openCreateSuperuser}
                style={{ padding: '12px 20px', borderRadius: '100px' }}
              >
                <Plus size={18} />
                <span>Nuevo Super Administrador</span>
              </button>
            ) : (
              <button
                id="btn-new-admin"
                className="btn btn-primary"
                onClick={openCreateBranchAdmin}
                style={{ padding: '12px 20px', borderRadius: '100px' }}
              >
                <Plus size={18} />
                <span>Nuevo Admin de Sucursal</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('SUPERUSERS')}
            className={`btn ${activeTab === 'SUPERUSERS' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: '100px',
              padding: '10px 18px',
              background: activeTab === 'SUPERUSERS' ? undefined : '#ffffff',
            }}
          >
            <Crown size={16} />
            <span>Super Administradores ({superusers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ADMINS')}
            className={`btn ${activeTab === 'ADMINS' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: '100px',
              padding: '10px 18px',
              background: activeTab === 'ADMINS' ? undefined : '#ffffff',
            }}
          >
            <ShieldCheck size={16} />
            <span>Administradores de Sucursal ({admins.length})</span>
          </button>
        </div>

        {/* Búsqueda Universal iOS Style */}
        <div className="mb-6" style={{ position: 'relative', maxWidth: 500 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar perfil por nombre, usuario o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 44,
              borderRadius: 16,
              background: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8e8e93',
            }}
          >
            <ShieldCheck size={18} />
          </div>
        </div>

        {loading ? (
          <div className="grid-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 140 }} />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state">
            <p style={{ color: '#8e8e93', fontSize: '0.95rem' }}>
              No se encontraron perfiles en esta sección.
            </p>
          </div>
        ) : (
          <div className="grid-3 stagger">
            {filteredList.map((profile) => {
              const isSuper = activeTab === 'SUPERUSERS';
              return (
                <div
                  key={profile.id}
                  className="card animate-slide-up"
                  style={{
                    opacity: profile.active ? 1 : 0.55,
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                  onClick={() => openEdit(profile, isSuper ? 'SUPERUSER' : 'ADMIN')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '16px',
                        background: isSuper
                          ? 'rgba(139, 92, 246, 0.12)'
                          : 'rgba(0, 122, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 700,
                        color: isSuper ? '#7c3aed' : '#007aff',
                      }}
                    >
                      {initials(profile.fullName)}
                    </div>
                    <span
                      className={`badge ${profile.active ? 'badge-success' : 'badge-muted'}`}
                    >
                      {profile.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{profile.fullName}</h3>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: 12,
                    }}
                  >
                    @{profile.username}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {isSuper ? (
                      <span
                        className="badge flex items-center gap-1"
                        style={{ background: '#ede9fe', color: '#6d28d9' }}
                      >
                        <Crown size={12} />
                        <span>Super Administrador Maestro</span>
                      </span>
                    ) : (
                      <span className="badge badge-primary flex items-center gap-1">
                        <Building2 size={12} />
                        <span>{profile.branchName || 'Sin sucursal'}</span>
                      </span>
                    )}
                  </div>
                  {profile.email && (
                    <p
                      className="flex items-center gap-2"
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted)',
                        marginTop: 12,
                      }}
                    >
                      <Mail size={13} />
                      <span>{profile.email}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-title">
                  <ShieldCheck size={20} color="#e11d48" />
                  <span>
                    {editTarget
                      ? `Editar Perfil: ${editTarget.fullName}`
                      : modalMode === 'SUPERUSER'
                      ? 'Nuevo Super Administrador'
                      : 'Nuevo Administrador de Sucursal'}
                  </span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px' }}
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {editTarget && (
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 12,
                        padding: '10px 12px',
                        marginBottom: 14,
                        fontSize: '0.82rem',
                        color: '#334155',
                      }}
                    >
                      <div>
                        <strong>Usuario de acceso:</strong> @{editTarget.username}
                      </div>
                      <div>
                        <strong>Rol:</strong>{' '}
                        {modalMode === 'SUPERUSER'
                          ? 'Super Administrador Maestro'
                          : `Admin (${editTarget.branchName || 'Sucursal'})`}
                      </div>
                    </div>
                  )}

                  {!editTarget ? (
                    <>
                      <div className="form-group">
                        <label>Usuario de Acceso *</label>
                        <input
                          className="form-input"
                          placeholder="Ej: marco.admin"
                          value={form.username}
                          onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Contraseña *</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Mínimo 6 caracteres"
                          value={form.password}
                          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                          required
                        />
                      </div>
                      {modalMode === 'ADMIN' && (
                        <div className="form-group">
                          <label>Sucursal *</label>
                          <select
                            className="form-select"
                            value={form.branchId}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, branchId: e.target.value }))
                            }
                            required
                          >
                            <option value="">Seleccionar sucursal...</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.companyName || 'Matriz'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="form-group">
                      <label>Cambiar Contraseña (opcional)</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Mínimo 6 caracteres (dejar vacío para mantener la actual)"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input
                      className="form-input"
                      placeholder="Nombre completo"
                      value={form.fullName}
                      onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="correo@empresa.com"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button
                    type="submit"
                    id="btn-save-admin"
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="spin-icon" /> Guardando...
                      </>
                    ) : editTarget ? (
                      'Guardar Cambios del Perfil'
                    ) : (
                      'Crear Perfil'
                    )}
                  </button>
                  {editTarget && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-full"
                      style={{ color: editTarget.active ? '#ff3b30' : '#34c759' }}
                      onClick={handleToggleActive}
                    >
                      {editTarget.active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-full"
                    onClick={() => setShowModal(false)}
                    style={{ color: '#8e8e93' }}
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
