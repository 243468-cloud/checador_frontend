'use client';

import { useEffect, useState, useMemo } from 'react';
import { attendanceApi, AttendanceRecord, STATUS_LABELS, SHIFT_LABELS } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import {
  FileSpreadsheet,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Table as TableIcon,
  Loader2,
  BarChart3,
  Calendar,
  Filter,
} from 'lucide-react';

const MONTHS = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type PeriodType = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY';

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periodType, setPeriodType] = useState<PeriodType>('MONTHLY');
  const [subPeriod, setSubPeriod] = useState<number>(1); // 1 or 2 for biweekly, 1-4 for weekly

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
  const [filterEmployee, setFilterEmployee] = useState('ALL');

  const load = () => {
    setLoading(true);
    attendanceApi.getMonthly(year, month)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year, month]);

  // Filter records by sub-period (Weekly / Biweekly / Monthly)
  const periodFilteredRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.date) return true;
      const day = parseInt(r.date.split('-')[2], 10);
      if (isNaN(day)) return true;

      if (periodType === 'BIWEEKLY') {
        if (subPeriod === 1) return day >= 1 && day <= 15;
        if (subPeriod === 2) return day >= 16;
      } else if (periodType === 'WEEKLY') {
        if (subPeriod === 1) return day >= 1 && day <= 7;
        if (subPeriod === 2) return day >= 8 && day <= 14;
        if (subPeriod === 3) return day >= 15 && day <= 21;
        if (subPeriod === 4) return day >= 22;
      }
      return true;
    });
  }, [records, periodType, subPeriod]);

  // Employees list for filter
  const employees = useMemo(() => {
    const map = new Map<number, string>();
    periodFilteredRecords.forEach(r => map.set(r.employeeId, r.employeeName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [periodFilteredRecords]);

  // Final filtered list by employee
  const filtered = useMemo(() => {
    return filterEmployee === 'ALL'
      ? periodFilteredRecords
      : periodFilteredRecords.filter(r => r.employeeId === Number(filterEmployee));
  }, [periodFilteredRecords, filterEmployee]);

  // Analytics Metrics
  const total       = filtered.length;
  const onTime      = filtered.filter(r => r.status === 'ON_TIME').length;
  const late        = filtered.filter(r => r.status === 'LATE').length;
  const absent      = filtered.filter(r => r.status === 'ABSENT').length;
  const punctuality = total > 0 ? Math.round((onTime / total) * 100) : 0;
  const totalHours  = filtered.reduce((acc, r) => acc + (r.hoursWorked || 0), 0);

  // Chart data: attendance by day
  const byDay = useMemo(() => {
    const map = new Map<string, { dateLabel: string; onTime: number; late: number; absent: number }>();
    filtered.forEach(r => {
      const d = r.date;
      if (!map.has(d)) {
        const parts = d.split('-');
        const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        map.set(d, { dateLabel, onTime: 0, late: 0, absent: 0 });
      }
      const item = map.get(d)!;
      if (r.status === 'ON_TIME') item.onTime++;
      else if (r.status === 'LATE') item.late++;
      else if (r.status === 'ABSENT') item.absent++;
    });
    return Array.from(map.values()).sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
  }, [filtered]);

  // Pie data
  const pieData = [
    { name: 'Puntual', value: onTime, color: '#10b981' },
    { name: 'Tardanza', value: late,   color: '#f59e0b' },
    { name: 'Falta',    value: absent,  color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const [downloadingPayroll, setDownloadingPayroll] = useState(false);

  // Download Asistencia Excel
  const downloadExcel = async () => {
    setDownloading(true);
    try {
      await attendanceApi.downloadPayroll(year, month);
    } catch (err: unknown) {
      alert('Error descargando reporte: ' + (err instanceof Error ? err.message : 'Error'));
    } finally {
      setDownloading(false);
    }
  };

  // Download Pre-Nómina Excel
  const downloadPayroll = async () => {
    setDownloadingPayroll(true);
    try {
      await attendanceApi.downloadPayroll(year, month);
    } catch (err: unknown) {
      alert('Error descargando Pre-Nómina: ' + (err instanceof Error ? err.message : 'Error'));
    } finally {
      setDownloadingPayroll(false);
    }
  };

  const statusClass: Record<string, string> = {
    ON_TIME: 'badge-success', LATE: 'badge-warning', ABSENT: 'badge-danger',
    IN_SHIFT: 'badge-primary', EXCUSED: 'badge-info',
  };

  const fmt = (iso: string) => iso ? iso.split('T')[1]?.slice(0, 5) : '—';

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Reportes de Asistencia</h1>
            <p className="page-subtitle">Filtra por período semanal, quincenal o mensual y exporta a Excel</p>
          </div>

          <div className="page-actions">
            <button
              id="btn-download-payroll"
              className="btn btn-primary flex items-center gap-2"
              onClick={downloadPayroll}
              disabled={downloadingPayroll || loading}
              title="Pre-Nómina: horas ordinarias, extra, retardos y faltas por empleado"
            >
              {downloadingPayroll ? (
                <><Loader2 size={16} className="spinner" /> Generando...</>
              ) : (
                <><FileSpreadsheet size={16} /> Pre-Nómina Excel</>
              )}
            </button>
            <button
              id="btn-download-excel"
              className="btn btn-success flex items-center gap-2"
              onClick={downloadExcel}
              disabled={downloading || loading}
            >
              {downloading ? (
                <><Loader2 size={16} className="spinner" /> Generando...</>
              ) : (
                <><ClipboardList size={16} /> Exportar Asistencia</>
              )}
            </button>
          </div>
        </div>

        {/* Filter Toolbar Card */}
        <div className="card mb-6" style={{ padding: '16px 20px' }}>
          <div className="flex items-center gap-3 mb-3" style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: 10 }}>
            <Filter size={16} color="#60a5fa" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtros de Período</span>
          </div>

          <div className="grid-4 gap-4" style={{ alignItems: 'center' }}>
            {/* Period Type */}
            <div className="form-group">
              <label className="form-label">Tipo de Reporte</label>
              <select
                className="form-select"
                value={periodType}
                onChange={e => {
                  setPeriodType(e.target.value as PeriodType);
                  setSubPeriod(1);
                }}
              >
                <option value="MONTHLY">Mensual (Mes Completo)</option>
                <option value="BIWEEKLY">Quincenal (15 Días)</option>
                <option value="WEEKLY">Semanal (7 Días)</option>
              </select>
            </div>

            {/* Sub Period Selection (Only for Biweekly / Weekly) */}
            {periodType !== 'MONTHLY' && (
              <div className="form-group">
                <label className="form-label">
                  {periodType === 'BIWEEKLY' ? 'Quincena' : 'Semana'}
                </label>
                <select
                  className="form-select"
                  value={subPeriod}
                  onChange={e => setSubPeriod(Number(e.target.value))}
                >
                  {periodType === 'BIWEEKLY' ? (
                    <>
                      <option value={1}>1ª Quincena (Días 1 - 15)</option>
                      <option value={2}>2ª Quincena (Días 16 - Fin)</option>
                    </>
                  ) : (
                    <>
                      <option value={1}>Semana 1 (Días 1 - 7)</option>
                      <option value={2}>Semana 2 (Días 8 - 14)</option>
                      <option value={3}>Semana 3 (Días 15 - 21)</option>
                      <option value={4}>Semana 4 (Días 22 - Fin)</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Year */}
            <div className="form-group">
              <label className="form-label">Año</label>
              <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Month */}
            <div className="form-group">
              <label className="form-label">Mes</label>
              <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>

            {/* Employee Filter */}
            <div className="form-group">
              <label className="form-label">Empleado</label>
              <select className="form-select" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                <option value="ALL">Todos los empleados</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid-4 stagger mb-6">
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-card-label">Total Registros</div>
                <div className="stat-card-value" style={{ color: '#60a5fa' }}>{total}</div>
              </div>
              <ClipboardList size={28} color="#60a5fa" />
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-card-label">Puntuales</div>
                <div className="stat-card-value" style={{ color: '#34d399' }}>{onTime}</div>
              </div>
              <CheckCircle2 size={28} color="#34d399" />
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-card-label">Tardanzas</div>
                <div className="stat-card-value" style={{ color: '#fbbf24' }}>{late}</div>
              </div>
              <AlertTriangle size={28} color="#fbbf24" />
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-card-label">% Puntualidad</div>
                <div className="stat-card-value" style={{ color: '#a78bfa' }}>{punctuality}%</div>
              </div>
              <TrendingUp size={28} color="#a78bfa" />
            </div>
          </div>
        </div>

        {/* Tabs Toolbar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              id="tab-table"
              className={`btn ${activeTab === 'table' ? 'btn-primary' : 'btn-ghost'} flex items-center gap-2`}
              onClick={() => setActiveTab('table')}
            >
              <TableIcon size={16} />
              <span>Tabla de Datos</span>
            </button>
            <button
              id="tab-charts"
              className={`btn ${activeTab === 'charts' ? 'btn-primary' : 'btn-ghost'} flex items-center gap-2`}
              onClick={() => setActiveTab('charts')}
            >
              <BarChart3 size={16} />
              <span>Gráficas de Análisis</span>
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Horas trabajadas en período: <strong style={{ color: '#60a5fa', fontSize: '1rem' }}>{totalHours.toFixed(1)}h</strong>
          </div>
        </div>

        {loading ? (
          <div className="card"><div className="spinner" style={{ margin: '40px auto' }} /></div>
        ) : activeTab === 'table' ? (
          /* Table View */
          <div className="card">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BarChart3 size={40} /></div>
                <p>No se encontraron registros para este período</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Turno</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Estado</th>
                      <th>Tardanza</th>
                      <th>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(rec => (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 600 }}>{rec.employeeName}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          {new Date(rec.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{SHIFT_LABELS[rec.shift] || rec.shift}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(rec.checkIn)}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(rec.checkOut)}</td>
                        <td><span className={`badge ${statusClass[rec.status] || 'badge-muted'}`}>{STATUS_LABELS[rec.status] || rec.status}</span></td>
                        <td>{rec.lateMinutes > 0 ? <span style={{ color: '#fbbf24', fontWeight: 600 }}>+{rec.lateMinutes} min</span> : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{rec.hoursWorked > 0 ? `${rec.hoursWorked.toFixed(1)}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Responsive Charts View */
          <div className="grid-2 gap-6">
            {/* Bar Chart Container */}
            <div className="card animate-slide-up" style={{ minWidth: 0 }}>
              <h3 style={{ marginBottom: 16, fontSize: '0.98rem', fontWeight: 700 }}>Asistencia por Día</h3>
              <div style={{ width: '100%', height: 260, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="dateLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="onTime" name="Puntual"  fill="#10b981" radius={[3,3,0,0]} />
                    <Bar dataKey="late"   name="Tardanza" fill="#f59e0b" radius={[3,3,0,0]} />
                    <Bar dataKey="absent" name="Falta"    fill="#f43f5e" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut / Pie Chart Container */}
            <div className="card animate-slide-up" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ marginBottom: 16, fontSize: '0.98rem', fontWeight: 700, alignSelf: 'flex-start' }}>Distribución del Período</h3>
              <div style={{ width: '100%', height: 220, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Legend Pill Row */}
              <div className="flex gap-4 flex-wrap justify-center mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    <span>{d.name}: <strong style={{ color: '#fff' }}>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Table Card */}
            <div className="card animate-slide-up" style={{ gridColumn: '1 / -1', minWidth: 0 }}>
              <h3 style={{ marginBottom: 16, fontSize: '0.98rem', fontWeight: 700 }}>Resumen por Empleado</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Días en Período</th>
                      <th>Puntuales</th>
                      <th>Tardanzas</th>
                      <th>Faltas</th>
                      <th>% Puntualidad</th>
                      <th>Total Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const empRecs = filtered.filter(r => r.employeeId === emp.id);
                      const eOnTime = empRecs.filter(r => r.status === 'ON_TIME').length;
                      const eLate   = empRecs.filter(r => r.status === 'LATE').length;
                      const eAbsent = empRecs.filter(r => r.status === 'ABSENT').length;
                      const eTotal  = empRecs.length;
                      const ePunct  = eTotal > 0 ? ((eOnTime / eTotal) * 100).toFixed(0) : '0';
                      const eHours  = empRecs.reduce((s, r) => s + (r.hoursWorked || 0), 0);
                      return (
                        <tr key={emp.id}>
                          <td style={{ fontWeight: 600 }}>{emp.name}</td>
                          <td>{eTotal}</td>
                          <td><span style={{ color: '#34d399', fontWeight: 600 }}>{eOnTime}</span></td>
                          <td><span style={{ color: '#fbbf24', fontWeight: 600 }}>{eLate}</span></td>
                          <td><span style={{ color: '#f87171', fontWeight: 600 }}>{eAbsent}</span></td>
                          <td>
                            <div className="flex items-center gap-2" style={{ minWidth: 120 }}>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${ePunct}%`, background: Number(ePunct) >= 80 ? '#10b981' : Number(ePunct) >= 60 ? '#f59e0b' : '#f43f5e', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: Number(ePunct) >= 80 ? '#34d399' : Number(ePunct) >= 60 ? '#fbbf24' : '#f87171' }}>{ePunct}%</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: '#60a5fa' }}>{eHours.toFixed(1)}h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
