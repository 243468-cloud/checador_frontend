'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { attendanceApi, employeeApi, DashboardStats, AttendanceRecord, STATUS_LABELS, STATUS_COLORS, SHIFT_LABELS } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import RewardsLeaderboard from '@/components/RewardsLeaderboard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  UserX,
  ClipboardList,
  ArrowRight,
  Activity,
} from 'lucide-react';

import { useRealtime, RealtimeEventData } from '@/hooks/useRealtime';
import { useCallback } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [daily, setDaily] = useState<AttendanceRecord[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayStr = format(today, "EEEE d 'de' MMMM, yyyy", { locale: es });

  const loadData = useCallback(() => {
    Promise.all([
      attendanceApi.getStats(),
      attendanceApi.getDaily(),
      employeeApi.getAll().catch(() => []),
    ]).then(([s, d, emps]) => {
      setStats(s);
      setDaily(d);
      setTotalEmployees(emps.length);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actualización en vivo cero latencia al ocurrir entradas o salidas
  useRealtime(useCallback((event: RealtimeEventData) => {
    if (event.type === 'CHECK_IN' || event.type === 'CHECK_OUT') {
      loadData();
    }
  }, [loadData]));

  const present = (stats?.onTime ?? 0) + (stats?.late ?? 0);
  const absent = totalEmployees - present;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div style={{ maxWidth: 1440, width: '100%' }}>
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{todayStr}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge badge-success flex items-center gap-2">
                <Activity size={12} />
                Sistema activo
              </span>
            </div>
          </div>

          {/* KPI Cards (Clean 4-column / 2x2 Responsive Grid) */}
          <div className="dashboard-kpi-grid">
            <KPICard icon={<Users size={22} />} label="Total Empleados" value={totalEmployees} color="#4f46e5" bg="#e0e7ff" border="#c7d2fe" />
            <KPICard icon={<CheckCircle2 size={22} />} label="Presentes" value={present} color="#059669" bg="#d1fae5" border="#a7f3d0" />
            <KPICard icon={<AlertTriangle size={22} />} label="Tardanzas" value={stats?.late ?? 0} color="#d97706" bg="#fef3c7" border="#fde68a" />
            <KPICard icon={<UserX size={22} />} label="Ausentes" value={absent >= 0 ? absent : 0} color="#dc2626" bg="#fee2e2" border="#fca5a5" />
          </div>

          {/* Ranking & Recompensas Vía Gourmet */}
          <RewardsLeaderboard />

          {/* Daily Attendance Table */}
          <div className="card animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Asistencia de Hoy</h2>
                <p className="text-sm text-muted mt-2">{daily.length} registros</p>
              </div>
              <a href="/attendance" className="btn btn-ghost btn-sm flex items-center gap-2">
                <span>Ver todo</span>
                <ArrowRight size={14} />
              </a>
            </div>

            {daily.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <ClipboardList size={40} />
                </div>
                <p>Aún no hay registros de asistencia hoy</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Turno</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Estado</th>
                      <th>Tardanza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.slice(0, 8).map(rec => (
                      <tr key={rec.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div style={{
                              width: 32, height: 32,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${STATUS_COLORS[rec.status]}, ${STATUS_COLORS[rec.status]}aa)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
                            }}>
                              {rec.employeeName.split(' ').map(w => w[0]).join('').slice(0,2)}
                            </div>
                            <span style={{ fontWeight: 500 }}>{rec.employeeName}</span>
                          </div>
                        </td>
                        <td><span className="text-sm text-muted">{SHIFT_LABELS[rec.shift]}</span></td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {rec.checkIn ? rec.checkIn.split('T')[1]?.slice(0,5) : <span className="text-muted">—</span>}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {rec.checkOut ? rec.checkOut.split('T')[1]?.slice(0,5) : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <StatusBadge status={rec.status} />
                        </td>
                        <td>
                          {rec.lateMinutes > 0
                            ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{rec.lateMinutes} min</span>
                            : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function KPICard({ icon, label, value, color, bg, border }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string; border: string }) {
  return (
    <div className="card animate-slide-up" style={{ padding: '16px 20px', borderRadius: 16, background: '#ffffff', border: `1px solid ${border}`, boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    ON_TIME: 'badge-success',
    LATE:    'badge-warning',
    ABSENT:  'badge-danger',
    IN_SHIFT:'badge-primary',
    EXCUSED: 'badge-info',
  };
  return <span className={`badge ${cls[status] || 'badge-muted'}`}>{STATUS_LABELS[status] || status}</span>;
}

function DashboardSkeleton() {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content">
        <div style={{ height: 64, borderRadius: 12 }} className="skeleton mb-8" />
        <div className="grid-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 80 }} />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </main>
    </div>
  );
}
