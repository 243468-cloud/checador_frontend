'use client';

import { useEffect, useState } from 'react';
import { adminApi, branchApi, Employee, Branch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Ban,
  Check,
  Building2,
  Mail,
  X,
  Loader2,
} from 'lucide-react';

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', branchId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.getAll(), branchApi.getAll()])
      .then(([a, b]) => { setAdmins(a); setBranches(b); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ username: '', password: '', fullName: '', email: '', branchId: branches[0]?.id ? String(branches[0].id) : '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (a: Employee) => {
    setEditTarget(a);
    setForm({ username: a.username, password: '', fullName: a.fullName, email: a.email, branchId: String(a.branchId) });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await adminApi.update(editTarget.id, { fullName: form.fullName, email: form.email });
      } else {
        await adminApi.create({ username: form.username, password: form.password, fullName: form.fullName, email: form.email, branchId: Number(form.branchId) });
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Administradores</h1>
            <p className="page-subtitle">{admins.filter(a => a.active).length} administradores activos</p>
          </div>
          <button id="btn-new-admin" className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={16} />
            <span>Nuevo Administrador</span>
          </button>
        </div>

        {loading ? (
          <div className="grid-3">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton" style={{ height: 140 }} /></div>)}</div>
        ) : (
          <div className="grid-3 stagger">
            {admins.map(admin => (
              <div key={admin.id} className="card animate-slide-up" style={{ opacity: admin.active ? 1 : 0.55 }}>
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {initials(admin.fullName)}
                  </div>
                  <div className="flex gap-2">
                    <button id={`btn-edit-admin-${admin.id}`} className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(admin)} title="Editar"><Edit2 size={14} /></button>
                    <button id={`btn-toggle-admin-${admin.id}`} className="btn btn-ghost btn-icon btn-sm" onClick={async () => { await adminApi.toggleActive(admin.id); load(); }} title={admin.active ? 'Desactivar' : 'Activar'}>
                      {admin.active ? <Ban size={14} /> : <Check size={14} />}
                    </button>
                  </div>
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{admin.fullName}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)', marginBottom: 12 }}>@{admin.username}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="badge badge-primary flex items-center gap-1">
                    <Building2 size={12} />
                    <span>{admin.branchName || 'Sin sucursal'}</span>
                  </span>
                  <span className={`badge ${admin.active ? 'badge-success' : 'badge-muted'}`}>{admin.active ? 'Activo' : 'Inactivo'}</span>
                </div>
                {admin.email && (
                  <p className="flex items-center gap-2" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
                    <Mail size={13} />
                    <span>{admin.email}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editTarget ? 'Editar Admin' : 'Nuevo Administrador'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {!editTarget && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Usuario *</label>
                      <input className="form-input" placeholder="Nombre de usuario" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña *</label>
                      <input type="password" className="form-input" placeholder="Contraseña segura" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sucursal *</label>
                      <select className="form-select" value={form.branchId} onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))} required>
                        <option value="">Seleccionar sucursal...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input className="form-input" placeholder="Nombre completo" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo</label>
                  <input type="email" className="form-input" placeholder="correo@empresa.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="flex gap-3" style={{ marginTop: 4 }}>
                  <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" id="btn-save-admin" className="btn btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Guardando...</> : (editTarget ? 'Actualizar' : 'Crear Admin')}
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
