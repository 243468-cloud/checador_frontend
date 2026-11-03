'use client';

import { useEffect, useState } from 'react';
import { employeeApi, Employee, SHIFT_LABELS } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import {
  Users,
  Search,
  Plus,
  Building2,
  Mail,
  X,
  Loader2,
} from 'lucide-react';

const SHIFTS = [
  { value: 'MORNING', label: 'Matutino (7:00–15:00)' },
  { value: 'EVENING', label: 'Vespertino (15:00–23:00)' },
  { value: 'SUNDAY',  label: 'Dominical (8:00–18:00)' },
  { value: 'MIXED',   label: 'Mixto (11:00–19:00)' },
];

export default function EmployeesPage() {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'SUPERUSER';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', shiftType: 'MORNING' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    employeeApi.getAll().then(setEmployees).catch(() => setEmployees([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getEmpCompany = (emp: Employee) => {
    if (emp.companyName && emp.companyName !== 'Sin Empresa') return emp.companyName;
    if (emp.branchName?.toLowerCase().includes('miel') || emp.branchName?.toLowerCase().includes('selva')) {
      return 'Miel de la Selva Maya';
    }
    return 'Via Gourmet';
  };

  const uniqueCompanies = Array.from(new Set(employees.map(getEmpCompany)));
  const uniqueBranches = Array.from(
    new Set(
      employees
        .filter((e) => companyFilter === 'ALL' || getEmpCompany(e) === companyFilter)
        .map((e) => e.branchName || 'Matriz Principal')
    )
  );

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase()) ||
      (e.branchName && e.branchName.toLowerCase().includes(search.toLowerCase())) ||
      getEmpCompany(e).toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === 'ALL' || getEmpCompany(e) === companyFilter;
    const matchesBranch = branchFilter === 'ALL' || (e.branchName || 'Matriz Principal') === branchFilter;
    return matchesSearch && matchesCompany && matchesBranch;
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm({ username: '', password: '', fullName: '', email: '', shiftType: 'MORNING' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      username: emp.username,
      password: '',
      fullName: emp.fullName,
      email: emp.email || '',
      shiftType: emp.shiftType || 'MORNING',
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
        await employeeApi.update(editTarget.id, {
          fullName: form.fullName,
          email: form.email,
          shiftType: form.shiftType as any,
        });
        if (form.password && form.password.trim().length > 0) {
          if (form.password.trim().length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
          }
          await employeeApi.changePassword(editTarget.id, form.password.trim());
        }
      } else {
        await employeeApi.create({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email,
          shiftType: form.shiftType,
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

  const toggleActive = async (emp: Employee) => {
    await employeeApi.toggleActive(emp.id);
    load();
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar PERMANENTEMENTE al empleado "${emp.fullName}" (@${emp.username}) y todos sus registros? Esta acción no se puede deshacer.`
      )
    )
      return;
    try {
      await employeeApi.delete(emp.id);
      load();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar empleado');
    }
  };

  const initials = (name: string) =>
    (name || 'U')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  const shiftColors: Record<string, string> = {
    MORNING: '#6366f1',
    EVENING: '#f59e0b',
    SUNDAY: '#10b981',
    MIXED: '#ec4899',
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">
              {isSuperuser ? 'Empleados por Matriz y Sucursal' : 'Empleados'}
            </h1>
            <p className="page-subtitle">
              {employees.filter((e) => e.active).length} empleados activos en{' '}
              {uniqueCompanies.length || 1} {uniqueCompanies.length === 1 ? 'matriz' : 'matrices'}
            </p>
          </div>
          {!isSuperuser && (
            <button
              id="btn-new-employee"
              className="btn btn-primary"
              onClick={openCreate}
              style={{ padding: '12px 20px', borderRadius: '100px' }}
            >
              <Plus size={18} />
              <span>Nuevo Empleado</span>
            </button>
          )}
        </div>

        {/* Filtros por Matriz y Sucursal + Búsqueda */}
        <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative', maxWidth: 500 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre, usuario, matriz o sucursal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              <Search size={18} />
            </div>
          </div>

          {isSuperuser && uniqueCompanies.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginRight: 4 }}>
                Matriz:
              </span>
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter('ALL');
                  setBranchFilter('ALL');
                }}
                className={`btn ${companyFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  background: companyFilter === 'ALL' ? undefined : '#ffffff',
                }}
              >
                Todas ({employees.length})
              </button>
              {uniqueCompanies.map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => {
                    setCompanyFilter(comp);
                    setBranchFilter('ALL');
                  }}
                  className={`btn ${companyFilter === comp ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: '100px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    background: companyFilter === comp ? undefined : '#ffffff',
                  }}
                >
                  {comp} ({employees.filter((e) => getEmpCompany(e) === comp).length})
                </button>
              ))}
            </div>
          )}

          {isSuperuser && uniqueBranches.length > 1 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginRight: 4 }}>
                Sucursal:
              </span>
              <button
                type="button"
                onClick={() => setBranchFilter('ALL')}
                className={`btn ${branchFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: '100px',
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  background: branchFilter === 'ALL' ? undefined : '#ffffff',
                }}
              >
                Todas las sucursales
              </button>
              {uniqueBranches.map((br) => (
                <button
                  key={br}
                  type="button"
                  onClick={() => setBranchFilter(br)}
                  className={`btn ${branchFilter === br ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: '100px',
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    background: branchFilter === br ? undefined : '#ffffff',
                  }}
                >
                  {br}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 120 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={40} />
            </div>
            <p>No se encontraron empleados en esta matriz</p>
            {!isSuperuser && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                Agregar primero
              </button>
            )}
          </div>
        ) : (
          <div className="grid-3 stagger">
            {filtered.map((emp) => (
              <div
                key={emp.id}
                className="card animate-slide-up"
                style={{
                  opacity: emp.active ? 1 : 0.55,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                onClick={() => openEdit(emp)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      background: `${shiftColors[emp.shiftType] || '#007aff'}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 700,
                      color: shiftColors[emp.shiftType] || '#007aff',
                      flexShrink: 0,
                    }}
                  >
                    {initials(emp.fullName)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span
                      className="badge badge-primary flex items-center gap-1"
                      style={{ fontSize: '0.7rem' }}
                    >
                      <Building2 size={11} />
                      <span>{getEmpCompany(emp)}</span>
                    </span>
                    {emp.branchName && (
                      <span
                        className="badge badge-muted"
                        style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#475569' }}
                      >
                        Sucursal: {emp.branchName}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="truncate" style={{ fontSize: '0.98rem', marginBottom: 2 }}>
                  {emp.fullName}
                </h3>
                <p
                  className="truncate"
                  style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 10 }}
                >
                  @{emp.username}
                </p>

                <div className="flex gap-2 flex-wrap">
                  {emp.shiftType && (
                    <span
                      className="badge badge-primary"
                      style={{
                        background: `${shiftColors[emp.shiftType] || '#6366f1'}20`,
                        color: shiftColors[emp.shiftType] || '#6366f1',
                      }}
                    >
                      {SHIFT_LABELS[emp.shiftType] || emp.shiftType}
                    </span>
                  )}
                  <span className={`badge ${emp.active ? 'badge-success' : 'badge-muted'}`}>
                    {emp.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {emp.email && (
                  <p
                    className="flex items-center gap-2 truncate"
                    style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: 12 }}
                  >
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
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-title">
                  <Users size={20} color="#e11d48" />
                  <span>{editTarget ? 'Detalle / Editar Empleado' : 'Nuevo Empleado'}</span>
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
                        <strong>Matriz:</strong> {getEmpCompany(editTarget)}
                      </div>
                      <div>
                        <strong>Sucursal:</strong> {editTarget.branchName || 'Matriz Principal'}
                      </div>
                      <div>
                        <strong>Usuario:</strong> @{editTarget.username}
                      </div>
                    </div>
                  )}

                  {!editTarget ? (
                    <>
                      <div className="form-group">
                        <label>Usuario *</label>
                        <input
                          className="form-input"
                          placeholder="Ej: jperez"
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
                    </>
                  ) : (
                    <div className="form-group">
                      <label>Nueva Contraseña (opcional)</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Mínimo 6 caracteres (dejar vacío para no cambiar)"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input
                      className="form-input"
                      placeholder="Ej: Juan Pérez García"
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
                      placeholder="Opcional"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Turno *</label>
                    <select
                      className="form-select"
                      value={form.shiftType}
                      onChange={(e) => setForm((p) => ({ ...p, shiftType: e.target.value }))}
                    >
                      {SHIFTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && <div className="alert alert-danger">{error}</div>}
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button
                    type="submit"
                    id="btn-save-employee"
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="spin-icon" /> Guardando...
                      </>
                    ) : editTarget ? (
                      'Guardar Cambios'
                    ) : (
                      'Crear Empleado'
                    )}
                  </button>
                  {editTarget && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-full"
                        style={{ color: editTarget.active ? '#ff3b30' : '#34c759' }}
                        onClick={() => toggleActive(editTarget).then(() => setShowModal(false))}
                      >
                        {editTarget.active ? 'Desactivar Acceso' : 'Reactivar Acceso'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-full"
                        style={{ color: '#ff3b30' }}
                        onClick={() =>
                          handleDeleteEmployee(editTarget).then(() => setShowModal(false))
                        }
                      >
                        Eliminar Permanentemente
                      </button>
                    </>
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
