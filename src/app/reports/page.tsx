'use client';

import { useEffect, useState, useMemo } from 'react';
import { attendanceApi, AttendanceRecord, STATUS_LABELS, SHIFT_LABELS } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from 'lucide-react';

const MONTHS = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type PeriodType = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY';

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPERUSER' || user?.role === 'ADMIN';

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [viewMode, setViewMode] = useState<'table' | 'sheets'>('table');
  const [activeEmployeeIndex, setActiveEmployeeIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = () => {
    setLoading(true);
    attendanceApi.getMonthly(year, month)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year, month]);

  const handleDeleteRecord = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de asistencia de "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await attendanceApi.delete(id);
      load();
    } catch (err: unknown) {
      alert('Error al eliminar registro: ' + (err instanceof Error ? err.message : 'Error'));
    }
  };

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

  // Grouped filtered records by employee for Option 2 (Mobile Sheets View)
  const groupedByEmployee = useMemo(() => {
    const map = new Map<number, { id: number; name: string; records: AttendanceRecord[] }>();
    employees.forEach(emp => {
      if (filterEmployee === 'ALL' || Number(filterEmployee) === emp.id) {
        map.set(emp.id, { id: emp.id, name: emp.name, records: [] });
      }
    });
    filtered.forEach(r => {
      const group = map.get(r.employeeId);
      if (group) {
        group.records.push(r);
      }
    });
    return Array.from(map.values())
      .filter(g => g.records.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, employees, filterEmployee]);

  // Reset active employee index and page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    setActiveEmployeeIndex(0);
  }, [year, month, periodType, subPeriod, filterEmployee, groupedByEmployee]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

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

  const renderSheetsView = () => {
    if (!groupedByEmployee[activeEmployeeIndex]) return null;
    const group = groupedByEmployee[activeEmployeeIndex];
    const gTotal = group.records.length;
    const gOnTime = group.records.filter(r => r.status === 'ON_TIME').length;
    const gLate = group.records.filter(r => r.status === 'LATE').length;
    const gAbsent = group.records.filter(r => r.status === 'ABSENT').length;
    const gPunct = gTotal > 0 ? Math.round((gOnTime / gTotal) * 100) : 0;
    const gHours = group.records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

    const handleTouchStartLocal = (e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEndLocal = (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStart - touchEnd;
      if (diff > 60) {
        // Swiped left -> Next employee
        if (activeEmployeeIndex < groupedByEmployee.length - 1) {
          setActiveEmployeeIndex(activeEmployeeIndex + 1);
        }
      } else if (diff < -60) {
        // Swiped right -> Previous employee
        if (activeEmployeeIndex > 0) {
          setActiveEmployeeIndex(activeEmployeeIndex - 1);
        }
      }
      setTouchStart(null);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Employee Top Horizontal TabBar */}
        <div className="employee-tab-bar">
          {groupedByEmployee.map((g, index) => (
            <button
              key={g.id}
              className={`employee-tab-item ${activeEmployeeIndex === index ? 'active' : ''}`}
              onClick={() => setActiveEmployeeIndex(index)}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Employee Sheet Card with Swipe Handlers */}
        <div
          className="employee-sheet-card animate-slide-up"
          onTouchStart={handleTouchStartLocal}
          onTouchEnd={handleTouchEndLocal}
        >
          {/* Header */}
          <div className="employee-sheet-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 44, height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff'
              }}>
                {group.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{group.name}</h2>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>Hoja {activeEmployeeIndex + 1} de {groupedByEmployee.length}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => activeEmployeeIndex > 0 && setActiveEmployeeIndex(activeEmployeeIndex - 1)}
                disabled={activeEmployeeIndex === 0}
                style={{ padding: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => activeEmployeeIndex < groupedByEmployee.length - 1 && setActiveEmployeeIndex(activeEmployeeIndex + 1)}
                disabled={activeEmployeeIndex === groupedByEmployee.length - 1}
                style={{ padding: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="employee-sheet-stats">
            <div className="employee-sheet-stat-box">
              <div className="employee-sheet-stat-value" style={{ color: '#10b981' }}>{gPunct}%</div>
              <div className="employee-sheet-stat-label">Puntualidad</div>
            </div>
            <div className="employee-sheet-stat-box">
              <div className="employee-sheet-stat-value" style={{ color: '#3b82f6' }}>{gHours.toFixed(1)}h</div>
              <div className="employee-sheet-stat-label">Total Horas</div>
            </div>
            <div className="employee-sheet-stat-box">
              <div className="employee-sheet-stat-value" style={{ color: '#f59e0b' }}>{gLate}</div>
              <div className="employee-sheet-stat-label">Retardos</div>
            </div>
            <div className="employee-sheet-stat-box">
              <div className="employee-sheet-stat-value" style={{ color: '#ef4444' }}>{gAbsent}</div>
              <div className="employee-sheet-stat-label">Faltas</div>
            </div>
          </div>

          {/* Daily Detail List */}
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 12 }}>Desglose de Asistencias</h4>
          <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table style={{ minWidth: '600px' }}>
              <thead>
                <tr>
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
                {group.records.map(rec => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(rec.date).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{rec.shift ? SHIFT_LABELS[rec.shift] || rec.shift : '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(rec.checkIn)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(rec.checkOut)}</td>
                    <td>
                      <span className={`badge ${statusClass[rec.status] || 'badge-muted'}`}>
                        {STATUS_LABELS[rec.status] || rec.status}
                      </span>
                    </td>
                    <td>{rec.lateMinutes > 0 ? <span style={{ color: '#d97706', fontWeight: 600 }}>+{rec.lateMinutes} min</span> : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{rec.hoursWorked !== null ? `${rec.hoursWorked.toFixed(1)}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Instructions */}
          <div className="slide-instruction">
            <Smartphone size={14} />
            <span>Desliza la tarjeta a la izquierda o derecha para ver otro empleado</span>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="card mb-6 animate-slide-up" style={{ padding: '20px 24px', borderRadius: 16, background: '#ffffff', border: '1px solid rgba(225, 29, 72, 0.18)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)' }}>
          <div className="flex items-center gap-2.5 mb-4 pb-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={16} />
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Filtros de Período</span>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Selecciona el rango o empleado para filtrar los reportes</p>
            </div>
          </div>

          <div className="reports-filter-grid">
            {/* Period Type */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo de Reporte</label>
              <select
                className="form-select"
                value={periodType}
                onChange={e => {
                  setPeriodType(e.target.value as PeriodType);
                  setSubPeriod(1);
                }}
                style={{ height: 40, borderRadius: 8 }}
              >
                <option value="MONTHLY">Mensual (Mes Completo)</option>
                <option value="BIWEEKLY">Quincenal (15 Días)</option>
                <option value="WEEKLY">Semanal (7 Días)</option>
              </select>
            </div>

            {/* Sub Period Selection (Only for Biweekly / Weekly) */}
            {periodType !== 'MONTHLY' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {periodType === 'BIWEEKLY' ? 'Quincena' : 'Semana'}
                </label>
                <select
                  className="form-select"
                  value={subPeriod}
                  onChange={e => setSubPeriod(Number(e.target.value))}
                  style={{ height: 40, borderRadius: 8 }}
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
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Año</label>
              <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ height: 40, borderRadius: 8 }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Month */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mes</label>
              <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ height: 40, borderRadius: 8 }}>
                {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>

            {/* Employee Filter */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Empleado</label>
              <select className="form-select" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={{ height: 40, borderRadius: 8 }}>
                <option value="ALL">Todos los empleados</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 4 Horizontal KPI Cards Row */}
        <div className="reports-kpi-grid">
          {/* Card 1: Total Registros */}
          <div className="reports-kpi-card">
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClipboardList size={20} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: 2 }}>
                Total Registros
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>
                {total}
              </div>
            </div>
          </div>

          {/* Card 2: Puntuales */}
          <div className="reports-kpi-card">
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={20} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#065f46', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: 2 }}>
                Puntuales
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857', lineHeight: 1 }}>
                {onTime}
              </div>
            </div>
          </div>

          {/* Card 3: Tardanzas */}
          <div className="reports-kpi-card">
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={20} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: 2 }}>
                Tardanzas
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b45309', lineHeight: 1 }}>
                {late}
              </div>
            </div>
          </div>

          {/* Card 4: % Puntualidad */}
          <div className="reports-kpi-card">
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={20} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#5b21b6', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: 2 }}>
                % Puntualidad
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6d28d9', lineHeight: 1 }}>
                {punctuality}%
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Toolbar with Explicit 32px Top Gap */}
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginTop: 32, marginBottom: 24 }}>
          {/* Left Column: Primary Tab Views */}
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

          {/* Right Column: View Sub-mode Toggle & Stats Summary */}
          <div className="flex items-center gap-5 flex-wrap">
            {!isMobile && activeTab === 'table' && filtered.length > 0 && (
              <div className="flex items-center gap-2" style={{ marginRight: 8 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Vista:</span>
                <div className="reports-view-toggle">
                  <button
                    className={viewMode === 'table' ? 'active' : ''}
                    onClick={() => setViewMode('table')}
                    title="Vista de tabla clásica"
                  >
                    <TableIcon size={14} />
                    <span>Tabla General</span>
                  </button>
                  <button
                    className={viewMode === 'sheets' ? 'active' : ''}
                    onClick={() => setViewMode('sheets')}
                    title="Vista de hojas deslizables por empleado"
                  >
                    <Smartphone size={14} />
                    <span>Hojas por Empleado</span>
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Horas trabajadas en período: <strong style={{ color: '#60a5fa', fontSize: '1rem' }}>{totalHours.toFixed(1)}h</strong>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card"><div className="spinner" style={{ margin: '40px auto' }} /></div>
        ) : activeTab === 'table' ? (
          /* Table or Sheets View */
          filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><BarChart3 size={40} /></div>
                <p>No se encontraron registros para este período</p>
              </div>
            </div>
          ) : isMobile ? (
            /* Option 2: Mobile Sheets View with Swipe Navigation (Forced on Mobile) */
            renderSheetsView()
          ) : viewMode === 'table' ? (
            /* Desktop View: Traditional Table */
            <div className="card animate-slide-up">
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
                      {isAdmin && <th>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map(rec => (
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
                        {isAdmin && (
                          <td>
                            <button
                              className="btn btn-ghost btn-sm flex items-center gap-1"
                              onClick={() => handleDeleteRecord(rec.id, rec.employeeName)}
                              style={{ color: '#ef4444', fontSize: '0.78rem' }}
                              title="Eliminar este registro de asistencia"
                            >
                              <Trash2 size={14} />
                              <span>Eliminar</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls Footer Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 12px 0 12px',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Filas por página:</span>
                  <select
                    className="form-select"
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span style={{ marginLeft: 8 }}>
                    Mostrando {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} – {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} registros
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={16} />
                    <span>Anterior</span>
                  </button>

                  <span style={{ fontWeight: 700, padding: '0 8px' }}>
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop View: Sheets View */
            renderSheetsView()
          )
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
