'use client';

import { useEffect, useState } from 'react';
import { branchApi, Branch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', radiusMeters: '100', toleranceMinutes: '10' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    branchApi.getAll().then(setBranches).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: '100', toleranceMinutes: '10' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    setEditTarget(b);
    setForm({
      name: b.name, address: b.address || '',
      latitude: String(b.latitude), longitude: String(b.longitude),
      radiusMeters: String(b.radiusMeters), toleranceMinutes: String(b.toleranceMinutes),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const data = {
      name: form.name, address: form.address,
      latitude: Number(form.latitude), longitude: Number(form.longitude),
      radiusMeters: Number(form.radiusMeters), toleranceMinutes: Number(form.toleranceMinutes),
    };
    try {
      if (editTarget) await branchApi.update(editTarget.id, data);
      else await branchApi.create(data as any);
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar esta sucursal?')) return;
    await branchApi.delete(id);
    load();
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sucursales</h1>
            <p className="page-subtitle">{branches.length} sucursales activas</p>
          </div>
          <button id="btn-new-branch" className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={16} />
            <span>Nueva Sucursal</span>
          </button>
        </div>

        {loading ? (
          <div className="grid-3">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton" style={{ height: 160 }} /></div>)}</div>
        ) : branches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Building2 size={40} /></div>
            <p>No hay sucursales registradas</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Crear primera</button>
          </div>
        ) : (
          <div className="grid-3 stagger">
            {branches.map(b => (
              <div key={b.id} className="card animate-slide-up">
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    <Building2 size={22} />
                  </div>
                  <div className="flex gap-2">
                    <button id={`btn-edit-branch-${b.id}`} className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Editar"><Edit2 size={14} /></button>
                    <button id={`btn-del-branch-${b.id}`} className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(b.id)} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{b.name}</h3>
                {b.address && (
                  <p className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    <MapPin size={13} />
                    <span>{b.address}</span>
                  </p>
                )}

                <div className="divider" style={{ margin: '12px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-faint)', marginBottom: 2 }}>Latitud</div>
                    <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{b.latitude.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-faint)', marginBottom: 2 }}>Longitud</div>
                    <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{b.longitude.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-faint)', marginBottom: 2 }}>Radio GPS</div>
                    <div style={{ fontWeight: 600 }}>{b.radiusMeters} m</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-faint)', marginBottom: 2 }}>Tolerancia</div>
                    <div style={{ fontWeight: 600 }}>{b.toleranceMinutes} min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editTarget ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" placeholder="Ej: Sucursal Norte" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input className="form-input" placeholder="Dirección completa" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Latitud *</label>
                    <input type="number" step="any" className="form-input" placeholder="19.4326" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitud *</label>
                    <input type="number" step="any" className="form-input" placeholder="-99.1332" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Radio GPS (metros)</label>
                    <input type="number" className="form-input" min="10" max="5000" value={form.radiusMeters} onChange={e => setForm(p => ({ ...p, radiusMeters: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tolerancia (minutos)</label>
                    <input type="number" className="form-input" min="0" max="60" value={form.toleranceMinutes} onChange={e => setForm(p => ({ ...p, toleranceMinutes: e.target.value }))} />
                  </div>
                </div>
                <div className="alert alert-info flex items-start gap-2" style={{ fontSize: '0.8rem' }}>
                  <HelpCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Tip:</strong> Puedes obtener las coordenadas de Google Maps haciendo clic derecho en la ubicación de tu sucursal.</span>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="flex gap-3" style={{ marginTop: 4 }}>
                  <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" id="btn-save-branch" className="btn btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Guardando...</> : (editTarget ? 'Actualizar' : 'Crear Sucursal')}
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
