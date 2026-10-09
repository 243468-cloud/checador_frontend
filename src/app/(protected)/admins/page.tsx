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
  const [searchQuery, setSearchQuery] = useState('');

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
        if (form.password && form.password.trim().length > 0) {
          if (form.password.trim().length < 6) {
            throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
          }
          await adminApi.changePassword(editTarget.id, form.password.trim());
        }
      } else {
        await adminApi.create({ username: form.username, password: form.password, fullName: form.fullName, email: form.email, branchId: Number(form.branchId) });
      }
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

  const filteredAdmins = admins.filter(a => 
    a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">Administradores</h1>
            <p className="page-subtitle">{admins.filter(a => a.active).length} administradores activos</p>
          </div>
          <button id="btn-new-admin" className="btn btn-primary" onClick={openCreate} style={{ padding: '12px 20px', borderRadius: '100px' }}>
            <Plus size={18} />
            <span style={{ display: 'none' }} className="sm:inline">Nuevo Admin</span>
          </button>
        </div>

        {/* Búsqueda Universal iOS Style */}
        <div className="mb-6" style={{ position: 'relative', maxWidth: 500 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por nombre o usuario..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 44, borderRadius: 16, background: '#ffffff', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
          />
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8e8e93' }}>
            <ShieldCheck size={18} />
          </div>
        </div>

        {loading ? (
          <div className="grid-3">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton" style={{ height: 140 }} /></div>)}</div>
        ) : filteredAdmins.length === 0 ? (
          <div className="empty-state">
            <p style={{ color: '#8e8e93', fontSize: '0.95rem' }}>No se encontraron administradores.</p>
          </div>
        ) : (
          <div className="grid-3 stagger">
            {filteredAdmins.map(admin => (
              <div 
                key={admin.id} 
                className="card animate-slide-up" 
                style={{ opacity: admin.active ? 1 : 0.55, cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => openEdit(admin)}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#007aff' }}>
                    {initials(admin.fullName)}
                  </div>
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{admin.fullName}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>@{admin.username}</p>
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
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-title">
                  <ShieldCheck size={20} color="#e11d48" />
                  <span>{editTarget ? 'Editar Admin' : 'Nuevo Administrador'}</span>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {!editTarget ? (
                    <>
                      <div className="form-group">
                        <label>Usuario *</label>
                        <input className="form-input" placeholder="Nombre de usuario" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Contraseña *</label>
                        <input type="password" className="form-input" placeholder="Contraseña segura" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Sucursal *</label>
                        <select className="form-select" value={form.branchId} onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))} required>
                          <option value="">Seleccionar sucursal...</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="form-group">
                      <label>Nueva Contraseña (opcional)</label>
                      <input type="password" className="form-input" placeholder="Mínimo 6 caracteres (dejar vacío para no cambiar)" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input className="form-input" placeholder="Nombre completo" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Correo</label>
                    <input type="email" className="form-input" placeholder="correo@empresa.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button type="submit" id="btn-save-admin" className="btn btn-primary btn-full flex items-center justify-center gap-2" disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Guardando...</> : (editTarget ? 'Guardar Cambios' : 'Crear Administrador')}
                  </button>
                  {editTarget && (
                    <button type="button" className="btn btn-ghost btn-full" style={{ color: editTarget.active ? '#ff3b30' : '#34c759' }} onClick={handleToggleActive}>
                      {editTarget.active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowModal(false)} style={{ color: '#8e8e93' }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
