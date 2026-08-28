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

  // Single Cell Edit Modal State
  const [editModal, setEditModal] = useState<{
    rowId: string;
    dayIndex: number;
    area: string;
    shiftTime: string;
    dayLabel: string;
  } | null>(null);

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
    const updated = rosterRows.map(r => {
      if (r.id === rowId) {
        const existing = r.employees[dayIndex] || [];
        return {
          ...r,
          employees: {
            ...r.employees,
            [dayIndex]: [...existing, { text: text.trim().toUpperCase(), type }],
          },
        };
      }
      return r;
    });
    saveRoster(updated);
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
  // EXPORT TO EXCEL
  // -------------------------------------------------------------
  const exportRosterToExcel = () => {
    const headerRow = ['ÁREA / TURNO', ...daysHeader.map(d => `${d.day} ${d.date}`)];
    const rowsData: any[] = [headerRow];

    rosterRows.forEach(row => {
      const areaLabel = `${row.area} ${row.shiftTime ? `(${row.shiftTime})` : ''}`;
      const cellValues = daysHeader.map((_, dayIdx) => {
        const items = row.employees[dayIdx] || [];
        return items.map(i => `${i.text}${i.type !== 'NORMAL' ? ` (${i.type})` : ''}`).join(' / ') || '';
      });
      rowsData.push([areaLabel, ...cellValues]);
    });

    rowsData.push([]);
    rowsData.push(['BALANCE GENERAL Y HORAS EXTRA ACUMULADAS']);
    rowsData.push(['Empleado', 'Área Principal', 'Días Trab.', 'Descansos', 'Dobles', 'Horas Prog.', 'Horas Reales', 'Horas Extra', 'Balance Carga']);

    employeeBalances.forEach(b => {
      rowsData.push([
        b.name,
        b.primaryArea,
        b.workDays,
        b.restDays,
        b.doubleShifts,
        `${b.totalScheduledHours} hrs`,
        `${b.actualWorkedHours} hrs`,
        `+${b.overtimeHours} hrs extra`,
        b.statusBalance,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rowsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rol Semanal y Horas Extra');

    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];

    XLSX.writeFile(workbook, `Rol_Semanal_y_Horas_Extra_${user?.branchName || 'Empresa'}.xlsx`);
  };

  // -------------------------------------------------------------
  // EXPORT TO PDF (WITH COLOR PARAMETERS HIGHLIGHT & LEGEND BOXES)
  // -------------------------------------------------------------
  const exportRosterToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Page Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ROL SEMANAL DE HORARIOS Y TURNOS DE TRABAJO', 14, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Sucursal: ${user?.branchName || 'Sucursal Central'} | Emitido: ${new Date().toLocaleDateString('es-MX')}`, 14, 19);

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
        0: { cellWidth: 35, fillColor: [248, 250, 252], fontStyle: 'bold' },
        1: { cellWidth: 34 },
        2: { cellWidth: 34 },
        3: { cellWidth: 34 },
        4: { cellWidth: 34 },
        5: { cellWidth: 34 },
        6: { cellWidth: 34 },
        7: { cellWidth: 34 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const rowIndex = data.row.index;
          const dayIndex = data.column.index - 1;
          const rowData = rosterRows[rowIndex];
          if (rowData) {
            const items = rowData.employees[dayIndex] || [];

            // Check if cell contains status types or keywords
            const hasDescanso = items.some(i => i.type === 'DESCANSO' || i.text.toUpperCase().includes('DESCANSO'));
            const hasCambioTurno = items.some(i => i.type === 'CAMBIO_TURNO' || i.text.toUpperCase().includes('CAMBIO TURNO'));
            const hasDobleTurno = items.some(i => i.type === 'DOBLE_TURNO' || i.text.toUpperCase().includes('DOBLE TURNO'));
            const hasCambioArea = items.some(i => i.type === 'CAMBIO_AREA' || i.text.toUpperCase().includes('CAMBIO AREA'));

            if (hasDescanso) {
              data.cell.styles.fillColor = [16, 185, 129]; // Green
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else if (hasCambioTurno) {
              data.cell.styles.fillColor = [2, 132, 199]; // Blue
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else if (hasDobleTurno) {
              data.cell.styles.fillColor = [234, 179, 8]; // Yellow
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            } else if (hasCambioArea) {
              data.cell.styles.fillColor = [249, 115, 22]; // Orange
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
    });

    const finalY1 = (doc as any).lastAutoTable.finalY || 160;

    // COLOR LEGEND BOXES ON PAGE 1
    doc.setFillColor(16, 185, 129); doc.rect(14, finalY1 + 6, 26, 6, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('DESCANSO', 17, finalY1 + 10.2);

    doc.setFillColor(2, 132, 199); doc.rect(44, finalY1 + 6, 30, 6, 'F');
    doc.text('CAMBIO TURNO', 46, finalY1 + 10.2);

    doc.setFillColor(234, 179, 8); doc.rect(78, finalY1 + 6, 28, 6, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text('DOBLE TURNO', 80, finalY1 + 10.2);

    doc.setFillColor(249, 115, 22); doc.rect(110, finalY1 + 6, 28, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('CAMBIO AREA', 112, finalY1 + 10.2);

    // SIGNATURE LINES ON PAGE 1
    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalY1 + 22, 90, finalY1 + 22);
    doc.line(200, finalY1 + 22, 276, finalY1 + 22);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Gerente de Operaciones', 14, finalY1 + 26);
    doc.text('Firma y Sello Recursos Humanos', 200, finalY1 + 26);

    // Page 2: Balance General & Horas Extra Table (Solo ADMIN y SUPERUSER)
    if (!isReadOnly) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('BALANCE GENERAL Y CONTROL DE HORAS EXTRA (CHECK-OUT)', 14, 14);

      const balanceHeaders = [
        ['Empleado', 'Área Principal', 'Días Trab.', 'Descansos', 'Dobles', 'Horas Prog.', 'Horas Reales', 'Horas Extra (Checkout)', 'Balance Carga']
      ];

      const balanceRows = employeeBalances.map(b => [
        b.name,
        b.primaryArea,
        `${b.workDays} d`,
        `${b.restDays} d`,
        `${b.doubleShifts}`,
        `${b.totalScheduledHours}h`,
        `${b.actualWorkedHours}h`,
        `+${b.overtimeHours}h extra`,
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
      doc.line(14, finalY2 + 22, 90, finalY2 + 22);
      doc.line(200, finalY2 + 22, 276, finalY2 + 22);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Firma Gerente de Operaciones', 14, finalY2 + 26);
      doc.text('Firma y Sello Recursos Humanos', 200, finalY2 + 26);
    }

    doc.save(`Rol_Semanal_${user?.branchName || 'Empresa'}.pdf`);
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
        <div className="page-header mb-6">
          <div>
            <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Rol Semanal y Control de Horas Extra
            </h1>
          </div>

          <div className="page-actions">
            {!isReadOnly && (
              <>
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
                  <span>Cambio Global / Masivo</span>
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
                  onClick={exportRosterToExcel}
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
              onClick={exportRosterToPDF}
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
              <span>Exportar PDF</span>
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
                              className="btn btn-ghost btn-sm p-1"
                              onClick={() => openGlobalModalForRow(row.id)}
                              title={`Edición global para fila ${row.area}`}
                              style={{ color: '#fbbf24', borderRadius: 4 }}
                            >
                              <Zap size={13} />
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
          <div className="card mb-8 animate-slide-up">
            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <Scale size={20} color="#e11d48" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Balance General: Empleado vs. Horarios y Horas Extra</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Desglose de horas programadas, horas reales trabajadas y horas extra tras check-out</p>
                </div>
              </div>
              <span className="badge badge-primary flex items-center gap-1">
                <Timer size={12} />
                {totalOvertimeHours}h Extra Totales
              </span>
            </div>

            {/* KPI Row for Balance */}
            <div className="grid-3 gap-3 mb-6">
              <div className="p-3 rounded-lg" style={{ background: '#f8f6f0', border: '1px solid #e5e1da' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Horas Extra Registradas</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#e11d48' }}>+{totalOvertimeHours}h extra</div>
              </div>

              <div className="p-3 rounded-lg" style={{ background: '#f8f6f0', border: '1px solid #e5e1da' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Turnos Dobles Detectados</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706' }}>{totalDoubleShifts} dobles</div>
              </div>

              <div className="p-3 rounded-lg" style={{ background: '#f8f6f0', border: '1px solid #e5e1da' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Descansos Programados</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669' }}>{totalRestDays} descansos</div>
              </div>
            </div>

            {/* Balance Table with Overtime column */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Área Principal</th>
                    <th>Días Trab.</th>
                    <th>Descansos</th>
                    <th>Horas Programadas</th>
                    <th>Horas Reales Trab.</th>
                    <th>Horas Extra (Checkout)</th>
                    <th>Balance Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeBalances.map(b => (
                    <tr key={b.name}>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{b.name}</td>
                      <td style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>{b.primaryArea}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.workDays} días</td>
                      <td>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{b.restDays} días</span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#e11d48' }}>{b.totalScheduledHours}h</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.actualWorkedHours}h</td>
                      <td>
                        {b.overtimeHours > 0 ? (
                          <span
                            style={{
                              background: 'rgba(192, 132, 252, 0.18)',
                              border: '1px solid rgba(192, 132, 252, 0.4)',
                              color: '#c084fc',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Timer size={12} />
                            +{b.overtimeHours}h extra
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-faint)' }}>0.0h</span>
                        )}
                      </td>
                      <td>
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
        {/* MODAL 1: EDICIÓN INDIVIDUAL DE CELDA */}
        {/* ----------------------------------------------------------------- */}
        {editModal && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setEditModal(null)}
          >
            <div
              className="modal animate-slide-up"
              style={{
                width: '100%',
                maxWidth: 520,
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#0f172a',
                border: '1px solid rgba(225, 29, 72, 0.3)',
                borderRadius: 20,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
                padding: '24px',
                color: '#f8fafc',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: 6 }}>
                    Edición de Casilla — {editModal.area}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editModal.shiftTime && (
                      <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', border: '1px solid rgba(2, 132, 199, 0.4)', fontWeight: 800, fontSize: '0.72rem', padding: '3px 8px' }}>
                        {editModal.shiftTime}
                      </span>
                    )}
                    <span className="badge" style={{ background: 'rgba(234, 88, 12, 0.2)', color: '#f97316', border: '1px solid rgba(234, 88, 12, 0.4)', fontWeight: 800, fontSize: '0.72rem', padding: '3px 8px' }}>
                      Día: {editModal.dayLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ borderRadius: '50%', width: 32, height: 32, color: '#94a3b8' }}
                  onClick={() => setEditModal(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* CURRENT CELL ITEMS WITH DIRECT COLOR CHANGE CONTROLS FOR EACH EMPLOYEE */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Empleados Asignados en este Turno:
                  </label>
                  {(() => {
                    const targetRow = rosterRows.find(r => r.id === editModal.rowId);
                    const currentItems = targetRow?.employees[editModal.dayIndex] || [];
                    if (currentItems.length > 0) {
                      return (
                        <button
                          className="btn btn-ghost btn-sm flex items-center gap-1"
                          style={{ fontSize: '0.72rem', color: '#f43f5e', padding: '2px 8px', borderRadius: 6 }}
                          onClick={() => handleClearDayCell(editModal.rowId, editModal.dayIndex)}
                        >
                          <Trash2 size={12} /> Limpiar Celda
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                {(() => {
                  const targetRow = rosterRows.find(r => r.id === editModal.rowId);
                  const currentItems = targetRow?.employees[editModal.dayIndex] || [];
                  if (currentItems.length === 0) {
                    return (
                      <div className="p-4 text-center rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.12)' }}>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Celda vacía. Selecciona un empleado abajo para asignarlo.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-2">
                      {currentItems.map((item, idx) => {
                        const st = getBadgeStyle(item.type);
                        const initials = item.text.split(' ').map(w => w[0]).join('').slice(0, 2);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl"
                            style={{
                              background: 'rgba(30, 41, 59, 0.8)',
                              border: `1px solid ${item.type !== 'NORMAL' ? st.bg : 'rgba(255,255,255,0.1)'}`,
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  background: st.bg,
                                  color: st.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                                {item.text}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                style={{
                                  background: item.type === 'NORMAL' ? '#334155' : 'transparent',
                                  color: item.type === 'NORMAL' ? '#fff' : '#94a3b8',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '3px 7px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'NORMAL')}
                              >
                                Normal
                              </button>

                              <button
                                type="button"
                                style={{
                                  background: item.type === 'DESCANSO' ? '#10b981' : 'transparent',
                                  color: item.type === 'DESCANSO' ? '#fff' : '#34d399',
                                  border: item.type === 'DESCANSO' ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: 6,
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '3px 7px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'DESCANSO')}
                              >
                                Descanso
                              </button>

                              <button
                                type="button"
                                style={{
                                  background: item.type === 'CAMBIO_TURNO' ? '#0284c7' : 'transparent',
                                  color: item.type === 'CAMBIO_TURNO' ? '#fff' : '#38bdf8',
                                  border: item.type === 'CAMBIO_TURNO' ? 'none' : '1px solid rgba(2, 132, 199, 0.3)',
                                  borderRadius: 6,
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '3px 7px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'CAMBIO_TURNO')}
                              >
                                C. Turno
                              </button>

                              <button
                                type="button"
                                style={{
                                  background: item.type === 'DOBLE_TURNO' ? '#eab308' : 'transparent',
                                  color: item.type === 'DOBLE_TURNO' ? '#000' : '#fbbf24',
                                  border: item.type === 'DOBLE_TURNO' ? 'none' : '1px solid rgba(234, 179, 8, 0.3)',
                                  borderRadius: 6,
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '3px 7px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => updateItemType(editModal.rowId, editModal.dayIndex, idx, 'DOBLE_TURNO')}
                              >
                                Doble
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveCell(editModal.rowId, editModal.dayIndex, idx)}
                                style={{
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.3)',
                                  borderRadius: 6,
                                  width: 24,
                                  height: 24,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#f43f5e',
                                  cursor: 'pointer',
                                  marginLeft: 4,
                                }}
                                title="Quitar de celda"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 2: ADD EMPLOYEE CHIPS (DEDUPLICATED) */}
              <div className="mb-5" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'block' }}>
                  + Agregar Empleado a este Turno:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {uniqueAvailableNames.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn flex items-center gap-1.5 hover:scale-[1.03] transition-all"
                      style={{
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f1f5f9',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '6px 14px',
                        borderRadius: 20,
                      }}
                      onClick={() => quickAddCell(name, 'NORMAL')}
                    >
                      <UserPlus size={12} color="#60a5fa" />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: STANDALONE CONVENTION STATUS CHIPS */}
              <div className="mb-5">
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'block' }}>
                  + O Agregar Etiqueta de Estado Especial:
                </label>

                <div className="grid-2 gap-2.5">
                  <button
                    type="button"
                    className="btn flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.35))',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                    onClick={() => quickAddCell('DESCANSO', 'DESCANSO')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    + DESCANSO
                  </button>

                  <button
                    type="button"
                    className="btn flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(2, 132, 199, 0.35))',
                      border: '1px solid #0284c7',
                      color: '#38bdf8',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                    onClick={() => quickAddCell('CAMBIO TURNO', 'CAMBIO_TURNO')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                    + CAMBIO TURNO
                  </button>

                  <button
                    type="button"
                    className="btn flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.35))',
                      border: '1px solid #eab308',
                      color: '#fbbf24',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                    onClick={() => quickAddCell('DOBLE TURNO', 'DOBLE_TURNO')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
                    + DOBLE TURNO
                  </button>

                  <button
                    type="button"
                    className="btn flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.35))',
                      border: '1px solid #f97316',
                      color: '#fb923c',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                    onClick={() => quickAddCell('CAMBIO AREA', 'CAMBIO_AREA')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                    + CAMBIO ÁREA
                  </button>
                </div>
              </div>

              {/* SECTION 4: OPTIONAL CUSTOM NOTE INPUT */}
              <div className="mb-5" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>
                  Nota o Horario Especial (Opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. HIBERT 6PM, C-11-5, 8AM-6PM"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    style={{ background: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(255,255,255,0.12)' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customInput.trim()) {
                        quickAddCell(customInput, 'NORMAL');
                        setCustomInput('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary flex items-center gap-1.5 px-4"
                    onClick={() => {
                      if (customInput.trim()) {
                        quickAddCell(customInput, 'NORMAL');
                        setCustomInput('');
                      }
                    }}
                  >
                    <CornerDownLeft size={14} />
                    Agregar
                  </button>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', height: 42, fontSize: '0.9rem', fontWeight: 800 }}
                  onClick={() => setEditModal(null)}
                >
                  Guardar y Cerrar
                </button>
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
      </main>
    </div>
  );
}
