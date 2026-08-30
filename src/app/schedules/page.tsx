'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { employeeApi, reportApi, scheduleApi, AttendanceRecord, Employee, RosterCell as ApiRosterCell } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Clock,
  Plus,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  Users,
  Check,
  X,
  Grid,
  Sparkles,
  Trash2,
  UserPlus,
  Zap,
  Layers,
  Calendar,
  RefreshCw,
  CornerDownLeft,
  Scale,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Award,
  Filter,
  Sliders,
  Edit2,
  Copy,
  Download,
  Printer,
  Settings,
} from 'lucide-react';

export interface RosterCell {
  text: string;
  type: 'NORMAL' | 'DESCANSO' | 'CAMBIO_TURNO' | 'DOBLE_TURNO' | 'CAMBIO_AREA';
}

export interface RosterRow {
  id: string;
  area: string;
  shiftTime: string;
  employees: {
    [dayIndex: number]: RosterCell[];
  };
}

export interface EmployeeBalance {
  name: string;
  primaryArea: string;
  workDays: number;
  restDays: number;
  doubleShifts: number;
  shiftChanges: number;
  totalScheduledHours: number;
  actualWorkedHours: number;
  overtimeHours: number;
  statusBalance: 'EQUILIBRADO' | 'ELEVADO' | 'REDUCIDO';
}

const DEFAULT_DAYS_HEADER = [
  { day: 'L', date: '24' },
  { day: 'M', date: '25' },
  { day: 'M', date: '26' },
  { day: 'J', date: '27' },
  { day: 'V', date: '28' },
  { day: 'S', date: '29' },
  { day: 'D', date: '30' },
];

const INITIAL_ROSTER: RosterRow[] = [
  {
    id: 'r-1',
    area: 'COCINA',
    shiftTime: '7AM-3PM',
    employees: {
      0: [{ text: 'ITZA', type: 'NORMAL' }, { text: 'HIBERT', type: 'DESCANSO' }, { text: 'PAULINA', type: 'NORMAL' }],
      1: [{ text: 'ITZA', type: 'NORMAL' }, { text: 'HIBERT', type: 'NORMAL' }, { text: 'PAULINA', type: 'NORMAL' }],
      2: [{ text: 'ITZA', type: 'NORMAL' }, { text: 'HIBERT 6PM', type: 'NORMAL' }, { text: 'PAULINA', type: 'NORMAL' }],
      3: [{ text: 'ORIANA', type: 'DESCANSO' }, { text: 'HIBERT', type: 'NORMAL' }, { text: 'PAULINA', type: 'NORMAL' }],
      4: [{ text: 'ITZA', type: 'NORMAL' }, { text: 'HIBERT', type: 'NORMAL' }, { text: 'PAULINA', type: 'NORMAL' }],
      5: [{ text: 'ITZA', type: 'NORMAL' }, { text: 'HIBERT 6PM', type: 'NORMAL' }, { text: 'PAULINA', type: 'DESCANSO' }, { text: 'GAEL', type: 'DOBLE_TURNO' }],
      6: [{ text: '8AM-6PM', type: 'NORMAL' }, { text: 'HIBERT', type: 'NORMAL' }, { text: 'PAULINA', type: 'NORMAL' }, { text: 'GAEL', type: 'DOBLE_TURNO' }],
    },
  },
  {
    id: 'r-2',
    area: 'REPOSTERÍA',
    shiftTime: '7AM-3PM',
    employees: {
      0: [{ text: 'ORIANA', type: 'NORMAL' }, { text: 'LUIS', type: 'NORMAL' }],
      1: [{ text: 'C-11-5', type: 'NORMAL' }, { text: 'LUIS', type: 'NORMAL' }],
      2: [{ text: 'ORIANA', type: 'NORMAL' }],
      3: [],
      4: [{ text: 'C-7-2', type: 'NORMAL' }],
      5: [],
      6: [{ text: 'JARETH', type: 'CAMBIO_TURNO' }],
    },
  },
  {
    id: 'r-3',
    area: 'BARRA',
    shiftTime: '7AM-3PM',
    employees: {
      0: [{ text: 'LUIS', type: 'DESCANSO' }],
      1: [],
      2: [{ text: 'DIDI', type: 'NORMAL' }],
      3: [{ text: 'DIDI', type: 'NORMAL' }],
      4: [{ text: 'DIDI', type: 'NORMAL' }],
      5: [{ text: 'DIDI', type: 'DOBLE_TURNO' }],
      6: [],
    },
  },
  {
    id: 'r-4',
    area: 'SERVICIO',
    shiftTime: '8AM-5PM',
    employees: {
      0: [{ text: 'GAEL 5PM', type: 'DOBLE_TURNO' }],
      1: [{ text: 'DIDI 9-4', type: 'NORMAL' }],
      2: [{ text: 'LUIS', type: 'NORMAL' }],
      3: [{ text: 'LUIS', type: 'DESCANSO' }],
      4: [{ text: 'LUIS', type: 'NORMAL' }],
      5: [{ text: 'LUIS', type: 'NORMAL' }],
      6: [{ text: 'LUIS', type: 'NORMAL' }, { text: 'DIDI 9-6', type: 'NORMAL' }],
    },
  },
  {
    id: 'r-5',
    area: 'COCINA',
    shiftTime: '3PM-11PM',
    employees: {
      0: [{ text: 'LEO', type: 'NORMAL' }],
      1: [{ text: 'LEO', type: 'NORMAL' }],
      2: [{ text: 'LEO', type: 'DESCANSO' }],
      3: [{ text: 'LEO', type: 'NORMAL' }],
      4: [{ text: 'LEO', type: 'NORMAL' }],
      5: [],
      6: [],
    },
  },
  {
    id: 'r-6',
    area: 'BARRA',
    shiftTime: '3PM-11PM',
    employees: {
      0: [{ text: 'JARETH', type: 'DESCANSO' }],
      1: [{ text: 'JARETH', type: 'NORMAL' }],
      2: [{ text: 'JARETH', type: 'NORMAL' }],
      3: [{ text: 'JARETH', type: 'NORMAL' }],
      4: [{ text: 'JARETH', type: 'NORMAL' }],
      5: [{ text: 'JARETH 10PM', type: 'NORMAL' }],
      6: [{ text: 'JARETH', type: 'CAMBIO_TURNO' }],
    },
  },
  {
    id: 'r-7',
    area: 'SERVICIO',
    shiftTime: '3PM-11PM',
    employees: {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [{ text: 'DIDI', type: 'DOBLE_TURNO' }],
      6: [],
    },
  },
];

const PRESET_NAMES = ['ITZA', 'HIBERT', 'PAULINA', 'ORIANA', 'LUIS', 'LEO', 'JARETH', 'GAEL', 'DIDI'];

