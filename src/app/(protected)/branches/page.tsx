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
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false });

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', radiusMeters: '100', toleranceMinutes: '10' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDelete = async () => {
    if (!editTarget || !confirm('¿Desactivar esta sucursal?')) return;
    await branchApi.delete(editTarget.id);
    setShowModal(false);
    load();
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">Sucursales</h1>
            <p className="page-subtitle">{branches.length} sucursales activas</p>
          </div>
          <button id="btn-new-branch" className="btn btn-primary" onClick={openCreate} style={{ padding: '12px 20px', borderRadius: '100px' }}>
            <Plus size={18} />
            <span style={{ display: 'none' }} className="sm:inline">Nueva Sucursal</span>
          </button>
        </div>

        {/* Búsqueda Universal iOS Style */}
        <div className="mb-6" style={{ position: 'relative', maxWidth: 500 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por nombre o dirección..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 44, borderRadius: 16, background: '#ffffff', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
          />
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8e8e93' }}>
            <Building2 size={18} />
          </div>
        </div>

        {loading ? (
          <div className="grid-3">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton" style={{ height: 160 }} /></div>)}</div>
        ) : filteredBranches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ background: 'transparent' }}><Building2 size={40} color="#8e8e93" /></div>
            <p style={{ color: '#8e8e93' }}>No se encontraron sucursales.</p>
            {branches.length === 0 && (
              <button className="btn btn-primary mt-4" onClick={openCreate}>Crear primera</button>
            )}
          </div>
        ) : (
          <div className="grid-3 stagger">
            {filteredBranches.map(b => (
              <div 
                key={b.id} 
                className="card animate-slide-up"
                style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => openEdit(b)}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9500' }}>
                    <Building2 size={24} />
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
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Latitud</div>
                    <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{b.latitude.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Longitud</div>
                    <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{b.longitude.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Radio GPS</div>
                    <div style={{ fontWeight: 600 }}>{b.radiusMeters} m</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Tolerancia</div>
                    <div style={{ fontWeight: 600 }}>{b.toleranceMinutes} min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-card" style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-title">
                  <Building2 size={20} color="#e11d48" />
                  <span>{editTarget ? 'Editar Sucursal' : 'Nueva Sucursal'}</span>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input className="form-input" placeholder="Ej: Sucursal Norte" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Dirección</label>
                    <input className="form-input" placeholder="Dirección completa" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="form-group mt-4">
                    <label>Ubicación y Área Permitida *</label>
                    <LocationPickerMap
                      initialLat={Number(form.latitude) || 19.4326}
                      initialLng={Number(form.longitude) || -99.1332}
                      initialRadius={Number(form.radiusMeters) || 100}
                      onLocationChange={(lat, lng) => setForm(p => ({ ...p, latitude: String(lat), longitude: String(lng) }))}
                      onRadiusChange={(radius) => setForm(p => ({ ...p, radiusMeters: String(radius) }))}
                    />
                  </div>
                  <div className="grid-2 mt-4">
                    <div className="form-group" style={{ display: 'none' }}>
                      <label>Radio GPS (metros)</label>
                      <input type="number" className="form-input" min="10" max="5000" value={form.radiusMeters} onChange={e => setForm(p => ({ ...p, radiusMeters: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Tolerancia (minutos)</label>
                      <input type="number" className="form-input" min="0" max="60" value={form.toleranceMinutes} onChange={e => setForm(p => ({ ...p, toleranceMinutes: e.target.value }))} />
                    </div>
                  </div>
                  <div className="alert alert-info flex items-start gap-2" style={{ fontSize: '0.8rem' }}>
                    <HelpCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><strong>Tip:</strong> Puedes obtener las coordenadas de Google Maps haciendo clic derecho en la ubicación de tu sucursal.</span>
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button type="submit" id="btn-save-branch" className="btn btn-primary btn-full flex items-center justify-center gap-2" disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Guardando...</> : (editTarget ? 'Guardar Cambios' : 'Crear Sucursal')}
                  </button>
                  {editTarget && (
                    <button type="button" className="btn btn-ghost btn-full" style={{ color: '#ff3b30' }} onClick={handleDelete}>
                      Eliminar Sucursal
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
