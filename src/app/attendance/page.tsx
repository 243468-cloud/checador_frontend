'use client';

import { useEffect, useState } from 'react';
import { attendanceApi, AttendanceRecord, STATUS_LABELS, STATUS_COLORS, SHIFT_LABELS } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserX,
  ClipboardList,
  Edit3,
  Save,
  X,
} from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Edit Modal State for Admin/Superadmin
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'ON_TIME',
    lateMinutes: 0,
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const isAdmin = user?.role === 'SUPERUSER' || user?.role === 'ADMIN';

  const load = () => {
    setLoading(true);
    attendanceApi.getDaily(selectedDate).then(setRecords).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedDate]);

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    const checkInIso = rec.checkIn ? rec.checkIn.slice(0, 16) : '';
    const checkOutIso = rec.checkOut ? rec.checkOut.slice(0, 16) : '';
    setEditForm({
      checkInTime: checkInIso,
      checkOutTime: checkOutIso,
      status: rec.status,
      lateMinutes: rec.lateMinutes || 0,
      notes: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      await attendanceApi.update(editingRecord.id, {
        checkInTime: editForm.checkInTime ? editForm.checkInTime + ':00' : undefined,
        checkOutTime: editForm.checkOutTime ? editForm.checkOutTime + ':00' : undefined,
        status: editForm.status,
        lateMinutes: Number(editForm.lateMinutes),
        notes: editForm.notes,
      });
      setEditingRecord(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asistencia');
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = filterStatus === 'ALL'
    ? records
    : records.filter(r => r.status === filterStatus);

  const fmt = (iso: string) => iso ? iso.split('T')[1]?.slice(0, 5) : '—';

  const statusClass: Record<string, string> = {
    ON_TIME: 'badge-success',
    LATE:    'badge-warning',
    ABSENT:  'badge-danger',
    IN_SHIFT:'badge-primary',
    EXCUSED: 'badge-info',
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Asistencia Diaria</h1>
            <p className="page-subtitle">{records.length} registros encontrados</p>
          </div>
          <div className="page-actions">
            <input
              id="date-filter"
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: 160 }}
            />
            <select
              id="status-filter"
              className="form-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ON_TIME">Puntual</option>
              <option value="LATE">Tardanza</option>
              <option value="ABSENT">Falta</option>
              <option value="IN_SHIFT">En turno</option>
              <option value="EXCUSED">Justificado</option>
            </select>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid-4 stagger" style={{ marginBottom: 24 }}>
          {[
            { label: 'Puntuales', count: records.filter(r => r.status === 'ON_TIME').length, color: '#10b981', icon: <CheckCircle2 size={22} /> },
            { label: 'Tardanzas', count: records.filter(r => r.status === 'LATE').length,    color: '#f59e0b', icon: <AlertTriangle size={22} /> },
            { label: 'En turno',  count: records.filter(r => r.status === 'IN_SHIFT').length, color: '#6366f1', icon: <Clock size={22} /> },
            { label: 'Faltas',    count: records.filter(r => r.status === 'ABSENT').length,  color: '#ef4444', icon: <UserX size={22} /> },
          ].map(s => (
            <div key={s.label} className="card animate-slide-up" style={{ padding: '16px 20px' }}>
              <div className="flex items-center gap-3">
                <div style={{ color: s.color, display: 'flex' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="skeleton" style={{ height: 300 }} />
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ClipboardList size={40} />
              </div>
              <p>No hay registros para esta fecha</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Empleado</th>
                    <th>Turno</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Estado</th>
                    <th>Tardanza</th>
                    <th>Horas</th>
                    {isAdmin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec, i) => (
                    <tr key={rec.id}>
                      <td style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 34, height: 34,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${STATUS_COLORS[rec.status]}, ${STATUS_COLORS[rec.status]}88)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
                          }}>
                            {rec.employeeName.split(' ').map((w: string) => w[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rec.employeeName}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{SHIFT_LABELS[rec.shift]}</span></td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(rec.checkIn)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(rec.checkOut)}</td>
                      <td><span className={`badge ${statusClass[rec.status] || 'badge-muted'}`}>{STATUS_LABELS[rec.status]}</span></td>
                      <td>
                        {rec.lateMinutes > 0
                          ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{rec.lateMinutes} min</span>
                          : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {rec.hoursWorked > 0 ? `${rec.hoursWorked.toFixed(1)}h` : '—'}
                      </td>
                      {isAdmin && (
                        <td>
                          <button
                            className="btn btn-ghost btn-sm flex items-center gap-1"
                            onClick={() => handleOpenEdit(rec)}
                            style={{ color: '#60a5fa', fontSize: '0.78rem' }}
                            title="Modificar retardos y lapsos de tiempo"
                          >
                            <Edit3 size={14} />
                            <span>Editar</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL EDICIÓN PARA ADMIN / SUPERADMIN */}
        {editingRecord && (
          <div className="modal-backdrop animate-fade-in" onClick={() => setEditingRecord(null)}>
            <div className="modal-card animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <Edit3 size={18} color="#60a5fa" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Modificar Asistencia & Retardos</h3>
                </div>
                <button className="btn-close" onClick={() => setEditingRecord(null)}><X size={18} /></button>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Modificando registro de <strong>{editingRecord.employeeName}</strong> del {editingRecord.date}.
              </p>

              <div className="form-group-field mb-4">
                <label className="form-label-text">Estado de Asistencia</label>
                <select
                  className="form-select"
                  value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="ON_TIME">Puntual (ON_TIME)</option>
                  <option value="LATE">Tardanza (LATE)</option>
                  <option value="EXCUSED">Justificado / Excusado (EXCUSED)</option>
                  <option value="ABSENT">Falta (ABSENT)</option>
                  <option value="IN_SHIFT">En Turno (IN_SHIFT)</option>
                </select>
              </div>

              <div className="form-group-field mb-4">
                <label className="form-label-text">Minutos de Retardo (0 = Cero Retardos / Perdonar)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={editForm.lateMinutes}
                  onChange={e => setEditForm(p => ({ ...p, lateMinutes: Number(e.target.value) }))}
                  placeholder="Minutos acumulados de tardanza"
                />
              </div>

              <div className="grid-2 gap-3 mb-4">
                <div className="form-group-field">
                  <label className="form-label-text">Lapso Entrada (Check-In)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editForm.checkInTime}
                    onChange={e => setEditForm(p => ({ ...p, checkInTime: e.target.value }))}
                  />
                </div>
                <div className="form-group-field">
                  <label className="form-label-text">Lapso Salida (Check-Out)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editForm.checkOutTime}
                    onChange={e => setEditForm(p => ({ ...p, checkOutTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group-field mb-6">
                <label className="form-label-text">Notas / Justificación</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Motivo de modificación o justificación..."
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button className="btn btn-ghost" onClick={() => setEditingRecord(null)}>Cancelar</button>
                <button className="btn btn-primary flex items-center gap-2" onClick={handleSaveEdit} disabled={savingEdit}>
                  <Save size={16} />
                  <span>{savingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