export default function SchedulesPage() {
  const { user } = useAuth();
  const [rosterRows, setRosterRows] = useState<RosterRow[]>(INITIAL_ROSTER);
  const [daysHeader, setDaysHeader] = useState(DEFAULT_DAYS_HEADER);
  const [weekStart, setWeekStart] = useState<string>(() => {
    // Obtiene el lunes de la semana actual como YYYY-MM-DD
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Dynamic Week Header Calculator
  const calculateDaysHeader = useCallback((startStr: string) => {
    try {
      const parts = startStr.split('-');
      if (parts.length !== 3) return DEFAULT_DAYS_HEADER;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const startDate = new Date(y, m, d);
      const dayLetters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(startDate);
        dt.setDate(startDate.getDate() + i);
        return {
          day: dayLetters[i],
          date: String(dt.getDate()).padStart(2, '0'),
        };
      });
    } catch {
      return DEFAULT_DAYS_HEADER;
    }
  }, []);

  // Single Cell Edit Modal State
  const [editModal, setEditModal] = useState<{
    rowId: string;
    dayIndex: number;
    area: string;
    shiftTime: string;
    dayLabel: string;
  } | null>(null);

  // Row Edit Modal State
  const [editRowModal, setEditRowModal] = useState<{
    id: string;
    area: string;
    shiftTime: string;
  } | null>(null);

  // Header Date / Label Edit Modal State
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  // Report Config Modal State (100% Schedule Pure & Configurable Report)
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  const [reportFormat, setReportFormat] = useState<'PDF' | 'EXCEL'>('PDF');
  const [reportConfig, setReportConfig] = useState({
    title: 'ROL SEMANAL DE HORARIOS Y TURNOS DE TRABAJO',
    subtitle: '',
    includeSummary: true,
    includeLegend: true,
    orientation: 'landscape' as 'landscape' | 'portrait',
    prepBy: 'Gerente de Operaciones',
    approvedBy: 'Recursos Humanos',
    notes: 'Horarios programados sujetos a cambios por necesidades operativas previa autorización.',
    onlyRosterData: true,
  });

  // Global / Bulk Edit Modal State
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [globalScope, setGlobalScope] = useState<'ROW' | 'DAY' | 'ALL'>('ROW');
  const [selectedRowId, setSelectedRowId] = useState<string>('');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [globalText, setGlobalText] = useState('');
  const [globalType, setGlobalType] = useState<RosterCell['type']>('NORMAL');
  const [globalMode, setGlobalMode] = useState<'ADD' | 'REPLACE' | 'CLEAR'>('ADD');

  const [customInput, setCustomInput] = useState('');
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowArea, setNewRowArea] = useState('');
  const [newRowShift, setNewRowShift] = useState('');

  const sortRowsChronologically = (rows: RosterRow[]): RosterRow[] => {
    return [...rows].sort((a, b) => {
      const parseHour = (shiftTime: string): number => {
        if (!shiftTime) return 99;
        const match = shiftTime.match(/(\d+)\s*(AM|PM)/i);
        if (!match) return 99;
        let hour = parseInt(match[1], 10);
        const period = match[2].toUpperCase();
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        return hour;
      };
      const timeA = parseHour(a.shiftTime);
      const timeB = parseHour(b.shiftTime);
      if (timeA !== timeB) return timeA - timeB;
      return a.area.localeCompare(b.area);
    });
  };

  // ─── Carga el roster desde la API (o localStorage como fallback) ─────────────
  useEffect(() => {
    const branchId = user?.branchId;
    if (branchId && weekStart) {
      scheduleApi.getRoster(branchId, weekStart)
        .then(cells => {
          if (cells.length > 0) {
            setRosterRows(sortRowsChronologically(apiCellsToRosterRows(cells)));
          } else {
            // Sin datos en API → intentar localStorage como fallback
            const saved = localStorage.getItem('official_roster_rows');
            if (saved) {
              try { setRosterRows(sortRowsChronologically(JSON.parse(saved))); } catch {}
            }
          }
        })
        .catch(() => {
          // Sin backend → usar localStorage
          const saved = localStorage.getItem('official_roster_rows');
          if (saved) {
            try { setRosterRows(sortRowsChronologically(JSON.parse(saved))); } catch {}
          }
        });
    } else {
      const saved = localStorage.getItem('official_roster_rows');
      if (saved) {
        try { setRosterRows(sortRowsChronologically(JSON.parse(saved))); } catch {}
      }
    }

    employeeApi.getAll()
      .then(setEmployees)
      .catch(() => setEmployees([]));

    const now = new Date();
    reportApi.getMonthly(now.getFullYear(), now.getMonth() + 1)
      .then(setAttendanceRecords)
      .catch(() => setAttendanceRecords([]));
  }, [user?.branchId, weekStart]);

  // ─── Convierte la respuesta de la API al formato interno ─────────────────────
  const apiCellsToRosterRows = (cells: ApiRosterCell[]): RosterRow[] => {
    const rowMap = new Map<string, RosterRow>();
    cells.forEach(c => {
      if (!rowMap.has(c.rowKey)) {
        rowMap.set(c.rowKey, {
          id: c.rowKey,
          area: c.areaName,
          shiftTime: c.shiftTime,
          employees: {},
        });
      }
      const row = rowMap.get(c.rowKey)!;
      if (!row.employees[c.dayIndex]) row.employees[c.dayIndex] = [];
      row.employees[c.dayIndex].push({
        text: c.employeeName,
        type: c.statusType as RosterCell['type'],
      });
    });
    return Array.from(rowMap.values());
  };

  // ─── Convierte el formato interno al formato que espera la API ────────────────
  const rosterRowsToApiCells = (rows: RosterRow[]): Omit<ApiRosterCell, 'id' | 'branchId'>[] => {
    const cells: Omit<ApiRosterCell, 'id' | 'branchId'>[] = [];
    rows.forEach(row => {
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dayCells = row.employees[dayIdx] || [];
        dayCells.forEach(cell => {
          cells.push({
            rowKey: row.id,
            areaName: row.area,
            shiftTime: row.shiftTime,
            dayIndex: dayIdx,
            employeeName: cell.text,
            statusType: cell.type,
            weekStart,
          });
        });
      }
    });
    return cells;
  };

  // ─── Guarda en API + localStorage ────────────────────────────────────────────
  const saveRoster = (updated: RosterRow[]) => {
    setRosterRows(updated);
    localStorage.setItem('official_roster_rows', JSON.stringify(updated));

    const branchId = user?.branchId;
    if (branchId && weekStart) {
      setSyncStatus('saving');
      const cells = rosterRowsToApiCells(updated);
      scheduleApi.saveRoster(branchId, weekStart, cells)
        .then(() => {
          setSyncStatus('saved');
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch(() => setSyncStatus('error'));
    }
  };

  const availableNames = useMemo(() => {
    const raw = employees.length > 0
      ? employees.map(e => e.fullName.split(' ')[0].toUpperCase())
      : PRESET_NAMES;
    return Array.from(new Set(raw));
  }, [employees]);

  const uniqueAvailableNames = availableNames;

  // ─── Row Sorting & Ordering Helpers ─────────────────────────────────────────
  const parseShiftStartTime = (shiftTime: string): number => {
    if (!shiftTime) return 99;
    const match = shiftTime.match(/(\d+)\s*(AM|PM)/i);
    if (!match) return 99;
    let hour = parseInt(match[1], 10);
    const period = match[2].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  };

  const sortByShiftTime = () => {
    const sorted = [...rosterRows].sort((a, b) => {
      const timeA = parseShiftStartTime(a.shiftTime);
      const timeB = parseShiftStartTime(b.shiftTime);
      if (timeA !== timeB) return timeA - timeB;
      return a.area.localeCompare(b.area);
    });
    saveRoster(sorted);
  };

  const sortByAreaName = () => {
    const sorted = [...rosterRows].sort((a, b) => {
      const areaCmp = a.area.localeCompare(b.area);
      if (areaCmp !== 0) return areaCmp;
      return parseShiftStartTime(a.shiftTime) - parseShiftStartTime(b.shiftTime);
    });
    saveRoster(sorted);
  };

  const moveRowUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...rosterRows];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    saveRoster(copy);
  };

  const moveRowDown = (index: number) => {
    if (index >= rosterRows.length - 1) return;
    const copy = [...rosterRows];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    saveRoster(copy);
  };

  // ─── Row & Header Customization Helpers ─────────────────────────────────────
  const handleSaveRowEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRowModal) return;
    const updated = rosterRows.map(r => {
      if (r.id === editRowModal.id) {
        return {
          ...r,
          area: editRowModal.area.trim().toUpperCase(),
          shiftTime: editRowModal.shiftTime.trim().toUpperCase(),
        };
      }
      return r;
    });
    saveRoster(updated);
    setEditRowModal(null);
  };

  const handleDuplicateRow = (rowId: string) => {
    const rowToDup = rosterRows.find(r => r.id === rowId);
    if (!rowToDup) return;
    const duplicated: RosterRow = {
      ...JSON.parse(JSON.stringify(rowToDup)),
      id: `r-${Date.now()}`,
      area: `${rowToDup.area} (COPIA)`,
    };
    const rowIdx = rosterRows.findIndex(r => r.id === rowId);
    const newRows = [...rosterRows];
    newRows.splice(rowIdx + 1, 0, duplicated);
    saveRoster(newRows);
  };

  const handleDeleteRow = (rowId: string) => {
    if (rosterRows.length <= 1) return;
    const filtered = rosterRows.filter(r => r.id !== rowId);
    saveRoster(filtered);
  };

  const handleUpdateHeaderDay = (index: number, dayText: string, dateText: string) => {
    const updated = [...daysHeader];
    updated[index] = { day: dayText.trim().toUpperCase(), date: dateText.trim() };
    setDaysHeader(updated);
  };

  // -------------------------------------------------------------
  // COMPUTE BALANCE GENERAL & OVERTIME
  // -------------------------------------------------------------
  const employeeBalances = useMemo<EmployeeBalance[]>(() => {
    const balanceMap = new Map<string, {
      workDaysSet: Set<number>;
      restDaysSet: Set<number>;
      doubleShifts: number;
      shiftChanges: number;
      areaCounts: Map<string, number>;
      customExtraHours: number;
    }>();

    const allNames = new Set<string>(availableNames);

    rosterRows.forEach(row => {
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const cells = row.employees[dayIdx] || [];
        cells.forEach(cell => {
          const rawText = cell.text.trim().toUpperCase();
          const mainName = rawText.split(' ')[0];

          if (mainName && mainName !== 'DESCANSO' && mainName !== '8AM-6PM' && mainName !== 'C-11-5' && mainName !== 'C-7-2') {
            allNames.add(mainName);

            if (!balanceMap.has(mainName)) {
              balanceMap.set(mainName, {
                workDaysSet: new Set(),
                restDaysSet: new Set(),
                doubleShifts: 0,
                shiftChanges: 0,
                areaCounts: new Map(),
                customExtraHours: 0,
              });
            }

            const empData = balanceMap.get(mainName)!;
            const areaKey = `${row.area} ${row.shiftTime}`;
            empData.areaCounts.set(areaKey, (empData.areaCounts.get(areaKey) || 0) + 1);

            if (rawText.includes('6PM')) empData.customExtraHours += 3.0;
            if (rawText.includes('5PM') && row.shiftTime.includes('7AM-3PM')) empData.customExtraHours += 2.0;
            if (rawText.includes('10PM') && row.shiftTime.includes('3PM-11PM')) empData.customExtraHours += 1.0;

            if (cell.type === 'DESCANSO') {
              empData.restDaysSet.add(dayIdx);
            } else {
              empData.workDaysSet.add(dayIdx);
              if (cell.type === 'DOBLE_TURNO' || rawText.includes('DOBLE')) empData.doubleShifts++;
              if (cell.type === 'CAMBIO_TURNO') empData.shiftChanges++;
            }
          }
        });
      }
    });

    return Array.from(allNames).map(name => {
      const data = balanceMap.get(name) || {
        workDaysSet: new Set(),
        restDaysSet: new Set(),
        doubleShifts: 0,
        shiftChanges: 0,
        areaCounts: new Map(),
        customExtraHours: 0,
      };

      const workDays = data.workDaysSet.size;
      const restDays = data.restDaysSet.size || (7 - workDays);
      const doubleShifts = data.doubleShifts;
      const shiftChanges = data.shiftChanges;

      let primaryArea = 'Varios Turnos';
      let maxCount = 0;
      data.areaCounts.forEach((cnt, area) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          primaryArea = area;
        }
      });

      const totalScheduledHours = (workDays * 8) + (doubleShifts * 8);

      let realOvertimeHours = data.customExtraHours + (doubleShifts * 8);
      let realWorkedHours = totalScheduledHours;

      const empLogs = attendanceRecords.filter(r => r.employeeName.toUpperCase().includes(name));
      empLogs.forEach(log => {
        if (log.hoursWorked && log.hoursWorked > 8.0) {
          realOvertimeHours += (log.hoursWorked - 8.0);
        }
        if (log.hoursWorked) {
          realWorkedHours += log.hoursWorked;
        }
      });

      realWorkedHours = Math.max(totalScheduledHours, realWorkedHours);

      let statusBalance: 'EQUILIBRADO' | 'ELEVADO' | 'REDUCIDO' = 'EQUILIBRADO';
      if (totalScheduledHours > 48 || doubleShifts >= 2 || realOvertimeHours > 6.0) {
        statusBalance = 'ELEVADO';
      } else if (totalScheduledHours < 35 && workDays > 0) {
        statusBalance = 'REDUCIDO';
      }

      return {
        name,
        primaryArea,
        workDays,
        restDays,
        doubleShifts,
        shiftChanges,
        totalScheduledHours,
        actualWorkedHours: Number(realWorkedHours.toFixed(1)),
        overtimeHours: Number(realOvertimeHours.toFixed(1)),
        statusBalance,
      };
    }).sort((a, b) => b.overtimeHours - a.overtimeHours || b.totalScheduledHours - a.totalScheduledHours);
  }, [rosterRows, availableNames, attendanceRecords]);

  // Overall KPIs for Balance & Overtime
  const totalEmployees    = employeeBalances.length;
  const avgHours          = totalEmployees > 0 ? Math.round(employeeBalances.reduce((s, e) => s + e.totalScheduledHours, 0) / totalEmployees) : 0;
  const totalRestDays     = employeeBalances.reduce((s, e) => s + e.restDays, 0);
  const totalDoubleShifts = employeeBalances.reduce((s, e) => s + e.doubleShifts, 0);
  const totalOvertimeHours= Number(employeeBalances.reduce((s, e) => s + e.overtimeHours, 0).toFixed(1));

  const isReadOnly = user?.role === 'EMPLOYEE';

  const openCellModal = (rowId: string, dayIndex: number, area: string, shiftTime: string, dayLabel: string) => {
    if (isReadOnly) return;
    setEditModal({ rowId, dayIndex, area, shiftTime, dayLabel });
    setCustomInput('');
  };

  const openGlobalModalForRow = (rowId: string) => {
    if (isReadOnly) return;
    setGlobalScope('ROW');
    setSelectedRowId(rowId);
    setGlobalText('DESCANSO');
    setGlobalType('DESCANSO');
    setShowGlobalModal(true);
  };

  const openGlobalModalForDay = (dayIdx: number) => {
    if (isReadOnly) return;
    setGlobalScope('DAY');
    setSelectedDayIdx(dayIdx);
    setGlobalText('DESCANSO');
    setGlobalType('DESCANSO');
    setShowGlobalModal(true);
  };

  const quickAddCell = (text: string, type: RosterCell['type']) => {
    if (!editModal) return;
    const { rowId, dayIndex } = editModal;
    const formattedText = text.trim().toUpperCase();

    const updated = rosterRows.map(r => {
      if (r.id === rowId) {
        const existing = r.employees[dayIndex] || [];
        const existingIdx = existing.findIndex(item => item.text.trim().toUpperCase() === formattedText);
        let newEmployees = [...existing];

        if (existingIdx >= 0) {
          // Si ya está asignado, al hacer clic nuevamente se quita (toggle off) evitando duplicados
          newEmployees.splice(existingIdx, 1);
        } else {
          newEmployees.push({ text: formattedText, type });
        }

        return {
          ...r,
          employees: {
            ...r.employees,
            [dayIndex]: newEmployees,
          },
        };
      }
      return r;
    });
    saveRoster(updated);
  };

  const handleApplySpecialStatus = (statusType: RosterCell['type'], defaultLabel: string) => {
    if (!editModal) return;
    const { rowId, dayIndex } = editModal;
    const targetRow = rosterRows.find(r => r.id === rowId);
    const currentItems = targetRow?.employees[dayIndex] || [];

    const isStandalone = (t: string) => ['DESCANSO', 'CAMBIO TURNO', 'CAMBIO_TURNO', 'DOBLE TURNO', 'DOBLE_TURNO', 'CAMBIO AREA', 'CAMBIO_AREA', 'CAMBIO ÁREA'].includes(t.toUpperCase());
    const employeeItems = currentItems.filter(i => !isStandalone(i.text));

    if (employeeItems.length > 0) {
      const updated = rosterRows.map(r => {
        if (r.id === rowId) {
          const existing = [...(r.employees[dayIndex] || [])];
          const newItems = existing.map(it => {
            if (!isStandalone(it.text)) {
              return { ...it, type: statusType };
            }
            return it;
          });
          return {
            ...r,
            employees: {
              ...r.employees,
              [dayIndex]: newItems,
            },
          };
        }
        return r;
      });
      saveRoster(updated);
    } else {
      quickAddCell(defaultLabel, statusType);
    }
  };

  const updateItemType = (rowId: string, dayIndex: number, itemIndex: number, newType: RosterCell['type']) => {
    const updated = rosterRows.map(r => {
      if (r.id === rowId) {
        const existing = [...(r.employees[dayIndex] || [])];
        if (existing[itemIndex]) {
          existing[itemIndex] = { ...existing[itemIndex], type: newType };
        }
        return {
          ...r,
          employees: {
            ...r.employees,
            [dayIndex]: existing,
          },
        };
      }
      return r;
    });
    saveRoster(updated);
  };

  const applyGlobalAction = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = rosterRows.map(row => {
      if (globalScope === 'ROW' && row.id === selectedRowId) {
        const nextEmps = { ...row.employees };
        for (let d = 0; d < 7; d++) {
          if (globalMode === 'CLEAR') {
            nextEmps[d] = [];
          } else if (globalMode === 'REPLACE') {
            nextEmps[d] = [{ text: globalText.trim().toUpperCase(), type: globalType }];
          } else {
            const existing = nextEmps[d] || [];
            nextEmps[d] = [...existing, { text: globalText.trim().toUpperCase(), type: globalType }];
          }
        }
        return { ...row, employees: nextEmps };
      }

      if (globalScope === 'DAY') {
        const nextEmps = { ...row.employees };
        if (globalMode === 'CLEAR') {
          nextEmps[selectedDayIdx] = [];
        } else if (globalMode === 'REPLACE') {
          nextEmps[selectedDayIdx] = [{ text: globalText.trim().toUpperCase(), type: globalType }];
        } else {
          const existing = nextEmps[selectedDayIdx] || [];
          nextEmps[selectedDayIdx] = [...existing, { text: globalText.trim().toUpperCase(), type: globalType }];
        }
        return { ...row, employees: nextEmps };
      }

      if (globalScope === 'ALL') {
        const nextEmps = { ...row.employees };
        for (let d = 0; d < 7; d++) {
          if (globalMode === 'CLEAR') {
            nextEmps[d] = [];
          } else if (globalMode === 'REPLACE') {
            nextEmps[d] = [{ text: globalText.trim().toUpperCase(), type: globalType }];
          } else {
            const existing = nextEmps[d] || [];
            nextEmps[d] = [...existing, { text: globalText.trim().toUpperCase(), type: globalType }];
          }
        }
        return { ...row, employees: nextEmps };
      }

      return row;
    });

    saveRoster(updated);
    setShowGlobalModal(false);
  };

  const handleRemoveCell = (rowId: string, dayIndex: number, itemIndex: number) => {
    const updated = rosterRows.map(r => {
      if (r.id === rowId) {
        const existing = [...(r.employees[dayIndex] || [])];
        existing.splice(itemIndex, 1);
        return {
          ...r,
          employees: {
            ...r.employees,
            [dayIndex]: existing,
          },
        };
      }
      return r;
    });
    saveRoster(updated);
  };

  const handleClearDayCell = (rowId: string, dayIndex: number) => {
    const updated = rosterRows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          employees: {
            ...r.employees,
            [dayIndex]: [],
          },
        };
      }
      return r;
    });
    saveRoster(updated);
  };

  const handleCreateRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowArea.trim()) return;
    const newRow: RosterRow = {
      id: `r-${Date.now()}`,
      area: newRowArea.trim().toUpperCase(),
      shiftTime: newRowShift.trim().toUpperCase(),
      employees: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    };
    saveRoster([...rosterRows, newRow]);
    setNewRowArea('');
    setNewRowShift('');
    setShowAddRowModal(false);
  };

  const getBadgeStyle = (type: RosterCell['type']) => {
    switch (type) {
      case 'DESCANSO':     return { bg: '#10b981', color: '#ffffff' };
      case 'CAMBIO_TURNO': return { bg: '#0284c7', color: '#ffffff' };
      case 'DOBLE_TURNO':  return { bg: '#d97706', color: '#ffffff' };
      case 'CAMBIO_AREA':  return { bg: '#ea580c', color: '#ffffff' };
      default:             return { bg: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' };
    }
  };

  // -------------------------------------------------------------
  // EXPORT TO EXCEL (100% PURE SCHEDULE DATA & CONFIGURABLE)
  // -------------------------------------------------------------
  const exportRosterToExcelWithConfig = () => {
    const headerRow = ['ÁREA / TURNO', ...daysHeader.map(d => `${d.day} ${d.date}`)];
    const rowsData: any[] = [
      [reportConfig.title.toUpperCase()],
      [`Sucursal: ${user?.branchName || reportConfig.subtitle || 'Central'} | Semana del ${daysHeader[0].date} al ${daysHeader[6].date}`],
      [],
      headerRow
    ];

    rosterRows.forEach(row => {
      const areaLabel = `${row.area} ${row.shiftTime ? `(${row.shiftTime})` : ''}`;
      const cellValues = daysHeader.map((_, dayIdx) => {
        const items = row.employees[dayIdx] || [];
        return items.map(i => `${i.text}${i.type !== 'NORMAL' ? ` (${i.type})` : ''}`).join(' / ') || '';
      });
      rowsData.push([areaLabel, ...cellValues]);
    });

    if (reportConfig.includeSummary) {
      rowsData.push([]);
      rowsData.push(['RESUMEN DE HORARIOS Y BALANCE DE CARGA (EXCLUSIVO ROL)']);
      rowsData.push(['Empleado', 'Área Principal', 'Días Trab.', 'Descansos', 'Dobles', 'Horas Programadas', 'Horas Estimadas', 'Balance Carga']);

      employeeBalances.forEach(b => {
        rowsData.push([
          b.name,
          b.primaryArea,
          b.workDays,
          b.restDays,
          b.doubleShifts,
          `${b.totalScheduledHours} hrs`,
          `${b.actualWorkedHours} hrs`,
          b.statusBalance,
        ]);
      });
    }

    if (reportConfig.notes) {
      rowsData.push([]);
      rowsData.push(['NOTAS Y OBSERVACIONES:', reportConfig.notes]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rowsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rol Semanal');

    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];

    XLSX.writeFile(workbook, `Reporte_Rol_Semanal_${user?.branchName || 'Empresa'}.xlsx`);
  };

  // -------------------------------------------------------------
  // EXPORT TO PDF (100% PURE SCHEDULE DATA & CONFIGURABLE)
  // -------------------------------------------------------------
  const exportRosterToPDFWithConfig = () => {
    const isLandscape = reportConfig.orientation === 'landscape';
    const doc = new jsPDF({
      orientation: reportConfig.orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = isLandscape ? 297 : 210;

    // Header Top Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(reportConfig.title.toUpperCase(), 14, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    const subText = `Sucursal: ${user?.branchName || reportConfig.subtitle || 'Central'} | Semana del ${daysHeader[0].date} al ${daysHeader[6].date} | Emitido: ${new Date().toLocaleDateString('es-MX')}`;
    doc.text(subText, 14, 19);

    const tableHeaders = [
      ['ÁREA / TURNO', ...daysHeader.map(d => `${d.day}\n${d.date}`)]
    ];

    const tableBody: any[] = [];
    rosterRows.forEach(row => {
      const areaLabel = `${row.area}\n${row.shiftTime}`;
      const dayCells = daysHeader.map((_, dayIdx) => {
        const items = row.employees[dayIdx] || [];
        return items.map(i => {
          if (i.type === 'DESCANSO' && !i.text.toUpperCase().includes('DESCANSO')) {
            return `${i.text}\nDESCANSO`;
          }
          if (i.type === 'CAMBIO_TURNO' && !i.text.toUpperCase().includes('CAMBIO')) {
            return `${i.text}\nCAMBIO TURNO`;
          }
          if (i.type === 'DOBLE_TURNO' && !i.text.toUpperCase().includes('DOBLE')) {
            return `${i.text}\nDOBLE TURNO`;
          }
          if (i.type === 'CAMBIO_AREA' && !i.text.toUpperCase().includes('AREA')) {
            return `${i.text}\nCAMBIO AREA`;
          }
          return i.text;
        }).join('\n') || '';
      });
      tableBody.push([areaLabel, ...dayCells]);
    });

    const colWidth = (pageWidth - 42) / 7;

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 28,
      theme: 'grid',
      headStyles: {
        fillColor: [234, 88, 12],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        halign: 'center',
        valign: 'middle',
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 28, fillColor: [248, 250, 252], fontStyle: 'bold' },
        1: { cellWidth: colWidth },
        2: { cellWidth: colWidth },
        3: { cellWidth: colWidth },
        4: { cellWidth: colWidth },
        5: { cellWidth: colWidth },
        6: { cellWidth: colWidth },
        7: { cellWidth: colWidth },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const rowIndex = data.row.index;
          const dayIndex = data.column.index - 1;
          const rowData = rosterRows[rowIndex];
          if (rowData) {
            const items = rowData.employees[dayIndex] || [];
            const hasDescanso = items.some(i => i.type === 'DESCANSO' || i.text.toUpperCase().includes('DESCANSO'));
            const hasCambioTurno = items.some(i => i.type === 'CAMBIO_TURNO' || i.text.toUpperCase().includes('CAMBIO TURNO'));
            const hasDobleTurno = items.some(i => i.type === 'DOBLE_TURNO' || i.text.toUpperCase().includes('DOBLE TURNO'));
            const hasCambioArea = items.some(i => i.type === 'CAMBIO_AREA' || i.text.toUpperCase().includes('CAMBIO AREA'));

            if (hasDescanso) {
              data.cell.styles.fillColor = [16, 185, 129];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else if (hasCambioTurno) {
              data.cell.styles.fillColor = [2, 132, 199];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else if (hasDobleTurno) {
              data.cell.styles.fillColor = [234, 179, 8];
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            } else if (hasCambioArea) {
              data.cell.styles.fillColor = [249, 115, 22];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY || 160;

    // Legend Boxes
    if (reportConfig.includeLegend) {
      doc.setFillColor(16, 185, 129); doc.rect(14, currentY + 6, 26, 6, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('DESCANSO', 17, currentY + 10.2);

      doc.setFillColor(2, 132, 199); doc.rect(44, currentY + 6, 30, 6, 'F');
      doc.text('CAMBIO TURNO', 46, currentY + 10.2);

      doc.setFillColor(234, 179, 8); doc.rect(78, currentY + 6, 28, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('DOBLE TURNO', 80, currentY + 10.2);

      doc.setFillColor(249, 115, 22); doc.rect(110, currentY + 6, 28, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('CAMBIO AREA', 112, currentY + 10.2);

      currentY += 16;
    }

    // Custom Signatures
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY + 14, 80, currentY + 14);
    doc.line(pageWidth - 80, currentY + 14, pageWidth - 14, currentY + 14);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Elaboró / ${reportConfig.prepBy}`, 14, currentY + 18);
    doc.text(`Autorizó / ${reportConfig.approvedBy}`, pageWidth - 80, currentY + 18);

    if (reportConfig.notes) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(`Nota: ${reportConfig.notes}`, 14, currentY + 24);
    }

    // Page 2: Summary Page based EXCLUSIVELY on Roster Data
    if (reportConfig.includeSummary) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN Y BALANCE DE HORARIOS PROGRAMADOS (EXCLUSIVO ROL)', 14, 14);

      const balanceHeaders = [
        ['Empleado', 'Área Principal', 'Días Trab.', 'Descansos', 'Dobles', 'Horas Programadas', 'Horas Estimadas', 'Balance Carga']
      ];

      const balanceRows = employeeBalances.map(b => [
        b.name,
        b.primaryArea,
        `${b.workDays} d`,
        `${b.restDays} d`,
        `${b.doubleShifts}`,
        `${b.totalScheduledHours}h`,
        `${b.actualWorkedHours}h`,
        b.statusBalance,
      ]);

      autoTable(doc, {
        head: balanceHeaders,
        body: balanceRows,
        startY: 28,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
      });

      const finalY2 = (doc as any).lastAutoTable.finalY || 160;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, finalY2 + 20, 80, finalY2 + 20);
      doc.line(pageWidth - 80, finalY2 + 20, pageWidth - 14, finalY2 + 20);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Firma / ${reportConfig.prepBy}`, 14, finalY2 + 24);
      doc.text(`Firma y Sello / ${reportConfig.approvedBy}`, pageWidth - 80, finalY2 + 24);
    }

    doc.save(`Reporte_Rol_Semanal_${user?.branchName || 'Empresa'}.pdf`);
  };

  const exportIndividualPDF = (employeeName: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('VÍA GOURMET RESTAURANTE', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Horario Individual de Trabajo — ${employeeName}`, 14, 22);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Empleado: ${employeeName}`, 14, 40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sucursal: Via Gourmet | Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 14, 46);

    const headers = [['Día', 'Fecha', 'Turno Asignado', 'Lapsos de Jornada', 'Estado / Tipo']];
    const rows = daysHeader.map((d, i) => {
      let shiftText = 'Descanso';
      let timeText = '—';
      rosterRows.forEach(r => {
        const cells = r.employees[i] || [];
        if (cells.some(c => c.text.toLowerCase().includes(employeeName.toLowerCase()))) {
          shiftText = `${r.area} (${r.shiftTime})`;
          timeText = r.shiftTime;
        }
      });
      return [d.day, d.date, shiftText, timeText, shiftText.includes('Descanso') ? 'Día Libre' : 'Jornada Laboral'];
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 54,
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 140;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalY + 25, 80, finalY + 25);
    doc.line(130, finalY + 25, 196, finalY + 25);
    doc.text('Firma Supervisión / Admin', 130, finalY + 30);

    doc.save(`Horario_Individual_${employeeName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        {/* Header */}
        <div className="page-header mb-6 flex-wrap gap-4">
          <div>
            <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Rol Semanal y Control de Horarios
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
              Edición 100% interactiva de la matriz de turnos y generación de reportes puros de horario.
            </p>
          </div>

          {/* Date Picker Selector */}
          <div className="flex items-center gap-2" style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }}>
            <Calendar size={16} color="#ea580c" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>Semana del Lunes:</span>
            <input
              type="date"
              className="form-input"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
              style={{ padding: '3px 8px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 8, background: '#ffffff' }}
            />
          </div>

          <div className="page-actions flex-wrap gap-2">
            {!isReadOnly && (
              <>
                <button
                  className="btn btn-ghost flex items-center gap-1.5"
                  onClick={() => setShowEditHeaderModal(true)}
                  title="Personalizar etiquetas y números de los días del encabezado"
                  style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}
                >
                  <Edit2 size={14} color="#ea580c" />
                  <span>Editar Fechas</span>
                </button>

                <button
                  id="btn-open-global-modal"
                  className="btn btn-warning flex items-center gap-2"
                  onClick={() => {
                    setGlobalScope('ROW');
                    if (rosterRows.length > 0) setSelectedRowId(rosterRows[0].id);
                    setShowGlobalModal(true);
                  }}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  <Zap size={15} />
                  <span>Cambio Masivo</span>
                </button>

                <button
                  id="btn-add-area-row"
                  className="btn btn-ghost flex items-center gap-2"
                  onClick={() => setShowAddRowModal(true)}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  <Plus size={15} color="#e11d48" />
                  <span>Nueva Área / Turno</span>
                </button>

                <button
                  id="btn-export-excel-roster"
                  className="btn btn-ghost flex items-center gap-2"
                  onClick={() => {
                    setReportFormat('EXCEL');
                    setShowReportConfigModal(true);
                  }}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  <FileSpreadsheet size={15} color="#059669" />
                  <span>Exportar Excel</span>
                </button>
              </>
            )}

            <button
              id="btn-export-pdf-roster"
              className="btn btn-primary flex items-center gap-2"
              onClick={() => {
                setReportFormat('PDF');
                setShowReportConfigModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                padding: '8px 14px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
              }}
            >
              <FileText size={15} />
              <span>Configurar y Exportar PDF</span>
            </button>
          </div>

          {/* Sync status indicator */}
          {syncStatus !== 'idle' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
              background: syncStatus === 'saved'  ? 'rgba(16,185,129,0.15)'
                        : syncStatus === 'saving' ? 'rgba(225,29,72,0.15)'
                        : 'rgba(239,68,68,0.15)',
              color: syncStatus === 'saved'  ? '#059669'
                   : syncStatus === 'saving' ? '#e11d48'
                   : '#dc2626',
              border: `1px solid ${syncStatus === 'saved' ? 'rgba(16,185,129,0.3)' : syncStatus === 'saving' ? 'rgba(225,29,72,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {syncStatus === 'saving' && <span>Guardando en servidor...</span>}
              {syncStatus === 'saved'  && <span>Guardado en servidor</span>}
            </div>
          )}
        </div>

        {/* Official Roster Matrix Card */}
        <div className="card mb-6 overflow-hidden">
          <div className="flex items-center justify-between p-4 flex-wrap gap-3" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <Grid size={18} color="#ea580c" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Matriz Semanal de Turnos</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Semana del {daysHeader[0].date} al {daysHeader[6].date}
              </span>
            </div>

            {/* Quick Sort & Order Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm flex items-center gap-1.5"
                onClick={sortByShiftTime}
                title="Ordenar filas cronológicamente por hora de inicio de turno (Mañana ➔ Tarde)"
                style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', padding: '6px 12px', borderRadius: 8 }}
              >
                <Clock size={14} />
                <span>Ordenar x Horario</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm flex items-center gap-1.5"
                onClick={sortByAreaName}
                title="Ordenar filas alfabéticamente por área"
                style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', padding: '6px 12px', borderRadius: 8 }}
              >
                <Filter size={14} />
                <span>Ordenar x Área</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
            <table style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#ea580c', color: '#ffffff' }}>
                  <th style={{ padding: '10px 14px', width: '18%', color: '#fff', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    ÁREA / TURNO
                  </th>
                  {daysHeader.map((d, i) => (
                    <th
                      key={i}
                      onClick={() => openGlobalModalForDay(i)}
                      title={`Haz clic para edición masiva del día ${d.day} ${d.date}`}
                      style={{ padding: '8px 10px', textTransform: 'uppercase', textAlign: 'center', width: '11.5%', color: '#fff', cursor: 'pointer' }}
                      className="hover:bg-orange-700 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, lineHeight: 1 }}>{d.day}</div>
                        <Zap size={11} color="#fde047" />
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9 }}>{d.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rosterRows.map((row, rowIdx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ background: 'rgba(234, 88, 12, 0.08)', borderRight: '1px solid var(--color-border)', padding: '10px 14px' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#f97316', letterSpacing: '0.5px' }}>
                            {row.area}
                          </div>
                          {row.shiftTime && (
                            <div
                              style={{
                                display: 'inline-block',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                marginTop: 3,
                                background: row.shiftTime.includes('3PM') ? 'rgba(234, 179, 8, 0.18)' : row.shiftTime.includes('8AM') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(2, 132, 199, 0.18)',
                                color: row.shiftTime.includes('3PM') ? '#d97706' : row.shiftTime.includes('8AM') ? '#059669' : '#0284c7',
                                border: `1px solid ${row.shiftTime.includes('3PM') ? 'rgba(234, 179, 8, 0.3)' : row.shiftTime.includes('8AM') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(2, 132, 199, 0.3)'}`,
                              }}
                            >
                              {row.shiftTime}
                            </div>
                          )}
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm p-1"
                              onClick={() => setEditRowModal({ id: row.id, area: row.area, shiftTime: row.shiftTime })}
                              title={`Editar nombre de área y horario para ${row.area}`}
                              style={{ color: '#ea580c', borderRadius: 4 }}
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm p-1"
                              onClick={() => handleDuplicateRow(row.id)}
                              title={`Duplicar fila ${row.area}`}
                              style={{ color: '#0284c7', borderRadius: 4 }}
                            >
                              <Copy size={13} />
                            </button>

                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                className="btn btn-ghost p-0.5"
                                style={{ height: 16, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', opacity: rowIdx === 0 ? 0.3 : 1 }}
                                onClick={() => moveRowUp(rowIdx)}
                                disabled={rowIdx === 0}
                                title="Mover fila arriba"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost p-0.5"
                                style={{ height: 16, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', opacity: rowIdx === rosterRows.length - 1 ? 0.3 : 1 }}
                                onClick={() => moveRowDown(rowIdx)}
                                disabled={rowIdx === rosterRows.length - 1}
                                title="Mover fila abajo"
                              >
                                ▼
                              </button>
                            </div>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm p-1"
                              onClick={() => openGlobalModalForRow(row.id)}
                              title={`Edición masiva para la fila ${row.area}`}
                              style={{ color: '#fbbf24', borderRadius: 4 }}
                            >
                              <Zap size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm p-1"
                              onClick={() => handleDeleteRow(row.id)}
                              title={`Eliminar fila ${row.area}`}
                              style={{ color: '#ef4444', borderRadius: 4 }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {daysHeader.map((d, dayIdx) => {
                      const items = row.employees[dayIdx] || [];
                      return (
                        <td
                          key={dayIdx}
                          onClick={() => openCellModal(row.id, dayIdx, row.area, row.shiftTime, `${d.day} ${d.date}`)}
                          style={{
                            padding: 6,
                            textAlign: 'center',
                            verticalAlign: 'top',
                            borderRight: '1px solid var(--color-border-light)',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            background: items.length === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                          }}
                          className="hover:bg-blue-500/10"
                        >
                          <div className="flex flex-col gap-1.5 items-center justify-center min-h-[48px]">
                            {items.length === 0 ? (
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>+</span>
                            ) : (
                              items.map((it, itemIdx) => {
                                const st = getBadgeStyle(it.type);
                                return (
                                  <div
                                    key={itemIdx}
                                    style={{
                                      background: st.bg,
                                      color: st.color,
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      letterSpacing: '0.3px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                      width: '100%',
                                      textAlign: 'center',
                                    }}
                                  >
                                    {it.text}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color Legend Bar */}
          <div
            className="flex items-center gap-3 p-3 flex-wrap"
            style={{
              background: '#f8f6f0',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              CONVENCIONES / CONVENCIONALES:
            </span>

            <div className="flex items-center gap-1.5" style={{ background: '#10b981', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>
              DESCANSO
            </div>

            <div className="flex items-center gap-1.5" style={{ background: '#0284c7', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>
              CAMBIO TURNO
            </div>

            <div className="flex items-center gap-1.5" style={{ background: '#d97706', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>
              DOBLE TURNO
            </div>

            <div className="flex items-center gap-1.5" style={{ background: '#ea580c', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>
              CAMBIO AREA
            </div>

            <div className="flex items-center gap-1.5" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>
              TURNO NORMAL
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* HORARIOS INDIVIDUALES POR EMPLEADO (Filtrado por rol de usuario) */}
        {/* ----------------------------------------------------------------- */}
        <div className="card mb-8 animate-slide-up">
          <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <Users size={20} color="#e11d48" />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {user?.role === 'EMPLOYEE' ? 'Mi Horario Individual' : 'Horarios Individuales por Empleado'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {user?.role === 'EMPLOYEE'
                    ? 'Consulta tu horario individual asignado esta semana en Vía Gourmet'
                    : 'Consulta o descarga en PDF el horario asignado de cada integrante del equipo'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid-2 gap-4">
            {(user?.role === 'EMPLOYEE'
              ? employeeBalances.filter(b =>
                  b.name.toLowerCase().trim() === (user?.fullName || '').toLowerCase().trim() ||
                  (user?.fullName || '').toLowerCase().includes(b.name.toLowerCase()) ||
                  b.name.toLowerCase().includes((user?.fullName || '').toLowerCase())
                )
              : employeeBalances
            ).map(b => (
              <div
                key={b.name}
                className="p-4 rounded-xl"
                style={{
                  background: '#ffffff',
                  border: user?.fullName === b.name ? '2px solid #e11d48' : '1px solid var(--color-border)',
                  boxShadow: user?.fullName === b.name ? '0 0 15px rgba(225, 29, 72, 0.2)' : '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'linear-gradient(135deg, #e11d48, #be123c)',
                        color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(225, 29, 72, 0.25)',
                      }}
                    >
                      {b.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>{b.name}</span>
                        {user?.fullName === b.name && (
                          <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>TÚ</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>Área: {b.primaryArea}</div>
                    </div>
                  </div>

                  <button
                    className="btn btn-ghost btn-sm flex items-center gap-1.5"
                    onClick={() => exportIndividualPDF(b.name)}
                    style={{ fontSize: '0.75rem', color: '#e11d48', borderColor: 'rgba(225,29,72,0.3)', background: 'rgba(225,29,72,0.08)', fontWeight: 700 }}
                  >
                    <FileText size={13} />
                    <span>PDF Horario</span>
                  </button>
                </div>

                <div className="grid-7 gap-1 mt-2 text-center" style={{ background: '#f8f6f0', padding: '8px', borderRadius: '8px', border: '1px solid #e5e1da' }}>
                  {daysHeader.map((d, i) => {
                    let assignedShift = 'Descanso';
                    rosterRows.forEach(r => {
                      const cells = r.employees[i] || [];
                      if (cells.some(c => c.text.toLowerCase().includes(b.name.toLowerCase()))) {
                        assignedShift = r.shiftTime || r.area;
                      }
                    });

                    return (
                      <div key={i} className="flex flex-col items-center">
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569' }}>{d.day}</span>
                        <span
                          style={{
                            fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', padding: '2px 4px', borderRadius: '4px', width: '100%',
                            background: assignedShift === 'Descanso' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                            color: assignedShift === 'Descanso' ? '#047857' : '#be123c',
                            border: assignedShift === 'Descanso' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(225, 29, 72, 0.3)',
                          }}
                        >
                          {assignedShift === 'Descanso' ? 'Desc' : assignedShift}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* BALANCE GENERAL Y CONTROL DE HORAS EXTRA (CHECKOUT) - Solo ADMIN y SUPERUSER */}
        {/* ----------------------------------------------------------------- */}
        {!isReadOnly && (
          <div className="card mb-8 animate-slide-up" style={{ borderRadius: 24, padding: '28px 24px', background: '#ffffff', border: '1px solid rgba(234, 88, 12, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between pb-4 mb-6" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#ffe4e6', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scale size={22} color="#e11d48" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Balance General: Empleado vs. Horarios y Horas Extra</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Desglose de horas programadas, horas reales trabajadas y horas extra tras check-out</p>
                </div>
              </div>
              <span className="badge" style={{ background: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3', fontWeight: 800, padding: '6px 14px', fontSize: '0.8rem', borderRadius: 20 }}>
                <Timer size={14} style={{ marginRight: 4 }} />
                {totalOvertimeHours}h Extra Totales
              </span>
            </div>

            {/* KPI Row for Balance (Responsive Flex & Padding Spacing) */}
            <div className="balance-kpi-row flex flex-col md:flex-row gap-4 mb-8 mt-3">
              {/* Card 1: Horas Extra */}
              <div className="balance-kpi-card flex-1 flex items-center gap-4 p-5 rounded-xl bg-rose-50/80 border border-rose-200 shadow-sm" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 12, background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Timer className="w-6 h-6 text-rose-600" size={24} color="#e11d48" />
                </div>
                <div>
                  <div className="balance-kpi-title text-[0.72rem] font-extrabold uppercase tracking-wider text-rose-800" style={{ color: '#9f1239' }}>
                    Total Horas Extra Registradas
                  </div>
                  <div className="balance-kpi-value text-2xl font-black text-rose-600 leading-none" style={{ color: '#e11d48' }}>
                    +{totalOvertimeHours}h extra
                  </div>
                </div>
              </div>

              {/* Card 2: Turnos Dobles */}
              <div className="balance-kpi-card flex-1 flex items-center gap-4 p-5 rounded-xl bg-amber-50/80 border border-amber-200 shadow-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap className="w-6 h-6 text-amber-600" size={24} color="#d97706" />
                </div>
                <div>
                  <div className="balance-kpi-title text-[0.72rem] font-extrabold uppercase tracking-wider text-amber-800" style={{ color: '#92400e' }}>
                    Turnos Dobles Detectados
                  </div>
                  <div className="balance-kpi-value text-2xl font-black text-amber-600 leading-none" style={{ color: '#d97706' }}>
                    {totalDoubleShifts} dobles
                  </div>
                </div>
              </div>

              {/* Card 3: Descansos */}
              <div className="balance-kpi-card flex-1 flex items-center gap-4 p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-sm" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 12, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" size={24} color="#059669" />
                </div>
                <div>
                  <div className="balance-kpi-title text-[0.72rem] font-extrabold uppercase tracking-wider text-emerald-800" style={{ color: '#065f46' }}>
                    Total Descansos Programados
                  </div>
                  <div className="balance-kpi-value text-2xl font-black text-emerald-600 leading-none" style={{ color: '#059669' }}>
                    {totalRestDays} descansos
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Table with Overtime column & Explicit 32px Top Spacing */}
            <div className="table-wrapper" style={{ marginTop: 32, borderRadius: 18, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)' }}>
              <table>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ffffff' }}>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Empleado</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Área Principal</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Días Trab.</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Descansos</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Horas Programadas</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Horas Reales Trab.</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Horas Extra (Checkout)</th>
                    <th style={{ padding: '14px 18px', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px' }}>Balance Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeBalances.map(b => (
                    <tr key={b.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ fontWeight: 800, color: '#0f172a', padding: '14px 18px' }}>{b.name}</td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, padding: '14px 18px' }}>{b.primaryArea}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', padding: '14px 18px' }}>{b.workDays} días</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{b.restDays} días</span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#e11d48', padding: '14px 18px' }}>{b.totalScheduledHours}h</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', padding: '14px 18px' }}>{b.actualWorkedHours}h</td>
                      <td style={{ padding: '14px 18px' }}>
                        {b.overtimeHours > 0 ? (
                          <span
                            style={{
                              background: '#f3e8ff',
                              border: '1px solid #e9d5ff',
                              color: '#7e22ce',
                              fontWeight: 800,
                              padding: '5px 12px',
                              borderRadius: 14,
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Timer size={13} />
                            +{b.overtimeHours}h extra
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0.0h</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {b.statusBalance === 'ELEVADO' ? (
                          <span className="badge badge-warning flex items-center gap-1" style={{ width: 'fit-content' }}>
                            <AlertTriangle size={12} /> Carga Elevada
                          </span>
                        ) : b.statusBalance === 'REDUCIDO' ? (
                          <span className="badge badge-info flex items-center gap-1" style={{ width: 'fit-content' }}>
                            Baja Carga
                          </span>
                        ) : (
                          <span className="badge badge-success flex items-center gap-1" style={{ width: 'fit-content' }}>
                            <CheckCircle2 size={12} /> Equilibrado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODAL 1: EDICIÓN DE CELDA — COMPONENTES UNIFICADOS Y MEJOR INTEGRADATOS */}
        {/* ----------------------------------------------------------------- */}
        {editModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setEditModal(null)}
          >
            <div
              className="animate-slide-up"
              style={{
                width: '100%',
                maxWidth: 460,
                maxHeight: '92vh',
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: 20,
                boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.25)',
                padding: '20px',
                color: '#0f172a',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Encabezado Unificado */}
              <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    {editModal.area}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {editModal.shiftTime && (
                      <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', fontWeight: 700, fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12 }}>
                        {editModal.shiftTime}
                      </span>
                    )}
                    <span style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12 }}>
                      {editModal.dayLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ borderRadius: '50%', width: 32, height: 32, background: '#f8fafc', color: '#64748b', border: 'none', cursor: 'pointer' }}
                  onClick={() => setEditModal(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                {/* BLOQUE UNIFICADO: SELECCIÓN Y PERSONAL ASIGNADO */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px' }}>
                  {/* Selector de Chips Integrado */}
                  <div className="mb-3">
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                      Seleccionar Personal
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {uniqueAvailableNames.map((name, idx) => {
                        const targetRow = rosterRows.find(r => r.id === editModal.rowId);
                        const currentItems = targetRow?.employees[editModal.dayIndex] || [];
                        const isSelected = currentItems.some(i => i.text.trim().toUpperCase() === name.trim().toUpperCase());

                        return (
                          <button
                            key={idx}
                            type="button"
                            className="btn flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
                            style={{
                              background: isSelected ? '#0f172a' : '#ffffff',
                              border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                              color: isSelected ? '#ffffff' : '#0f172a',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '4px 10px 4px 5px',
                              borderRadius: 16,
                              cursor: 'pointer',
                            }}
                            onClick={() => quickAddCell(name, 'NORMAL')}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: isSelected ? '#ffffff' : 'linear-gradient(135deg, #ea580c, #c2410c)',
                                color: isSelected ? '#0f172a' : '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {name[0]}
                            </div>
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divisor Interno */}
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                  {/* Lista de Personal Asignado en la Celda */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Personal Asignado
                      </span>
                    </div>

                    {(() => {
                      const targetRow = rosterRows.find(r => r.id === editModal.rowId);
                      const currentItems = targetRow?.employees[editModal.dayIndex] || [];

                      if (currentItems.length === 0) {
                        return (
                          <div className="p-3 text-center rounded-xl" style={{ background: '#ffffff', border: '1px dashed #cbd5e1' }}>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Sin asignación</span>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col gap-2">
                          {currentItems.map((item, idx) => {
                            const isStandaloneTag = ['DESCANSO', 'CAMBIO TURNO', 'CAMBIO_TURNO', 'DOBLE TURNO', 'DOBLE_TURNO', 'CAMBIO AREA', 'CAMBIO_AREA', 'CAMBIO ÁREA'].includes(item.text.toUpperCase());

                            if (isStandaloneTag) {
                              let badgeBg = '#ecfdf5';
                              let badgeBorder = '#a7f3d0';
                              let badgeColor = '#047857';

                              if (item.type === 'CAMBIO_TURNO' || item.text.toUpperCase().includes('TURNO')) {
                                badgeBg = '#f0f9ff'; badgeBorder = '#bae6fd'; badgeColor = '#0369a1';
                              } else if (item.type === 'DOBLE_TURNO' || item.text.toUpperCase().includes('DOBLE')) {
                                badgeBg = '#fffbeb'; badgeBorder = '#fef08a'; badgeColor = '#b45309';
                              } else if (item.type === 'CAMBIO_AREA' || item.text.toUpperCase().includes('AREA')) {
                                badgeBg = '#fff7ed'; badgeBorder = '#ffedd5'; badgeColor = '#c2410c';
                              }

                              return (
                                <div
                                  key={idx}
                                  className="p-2 rounded-xl flex items-center justify-between"
                                  style={{ background: badgeBg, border: `1px solid ${badgeBorder}` }}
                                >
                                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: badgeColor }}>
                                    {item.text}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCell(editModal.rowId, editModal.dayIndex, idx)}
                                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '2px 6px', color: '#e11d48', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              );
                            }

                            const initials = item.text.split(' ').map(w => w[0]).join('').slice(0, 2);

                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl flex items-center justify-between gap-2 transition-all"
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                }}
                              >
                                {/* Izquierda: Avatar Circular e Inicial + Nombre */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div
                                    style={{
                                      width: 30,
                                      height: 30,
                                      borderRadius: '50%',
                                      background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <span className="truncate" style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                                    {item.text}
                                  </span>
                                </div>

                                {/* Centro: Botones de Estado con sus Colores Característicos */}
                                <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                  <button
                                    type="button"
                                    style={{
                                      background: item.type === 'NORMAL' ? '#ecfdf5' : 'transparent',
                                      color: item.type === 'NORMAL' ? '#047857' : '#64748b',
                                      border: item.type === 'NORMAL' ? '1px solid #a7f3d0' : '1px solid transparent',
                                      borderRadius: 6,
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      padding: '3px 7px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'NORMAL')}
                                  >
                                    Normal
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      background: item.type === 'DESCANSO' ? '#f0f9ff' : 'transparent',
                                      color: item.type === 'DESCANSO' ? '#0369a1' : '#64748b',
                                      border: item.type === 'DESCANSO' ? '1px solid #bae6fd' : '1px solid transparent',
                                      borderRadius: 6,
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      padding: '3px 7px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'DESCANSO')}
                                  >
                                    Descanso
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      background: item.type === 'CAMBIO_TURNO' ? '#eff6ff' : 'transparent',
                                      color: item.type === 'CAMBIO_TURNO' ? '#1d4ed8' : '#64748b',
                                      border: item.type === 'CAMBIO_TURNO' ? '1px solid #bfdbfe' : '1px solid transparent',
                                      borderRadius: 6,
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      padding: '3px 7px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'CAMBIO_TURNO')}
                                  >
                                    C.Turno
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      background: item.type === 'DOBLE_TURNO' ? '#fffbeb' : 'transparent',
                                      color: item.type === 'DOBLE_TURNO' ? '#b45309' : '#64748b',
                                      border: item.type === 'DOBLE_TURNO' ? '1px solid #fef08a' : '1px solid transparent',
                                      borderRadius: 6,
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      padding: '3px 7px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'DOBLE_TURNO')}
                                  >
                                    Doble
                                  </button>
                                </div>

                                {/* Derecha: Botón Eliminar Acomodado y Estilizado */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCell(editModal.rowId, editModal.dayIndex, idx)}
                                  className="transition-all hover:scale-105 active:scale-95"
                                  style={{
                                    background: '#fff1f2',
                                    border: '1px solid #ffe4e6',
                                    borderRadius: '50%',
                                    width: 30,
                                    height: 30,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#e11d48',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    boxShadow: '0 1px 3px rgba(225, 29, 72, 0.1)',
                                  }}
                                  title="Eliminar de la celda"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* CAMPO DE NOTA U HORARIO ESPECIAL */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '12px' }}>
                  <div className="flex items-center gap-1.5" style={{ width: '100%' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nota u horario especial (opcional)"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontWeight: 700,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        flex: 1,
                        minWidth: 0,
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customInput.trim()) {
                          quickAddCell(customInput, 'NORMAL');
                          setCustomInput('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn flex items-center justify-center px-3.5"
                      style={{
                        background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        borderRadius: 8,
                        height: 36,
                        flexShrink: 0,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (customInput.trim()) {
                          quickAddCell(customInput, 'NORMAL');
                          setCustomInput('');
                        }
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {/* BOTÓN PRINCIPAL DE GUARDAR Y CERRAR */}
                <div>
                  <button
                    type="button"
                    className="btn hover:scale-[1.01] active:scale-[0.99] transition-all"
                    style={{
                      width: '100%',
                      height: 44,
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                      color: '#ffffff',
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditModal(null)}
                  >
                    Guardar y Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODAL 2: EDICIÓN GLOBAL Y MASIVA (BULK GLOBAL ACTION) */}
        {/* ----------------------------------------------------------------- */}
        {showGlobalModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowGlobalModal(false)}
          >
            <div
              className="modal animate-slide-up"
              style={{
                width: '100%',
                maxWidth: 540,
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#0f172a',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: 16,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
                padding: '22px 26px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="flex items-center gap-2.5">
                  <Zap size={22} color="#fbbf24" />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                      Asignación Global y Masiva
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Aplica cambios a filas enteras, días completos o a toda la semana</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ borderRadius: '50%', width: 32, height: 32 }}
                  onClick={() => setShowGlobalModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={applyGlobalAction} className="flex flex-col gap-4">
                {/* 1. SELECCIONAR ALCANCE (SCOPE) */}
                <div className="form-group">
                  <label className="form-label">1. ¿A qué parte de la matriz deseas aplicar el cambio?</label>
                  <div className="grid-3 gap-2">
                    <button
                      type="button"
                      className={`btn flex items-center justify-center gap-1.5 ${globalScope === 'ROW' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: '0.78rem', fontWeight: 700, padding: '8px' }}
                      onClick={() => setGlobalScope('ROW')}
                    >
                      <Layers size={14} /> Fila Completa
                    </button>

                    <button
                      type="button"
                      className={`btn flex items-center justify-center gap-1.5 ${globalScope === 'DAY' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: '0.78rem', fontWeight: 700, padding: '8px' }}
                      onClick={() => setGlobalScope('DAY')}
                    >
                      <Calendar size={14} /> Día Completo
                    </button>

                    <button
                      type="button"
                      className={`btn flex items-center justify-center gap-1.5 ${globalScope === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: '0.78rem', fontWeight: 700, padding: '8px' }}
                      onClick={() => setGlobalScope('ALL')}
                    >
                      <RefreshCw size={14} /> Toda la Matriz
                    </button>
                  </div>
                </div>

                {/* Scope selector dropdown */}
                {globalScope === 'ROW' && (
                  <div className="form-group">
                    <label className="form-label">Selecciona la Fila / Área a Editar</label>
                    <select
                      className="form-select"
                      value={selectedRowId}
                      onChange={e => setSelectedRowId(e.target.value)}
                    >
                      {rosterRows.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.area} {r.shiftTime ? `(${r.shiftTime})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {globalScope === 'DAY' && (
                  <div className="form-group">
                    <label className="form-label">Selecciona el Día a Editar</label>
                    <select
                      className="form-select"
                      value={selectedDayIdx}
                      onChange={e => setSelectedDayIdx(Number(e.target.value))}
                    >
                      {daysHeader.map((d, i) => (
                        <option key={i} value={i}>
                          {d.day} {d.date} de la semana
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. MODO DE ACCIÓN */}
                <div className="form-group">
                  <label className="form-label">2. Modo de Operación</label>
                  <select
                    className="form-select"
                    value={globalMode}
                    onChange={e => setGlobalMode(e.target.value as any)}
                  >
                    <option value="ADD">Agregar Asignación (Mantiene las existentes)</option>
                    <option value="REPLACE">Reemplazar Todo (Sobrescribe las celdas)</option>
                    <option value="CLEAR">Vaciar / Dejar en Blanco</option>
                  </select>
                </div>

                {/* 3. SELECCIÓN DE VALOR SI NO ES VACIAL */}
                {globalMode !== 'CLEAR' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">3. Selecciona el Estado o Texto a Aplicar</label>
                      <div className="grid-2 gap-2 mb-2">
                        <button
                          type="button"
                          className="btn flex items-center justify-center gap-1.5"
                          style={{ background: '#10b981', color: '#fff', fontSize: '0.78rem', fontWeight: 800 }}
                          onClick={() => { setGlobalText('DESCANSO'); setGlobalType('DESCANSO'); }}
                        >
                          DESCANSO (Verde)
                        </button>
                        <button
                          type="button"
                          className="btn flex items-center justify-center gap-1.5"
                          style={{ background: '#0284c7', color: '#fff', fontSize: '0.78rem', fontWeight: 800 }}
                          onClick={() => { setGlobalText('CAMBIO TURNO'); setGlobalType('CAMBIO_TURNO'); }}
                        >
                          CAMBIO TURNO (Azul)
                        </button>
                        <button
                          type="button"
                          className="btn flex items-center justify-center gap-1.5"
                          style={{ background: '#eab308', color: '#000', fontSize: '0.78rem', fontWeight: 800 }}
                          onClick={() => { setGlobalText('DOBLE TURNO'); setGlobalType('DOBLE_TURNO'); }}
                        >
                          DOBLE TURNO (Amarillo)
                        </button>
                        <button
                          type="button"
                          className="btn flex items-center justify-center gap-1.5"
                          style={{ background: '#f97316', color: '#fff', fontSize: '0.78rem', fontWeight: 800 }}
                          onClick={() => { setGlobalText('CAMBIO AREA'); setGlobalType('CAMBIO_AREA'); }}
                        >
                          CAMBIO ÁREA (Naranja)
                        </button>
                      </div>

                      <div className="flex gap-1.5 flex-wrap mt-2">
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', alignSelf: 'center' }}>O selecciona un empleado:</span>
                        {availableNames.map((n, i) => (
                          <button
                            key={i}
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                            onClick={() => { setGlobalText(n); setGlobalType('NORMAL'); }}
                          >
                            + {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Texto Seleccionado a Aplicar</label>
                      <input
                        type="text"
                        className="form-input"
                        value={globalText}
                        onChange={e => setGlobalText(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowGlobalModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-warning flex items-center gap-2">
                    <Zap size={16} />
                    Aplicar Cambio Global
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Create New Area / Row */}
        {showAddRowModal && (
          <div className="modal-overlay" onClick={() => setShowAddRowModal(false)}>
            <div className="modal animate-slide-up" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Agregar Área / Turno a la Matriz</h3>
                <button className="modal-close" onClick={() => setShowAddRowModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRow} className="flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">Nombre del Área</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. COCINA, REPOSTERÍA, BARRA, SERVICIO"
                    value={newRowArea}
                    onChange={e => setNewRowArea(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Horario / Turno (Ej. 7AM-3PM, 3PM-11PM)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 7AM-3PM, 8AM-5PM, 3PM-11PM"
                    value={newRowShift}
                    onChange={e => setNewRowShift(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowAddRowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Crear Fila
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal: Edit Row Area & Shift Time */}
        {editRowModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setEditRowModal(null)}
          >
            <div
              className="animate-slide-up"
              style={{
                width: '100%',
                maxWidth: 480,
                background: '#ffffff',
                border: '1px solid rgba(234, 88, 12, 0.3)',
                borderRadius: 20,
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 25px rgba(234, 88, 12, 0.12)',
                padding: '24px',
                color: '#0f172a',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit2 size={18} color="#ea580c" />
                  Editar Área y Horario de Fila
                </h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ borderRadius: '50%', width: 32, height: 32, background: '#f1f5f9', color: '#64748b' }}
                  onClick={() => setEditRowModal(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRowEdit} className="flex flex-col gap-4">
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                    Nombre del Área
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editRowModal.area}
                    onChange={e => setEditRowModal({ ...editRowModal, area: e.target.value })}
                    required
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, borderRadius: 10, padding: '10px 14px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                    Horario del Turno (ej. 7AM-3PM, 8AM-5PM, 3PM-11PM)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editRowModal.shiftTime}
                    onChange={e => setEditRowModal({ ...editRowModal, shiftTime: e.target.value })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, borderRadius: 10, padding: '10px 14px' }}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setEditRowModal(null)}
                    style={{ fontWeight: 700, color: '#64748b' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#ffffff', fontWeight: 800, borderRadius: 10, padding: '10px 20px', border: 'none', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Header Dates & Day Labels */}
        {showEditHeaderModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowEditHeaderModal(false)}
          >
            <div
              className="animate-slide-up"
              style={{
                width: '100%',
                maxWidth: 600,
                background: '#ffffff',
                border: '1px solid rgba(234, 88, 12, 0.3)',
                borderRadius: 20,
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                padding: '24px',
                color: '#0f172a',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} color="#ea580c" />
                  Personalizar Fechas y Encabezados del Rol
                </h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ borderRadius: '50%', width: 32, height: 32, background: '#f1f5f9', color: '#64748b' }}
                  onClick={() => setShowEditHeaderModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3 my-2">
                <p style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                  Edita la letra del día (L, M, M...) y el número de fecha (24, 25...) para cada uno de los 7 días de la semana:
                </p>

                <div className="grid-7 gap-2">
                  {daysHeader.map((d, idx) => (
                    <div key={idx} className="flex flex-col gap-1 p-2.5 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', textAlign: 'center' }}>
                        Día {idx + 1}
                      </label>
                      <input
                        type="text"
                        className="form-input text-center"
                        style={{ padding: '6px 4px', fontSize: '0.88rem', fontWeight: 800, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                        value={d.day}
                        onChange={e => handleUpdateHeaderDay(idx, e.target.value, d.date)}
                        placeholder="Día"
                      />
                      <input
                        type="text"
                        className="form-input text-center"
                        style={{ padding: '6px 4px', fontSize: '0.82rem', fontWeight: 700, background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                        value={d.date}
                        onChange={e => handleUpdateHeaderDay(idx, d.day, e.target.value)}
                        placeholder="Fecha"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-5 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#ffffff', fontWeight: 800, borderRadius: 10, padding: '10px 20px', border: 'none' }}
                  onClick={() => setShowEditHeaderModal(false)}
                >
                  Aceptar y Guardar Encabezados
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Flexible Schedule Report Configuration (PDF & Excel) */}
        {showReportConfigModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowReportConfigModal(false)}
          >
            <div
              className="animate-slide-up"
              style={{
                width: '100%',
                maxWidth: 580,
                background: '#ffffff',
                border: '1px solid rgba(225, 29, 72, 0.3)',
                borderRadius: 20,
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                padding: '24px',
                color: '#0f172a',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={18} color="#e11d48" />
                  Configurar y Exportar Reporte de Horarios ({reportFormat})
                </h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ borderRadius: '50%', width: 32, height: 32, background: '#f1f5f9', color: '#64748b' }}
                  onClick={() => setShowReportConfigModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4 my-2">
                <div className="p-3.5 rounded-xl" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <div className="flex items-center gap-2" style={{ color: '#047857', fontWeight: 800, fontSize: '0.82rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Reporte Exclusivo de Horarios (Pure Roster)</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#065f46', marginTop: 2 }}>
                    Este reporte tomará única y exclusivamente la información programada en la matriz de turnos activa.
                  </p>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                    Título Principal del Reporte
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={reportConfig.title}
                    onChange={e => setReportConfig({ ...reportConfig, title: e.target.value })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, borderRadius: 10, padding: '10px 14px' }}
                  />
                </div>

                <div className="grid-2 gap-3">
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                      Elaboró / Responsables
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={reportConfig.prepBy}
                      onChange={e => setReportConfig({ ...reportConfig, prepBy: e.target.value })}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, borderRadius: 10, padding: '10px 14px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                      Autorizó / Firma
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={reportConfig.approvedBy}
                      onChange={e => setReportConfig({ ...reportConfig, approvedBy: e.target.value })}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, borderRadius: 10, padding: '10px 14px' }}
                    />
                  </div>
                </div>

                {reportFormat === 'PDF' && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                      Orientación de Página (PDF)
                    </label>
                    <div className="grid-2 gap-2">
                      <button
                        type="button"
                        className={`btn ${reportConfig.orientation === 'landscape' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setReportConfig({ ...reportConfig, orientation: 'landscape' })}
                        style={{ fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        Horizontal (Landscape)
                      </button>
                      <button
                        type="button"
                        className={`btn ${reportConfig.orientation === 'portrait' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setReportConfig({ ...reportConfig, orientation: 'portrait' })}
                        style={{ fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        Vertical (Portrait)
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportConfig.includeSummary}
                      onChange={e => setReportConfig({ ...reportConfig, includeSummary: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      Incluir Hoja/Sección de Resumen por Empleado y Horas Programadas
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportConfig.includeLegend}
                      onChange={e => setReportConfig({ ...reportConfig, includeLegend: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      Incluir Leyenda de Colores (Descanso, Doble Turno, Cambio Turno, Cambio Área)
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.5px' }}>
                    Notas u Observaciones del Pie
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={reportConfig.notes}
                    onChange={e => setReportConfig({ ...reportConfig, notes: e.target.value })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, borderRadius: 10, padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReportConfigModal(false)} style={{ fontWeight: 700, color: '#64748b' }}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex items-center gap-2"
                  style={{ background: reportFormat === 'PDF' ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'linear-gradient(135deg, #059669, #047857)', color: '#ffffff', fontWeight: 800, borderRadius: 10, padding: '10px 20px', border: 'none' }}
                  onClick={() => {
                    setShowReportConfigModal(false);
                    if (reportFormat === 'PDF') {
                      exportRosterToPDFWithConfig();
                    } else {
                      exportRosterToExcelWithConfig();
                    }
                  }}
                >
                  <Download size={16} />
                  <span>Generar Reporte {reportFormat}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
