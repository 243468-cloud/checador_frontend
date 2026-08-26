'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Award, Wine, UtensilsCrossed, Settings, Sparkles, CheckCircle2, Clock, Medal, X, Save } from 'lucide-react';
import { rankingApi, RankingResponse } from '@/lib/api';

export interface RewardsConfig {
  fortnightReward: string;
  monthlyReward: string;
  fortnightMinAttendance: number;
  monthlyMaxLateMinutes: number;
}

const DEFAULT_CONFIG: RewardsConfig = {
  fortnightReward: 'Bebida sin alcohol (Smoothie / Mocktail Gourmet)',
  monthlyReward: 'Platillo Especial Vía Gourmet a Elección',
  fortnightMinAttendance: 12,
  monthlyMaxLateMinutes: 0,
};

export default function RewardsLeaderboard() {
  const { user } = useAuth();
  const [config, setConfig] = useState<RewardsConfig>(DEFAULT_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editForm, setEditForm] = useState<RewardsConfig>(DEFAULT_CONFIG);
  const [fortnightRank, setFortnightRank] = useState<any[]>([]);
  const [monthlyRank, setMonthlyRank] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch 100% real backend ranking data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await rankingApi.getRanking();
        if (!isMounted) return;
        if (res) {
          setFortnightRank(res.fortnightRank || []);
          setMonthlyRank(res.monthlyRank || []);
          if (res.config) {
            setConfig(res.config);
            setEditForm(res.config);
          }
        }
      } catch (err) {
        console.error('Error fetching backend ranking:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig = await rankingApi.updateConfig(editForm);
      setConfig(updatedConfig);
    } catch (e) {
      console.error('Error saving rewards config to backend:', e);
      setConfig(editForm);
    }
    setShowConfigModal(false);
  };

  const isSuperUser = user?.role === 'SUPERUSER';

  return (
    <div className="card mb-8 animate-slide-up" style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)',
      border: '1px solid rgba(225, 29, 72, 0.18)',
      boxShadow: '0 12px 32px -8px rgba(225, 29, 72, 0.08), 0 4px 14px rgba(0,0,0,0.03)',
      borderRadius: '20px',
      padding: '24px',
    }}>
      {/* Leaderboard Header */}
      <div className="flex items-center justify-between pb-4 mb-6" style={{ borderBottom: '1px solid rgba(225, 29, 72, 0.12)' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(225, 29, 72, 0.3)',
          }}>
            <Trophy size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                Ranking & Recompensas Vía Gourmet
              </h2>
              <span className="badge badge-primary flex items-center gap-1" style={{ fontSize: '10px', padding: '2px 8px' }}>
                <Sparkles size={11} />
                Programa Oficial
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              Reconocimiento al compromiso y puntualidad de nuestros colaboradores
            </p>
          </div>
        </div>

        {isSuperUser && (
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn btn-ghost flex items-center gap-2"
            style={{
              background: 'rgba(225, 29, 72, 0.08)',
              color: '#e11d48',
              border: '1px solid rgba(225, 29, 72, 0.25)',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: '10px',
              padding: '8px 14px',
            }}
          >
            <Settings size={15} />
            <span>Configurar Premios</span>
          </button>
        )}
      </div>

      {/* 2 Main Reward Columns */}
      <div className="grid-2 gap-6">
        {/* FORTNIGHTLY REWARD CARD */}
        <div className="p-5 rounded-2xl" style={{
          background: 'linear-gradient(135deg, #fffdfa 0%, #fff7f2 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 8px 24px -6px rgba(245, 158, 11, 0.12)',
        }}>
          {/* Badge & Title */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#d97706',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wine size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e' }}>
                  Incentivo Quincenal
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                  Empleado con Mayor Asistencia
                </span>
              </div>
            </div>
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}>
              Quincena
            </span>
          </div>

          {/* Current Reward Banner */}
          <div className="p-3 rounded-xl mb-4 flex items-center gap-3" style={{ background: '#ffffff', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <Award size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Premio de la Quincena:
              </div>
              <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
                {config.fortnightReward}
              </div>
            </div>
          </div>

          {/* Podium / Ranking List */}
          <div className="flex flex-col gap-2.5">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>Cargando ranking...</div>
            ) : fortnightRank.map((emp, i) => (
              <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl" style={{
                background: i === 0 ? 'rgba(245, 158, 11, 0.12)' : '#ffffff',
                border: i === 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #f1ece1',
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#b45309',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.75rem',
                  }}>
                    {i === 0 ? '1°' : i === 1 ? '2°' : '3°'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{emp.branch}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#d97706' }}>
                    {emp.attendances} Asistencias
                  </span>
                  {i === 0 && (
                    <span style={{ background: '#f59e0b', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>
                      GANADOR 🏆
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MONTHLY REWARD CARD */}
        <div className="p-5 rounded-2xl" style={{
          background: 'linear-gradient(135deg, #fffdfb 0%, #fff2f5 100%)',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          boxShadow: '0 8px 24px -6px rgba(225, 29, 72, 0.12)',
        }}>
          {/* Badge & Title */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(225, 29, 72, 0.15)',
                color: '#e11d48',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UtensilsCrossed size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#9f1239' }}>
                  Incentivo Mensual
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#be123c', fontWeight: 600 }}>
                  Empleado Más Puntual (Cero Retardos)
                </span>
              </div>
            </div>
            <span style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
            }}>
              Mensual
            </span>
          </div>

          {/* Current Reward Banner */}
          <div className="p-3 rounded-xl mb-4 flex items-center gap-3" style={{ background: '#ffffff', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
            <Medal size={20} color="#e11d48" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Premio del Mes:
              </div>
              <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
                {config.monthlyReward}
              </div>
            </div>
          </div>

          {/* Podium / Ranking List */}
          <div className="flex flex-col gap-2.5">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>Cargando ranking...</div>
            ) : monthlyRank.map((emp, i) => (
              <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl" style={{
                background: i === 0 ? 'rgba(225, 29, 72, 0.12)' : '#ffffff',
                border: i === 0 ? '1px solid rgba(225, 29, 72, 0.4)' : '1px solid #f1ece1',
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: i === 0 ? '#e11d48' : i === 1 ? '#94a3b8' : '#be123c',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.75rem',
                  }}>
                    {i === 0 ? '1°' : i === 1 ? '2°' : '3°'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{emp.branch}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: emp.lateMinutes === 0 ? '#059669' : '#e11d48' }}>
                    {emp.lateMinutes === 0 ? '100% Puntual (0 min)' : `+${emp.lateMinutes} min retardo`}
                  </span>
                  {i === 0 && (
                    <span style={{ background: '#e11d48', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>
                      GANADOR 🏆
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SUPER ADMIN CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Settings size={20} color="#e11d48" />
                <span>Parámetros de Recompensas (Superadmin)</span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setShowConfigModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div className="modal-body">
                <div style={{ background: 'rgba(225, 29, 72, 0.06)', border: '1px solid rgba(225, 29, 72, 0.2)', padding: '12px 14px', borderRadius: '12px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  Como <strong>Superadministrador</strong>, puedes modificar los nombres de los premios e incentivos oficiales para motivar la asistencia puntual en el restaurante.
                </div>

                <div className="form-group">
                  <label>Premio Quincenal (Más Asistencias)</label>
                  <input
                    type="text"
                    value={editForm.fortnightReward}
                    onChange={e => setEditForm(p => ({ ...p, fortnightReward: e.target.value }))}
                    placeholder="Ej: Bebida sin alcohol (Smoothie Gourmet)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Premio Mensual (Más Puntual / Cero Retardos)</label>
                  <input
                    type="text"
                    value={editForm.monthlyReward}
                    onChange={e => setEditForm(p => ({ ...p, monthlyReward: e.target.value }))}
                    placeholder="Ej: Platillo Vía Gourmet a Elección"
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Mínimo Asistencias (Quincena)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={editForm.fortnightMinAttendance}
                      onChange={e => setEditForm(p => ({ ...p, fortnightMinAttendance: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tolerancia Máx. Retardo (Mes)</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={editForm.monthlyMaxLateMinutes}
                      onChange={e => setEditForm(p => ({ ...p, monthlyMaxLateMinutes: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowConfigModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                  <Save size={16} />
                  <span>Guardar Parámetros</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
