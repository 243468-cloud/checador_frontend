'use client';

import { useEffect, useState } from 'react';
import { leaveApi, LeaveRequest, LeaveType, LeaveStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  X,
  ChevronDown,
  Calendar,
  User,
  Briefcase,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<LeaveType, string> = {
  PERMISO:      'Permiso',
  INCAPACIDAD:  'Incapacidad',
  VACACIONES:   'Vacaciones',
  JUSTIFICANTE: 'Justificante de Falta',
};

const TYPE_ICONS: Record<LeaveType, string> = {
  PERMISO:      '',
  INCAPACIDAD:  '',
  VACACIONES:   '',
  JUSTIFICANTE: '',
};

const STATUS_STYLE: Record<LeaveStatus, { label: string; bg: string; color: string }> = {
  PENDING:  { label: 'Pendiente', bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  APPROVED: { label: 'Aprobado',  bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  REJECTED: { label: 'Rechazado', bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
};

function StatusBadge({ status }: { status: LeaveStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = status === 'PENDING' ? Clock : status === 'APPROVED' ? CheckCircle2 : XCircle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <Icon size={13}/> {s.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeavesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERUSER';

  const [requests, setRequests]   = useState<LeaveRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | 'ALL'>('ALL');

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({
    requestType: 'PERMISO' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
    evidenceUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  const [reviewModal, setReviewModal] = useState<{
    request: LeaveRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing]     = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await leaveApi.getBranchRequests(user?.branchId ?? undefined)
        : await leaveApi.getMyRequests();
      setRequests(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await leaveApi.create({
        requestType: form.requestType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        evidenceUrl: form.evidenceUrl || undefined,
      });
      setRequests(prev => [created, ...prev]);
      setForm({ requestType: 'PERMISO', startDate: '', endDate: '', reason: '', evidenceUrl: '' });
      setShowForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    if (reviewModal.action === 'reject' && !reviewNotes.trim()) {
      alert('Debes agregar una nota al rechazar una solicitud.');
      return;
    }
    setReviewing(true);
    try {
      const updated = reviewModal.action === 'approve'
        ? await leaveApi.approve(reviewModal.request.id, reviewNotes || undefined)
        : await leaveApi.reject(reviewModal.request.id, reviewNotes);
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setReviewModal(null);
      setReviewNotes('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al procesar solicitud');
    } finally {
      setReviewing(false);
    }
  };

  const displayed = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {isAdmin ? 'Gestión de Permisos e Incapacidades' : 'Mis Solicitudes'}
            </h1>
            <p className="page-subtitle">
              {isAdmin
                ? 'Revisa y aprueba las solicitudes de tu sucursal'
                : 'Solicita permisos, incapacidades, vacaciones o justificantes'}
            </p>
          </div>
          <div className="page-actions">
            {pendingCount > 0 && isAdmin && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                <AlertTriangle size={14}/> {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
            <button className="btn btn-ghost flex items-center gap-2" onClick={loadRequests}>
              <RefreshCw size={15}/><span>Actualizar</span>
            </button>
            {!isAdmin && (
              <button
                id="btn-nueva-solicitud"
                className="btn btn-primary flex items-center gap-2"
                onClick={() => setShowForm(true)}
              >
                <Plus size={16}/><span>Nueva Solicitud</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="card mb-4" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '14px 18px' }}>
            <p style={{ color: '#ef4444', margin: 0, fontSize: '0.88rem' }}>{error}</p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="card mb-4" style={{ padding: '10px 16px' }}>
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                  border: filterStatus === s ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                  background: filterStatus === s ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: filterStatus === s ? '#818cf8' : '#94a3b8',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {s === 'ALL'
                  ? `Todos (${requests.length})`
                  : `${STATUS_STYLE[s as LeaveStatus].label} (${requests.filter(r => r.status === s).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            <RefreshCw size={28} style={{ margin: '0 auto 12px' }}/>
            <p>Cargando solicitudes...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <FileText size={40} color="#334155" style={{ margin: '0 auto 16px' }}/>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No hay solicitudes.</p>
            {!isAdmin && (
              <button
                className="btn btn-primary flex items-center gap-2"
                style={{ margin: '16px auto 0' }}
                onClick={() => setShowForm(true)}
              >
                <Plus size={15}/> Crear solicitud
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayed.map(req => (
              <div
                key={req.id}
                className="card"
                style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span style={{ fontSize: '1.2rem' }}>{TYPE_ICONS[req.requestType]}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                      {TYPE_LABELS[req.requestType]}
                    </span>
                    <StatusBadge status={req.status}/>
                    {isAdmin && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.73rem',
                        background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                      }}>
                        <User size={11}/> {req.employeeName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap" style={{ color: '#94a3b8', fontSize: '0.83rem' }}>
                    <span className="flex items-center gap-1">
                      <Calendar size={13}/>
                      {req.startDate === req.endDate ? req.startDate : `${req.startDate} → ${req.endDate}`}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      <Clock size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }}/>
                      Enviado: {req.createdAt?.split('T')[0] ?? '—'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <Briefcase size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }}/>
                    {req.reason}
                  </p>
                  {req.evidenceUrl && (
                    <a href={req.evidenceUrl} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none' }}>
                      Ver evidencia
                    </a>
                  )}
                  {req.adminNotes && (
                    <div style={{
                      marginTop: '4px', padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)', borderLeft: '3px solid rgba(99,102,241,0.4)',
                    }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        <MessageSquare size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }}/>
                        Nota del administrador:
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#e2e8f0' }}>{req.adminNotes}</p>
                    </div>
                  )}
                </div>

                {isAdmin && req.status === 'PENDING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                    <button
                      onClick={() => { setReviewModal({ request: req, action: 'approve' }); setReviewNotes(''); }}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <CheckCircle2 size={14}/> Aprobar
                    </button>
                    <button
                      onClick={() => { setReviewModal({ request: req, action: 'reject' }); setReviewNotes(''); }}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem',
                        background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <XCircle size={14}/> Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New Request Modal */}
        {showForm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}>
            <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '28px 30px' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Nueva Solicitud
                </h2>
                <button onClick={() => { setShowForm(false); setFormError(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={22}/>
                </button>
              </div>

              {formError && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem',
                }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                    Tipo de Solicitud *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.requestType}
                      onChange={e => setForm(f => ({ ...f, requestType: e.target.value as LeaveType }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.06)', color: '#f8fafc',
                        border: '1px solid rgba(255,255,255,0.12)', outline: 'none', appearance: 'none',
                      }}
                    >
                      {(Object.keys(TYPE_LABELS) as LeaveType[]).map(t => (
                        <option key={t} value={t} style={{ background: '#1e293b' }}>
                          {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}/>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Fecha Inicio *</label>
                    <input type="date" required value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Fecha Fin *</label>
                    <input type="date" required value={form.endDate} min={form.startDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}/>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Motivo *</label>
                  <textarea rows={3} required
                    placeholder="Describe brevemente el motivo de tu solicitud..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>URL de evidencia (opcional)</label>
                  <input type="url" placeholder="https://... (foto, PDF del médico, etc.)"
                    value={form.evidenceUrl}
                    onChange={e => setForm(f => ({ ...f, evidenceUrl: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}/>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2" style={{ flex: 1 }}>
                    {submitting ? <RefreshCw size={15}/> : <Plus size={15}/>}
                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setFormError(null); }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}>
            <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '28px 30px' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  {reviewModal.action === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                </h2>
                <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={22}/>
                </button>
              </div>

              <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.87rem', color: '#94a3b8' }}>
                  <strong style={{ color: '#f8fafc' }}>{reviewModal.request.employeeName}</strong> —{' '}
                  {TYPE_ICONS[reviewModal.request.requestType]} {TYPE_LABELS[reviewModal.request.requestType]}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {reviewModal.request.startDate} → {reviewModal.request.endDate}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>{reviewModal.request.reason}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  {reviewModal.action === 'reject' ? 'Motivo del rechazo *' : 'Notas adicionales (opcional)'}
                </label>
                <textarea rows={3}
                  placeholder={reviewModal.action === 'reject' ? 'Explica por qué se rechaza...' : 'Notas para el empleado (opcional)...'}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}/>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReview}
                  disabled={reviewing}
                  style={{
                    flex: 1, padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                    background: reviewModal.action === 'approve' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    color: reviewModal.action === 'approve' ? '#10b981' : '#ef4444',
                    border: reviewModal.action === 'approve' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.35)',
                    cursor: reviewing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    opacity: reviewing ? 0.7 : 1,
                  }}
                >
                  {reviewing
                    ? <><RefreshCw size={14}/> Procesando...</>
                    : reviewModal.action === 'approve'
                      ? <><CheckCircle2 size={15}/> Confirmar Aprobación</>
                      : <><XCircle size={15}/> Confirmar Rechazo</>
                  }
                </button>
                <button className="btn btn-ghost" onClick={() => setReviewModal(null)} disabled={reviewing}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
