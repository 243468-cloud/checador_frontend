'use client';

import { useEffect, useState } from 'react';
import { employeeApi, Employee, SHIFT_LABELS } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Ban,
  Check,
  Mail,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';

const SHIFTS = [
  { value: 'MORNING', label: 'Matutino (7:00–15:00)' },
  { value: 'EVENING', label: 'Vespertino (15:00–23:00)' },
  { value: 'SUNDAY',  label: 'Dominical (8:00–18:00)' },
  { value: 'MIXED',   label: 'Mixto (11:00–19:00)' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', shiftType: 'MORNING' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    employeeApi.getAll().then(setEmployees).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditTarget(null);
    setForm({ username: '', password: '', fullName: '', email: '', shiftType: 'MORNING' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({ username: emp.username, password: '', fullName: emp.fullName, email: emp.email, shiftType: emp.shiftType || 'MORNING' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await employeeApi.update(editTarget.id, { fullName: form.fullName, email: form.email, shiftType: form.shiftType as any });
      } else {
        await employeeApi.create({ username: form.username, password: form.password, fullName: form.fullName, email: form.email, shiftType: form.shiftType });
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    await employeeApi.toggleActive(emp.id);
    load();
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!confirm(`¿Estás seguro de eliminar PERMANENTEMENTE al empleado "${emp.fullName}" (@${emp.username}) y todos sus registros? Esta acción no se puede deshacer.`)) return;
    try {
      await employeeApi.delete(emp.id);
      load();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar empleado');
    }
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const shiftColors: Record<string, string> = { MORNING: '#6366f1', EVENING: '#f59e0b', SUNDAY: '#10b981' };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header flex-wrap gap-4">
          <div>
            <h1 className="page-title">Empleados</h1>
            <p className="page-subtitle">{employees.filter(e => e.active).length} empleados activos</p>
          </div>
          <div className="page-actions flex items-center gap-3 flex-wrap flex-1 max-w-lg justify-end">
            <div className="input-wrapper flex-1 min-w-[200px]" style={{ position: 'relative' }}>
              <span className="input-icon" style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-text-muted)', zIndex: 2 }}>
                <Search size={16} />
              </span>
              <input
                id="search-employees"
                type="text"
                className="form-input"
                placeholder="Buscar empleado..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>
            <button id="btn-new-employee" className="btn btn-primary flex items-center gap-2 flex-shrink-0" onClick={openCreate}>
              <Plus size={16} />
              <span>Nuevo Empleado</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card"><div className="skeleton" style={{ height: 120 }} /></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={40} /></div>
            <p>No se encontraron empleados</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Agregar primero</button>
          </div>
        ) : (
          <div className="grid-3 stagger">
            {filtered.map(emp => (
              <div key={emp.id} className="card animate-slide-up" style={{ opacity: emp.active ? 1 : 0.55 }}>
                <div className="flex items-start justify-between mb-4">
                  <div style={{
                    width: 46, height: 46,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${shiftColors[emp.shiftType] || '#2563eb'}, ${shiftColors[emp.shiftType] || '#0284c7'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, color: '#fff',
                    flexShrink: 0,
                  }}>
                    {initials(emp.fullName)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      id={`btn-edit-${emp.id}`}
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => openEdit(emp)}
                      title="Editar"
                    ><Edit2 size={14} /></button>
                    <button
                      id={`btn-toggle-${emp.id}`}
                      className={`btn btn-icon btn-sm ${emp.active ? 'btn-ghost' : 'btn-success'}`}
                      onClick={() => toggleActive(emp)}
                      title={emp.active ? 'Desactivar' : 'Activar'}
                    >{emp.active ? <Ban size={14} /> : <Check size={14} />}</button>
                    <button
                      id={`btn-delete-${emp.id}`}
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDeleteEmployee(emp)}
                      style={{ color: '#ef4444' }}
                      title="Eliminar empleado"
                    ><Trash2 size={14} /></button>
                  </div>
                </div>

                <h3 className="truncate" style={{ fontSize: '0.98rem', marginBottom: 2 }}>{emp.fullName}</h3>
                <p className="truncate" style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginBottom: 10 }}>@{emp.username}</p>

                <div className="flex gap-2 flex-wrap">
                  {emp.shiftType && (
                    <span className="badge badge-primary" style={{ background: `${shiftColors[emp.shiftType]}20`, color: shiftColors[emp.shiftType] }}>
                      {SHIFT_LABELS[emp.shiftType] || emp.shiftType}
                    </span>
                  )}
                  <span className={`badge ${emp.active ? 'badge-success' : 'badge-muted'}`}>
                    {emp.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {emp.email && (
                  <p className="flex items-center gap-2 truncate" style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
                    <Mail size={13} style={{ flexShrink: 0 }} />
                    <span className="truncate">{emp.email}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-title">
                  <Users size={20} color="#e11d48" />
                  <span>{editTarget ? 'Editar Empleado' : 'Nuevo Empleado'}</span>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {!editTarget && (
                    <>
                      <div className="form-group">
                        <label>Usuario *</label>
                        <input className="form-input" placeholder="Ej: jperez" value={form.username}
                          onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Contraseña *</label>
                        <input type="password" className="form-input" placeholder="Mínimo 6 caracteres" value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input className="form-input" placeholder="Ej: Juan Pérez García" value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input type="email" className="form-input" placeholder="Opcional" value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Turno *</label>
                    <select className="form-select" value={form.shiftType}
                      onChange={e => setForm(p => ({ ...p, shiftType: e.target.value }))}>
                      {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  {error && <div className="alert alert-danger">{error}</div>}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" id="btn-save-employee" className="btn btn-primary flex items-center gap-2" disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Guardando...</> : (editTarget ? 'Actualizar' : 'Crear Empleado')}
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
