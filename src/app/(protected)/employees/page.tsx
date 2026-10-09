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
        if (form.password && form.password.trim().length > 0) {
          if (form.password.trim().length < 6) {
            throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
          }
          await employeeApi.changePassword(editTarget.id, form.password.trim());
        }
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
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">Empleados</h1>
            <p className="page-subtitle">{employees.filter(e => e.active).length} empleados activos</p>
          </div>
          <button id="btn-new-employee" className="btn btn-primary" onClick={openCreate} style={{ padding: '12px 20px', borderRadius: '100px' }}>
            <Plus size={18} />
            <span style={{ display: 'none' }} className="sm:inline">Nuevo Empleado</span>
          </button>
        </div>

        {/* Búsqueda Universal iOS Style */}
        <div className="mb-6" style={{ position: 'relative', maxWidth: 500 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por nombre o usuario..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44, borderRadius: 16, background: '#ffffff', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
          />
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8e8e93' }}>
            <Search size={18} />
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
              <div 
                key={emp.id} 
                className="card animate-slide-up" 
                style={{ opacity: emp.active ? 1 : 0.55, cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => openEdit(emp)}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: '16px',
                    background: `${shiftColors[emp.shiftType] || '#007aff'}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: shiftColors[emp.shiftType] || '#007aff',
                    flexShrink: 0,
                  }}>
                    {initials(emp.fullName)}
                  </div>
                </div>

                <h3 className="truncate" style={{ fontSize: '0.98rem', marginBottom: 2 }}>{emp.fullName}</h3>
                <p className="truncate" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>@{emp.username}</p>

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
                  {!editTarget ? (
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
                  ) : (
                    <div className="form-group">
                      <label>Nueva Contraseña (opcional)</label>
                      <input type="password" className="form-input" placeholder="Mínimo 6 caracteres (dejar vacío para no cambiar)" value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
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

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button type="submit" id="btn-save-employee" className="btn btn-primary btn-full flex items-center justify-center gap-2" disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Guardando...</> : (editTarget ? 'Guardar Cambios' : 'Crear Empleado')}
                  </button>
                  {editTarget && (
                    <>
                      <button type="button" className="btn btn-ghost btn-full" style={{ color: editTarget.active ? '#ff3b30' : '#34c759' }} onClick={() => toggleActive(editTarget).then(() => setShowModal(false))}>
                        {editTarget.active ? 'Desactivar Acceso' : 'Reactivar Acceso'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-full" style={{ color: '#ff3b30' }} onClick={() => handleDeleteEmployee(editTarget).then(() => setShowModal(false))}>
                        Eliminar Permanentemente
                      </button>
                    </>
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
