if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_API_URL');
}
export const API_BASE = process.env.NEXT_PUBLIC_API_URL;


// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  refreshToken: string;
  role: 'SUPERUSER' | 'ADMIN' | 'EMPLOYEE';
  fullName: string;
  userId: number;
  branchId: number | null;
  branchName: string | null;
  shiftType: 'MORNING' | 'EVENING' | 'SUNDAY' | null;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let errorMsg = 'Error al iniciar sesión';
    try {
      const err = await res.json();
      if (err && err.error) errorMsg = err.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export interface RegisterData {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  branchId: number;
  shiftType: 'MORNING' | 'EVENING' | 'SUNDAY';
}

export async function registerEmployee(data: RegisterData): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errorMsg = 'Error al registrar empleado';
    try {
      const err = await res.json();
      if (err && err.error) errorMsg = err.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function getPublicBranches(): Promise<Branch[]> {
  const res = await fetch(`${API_BASE}/api/branches/public`);
  if (!res.ok) return [];
  return res.json();
}

// ─── API Client helper ────────────────────────────────────────────────────────

export function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  shift: 'MORNING' | 'EVENING' | 'SUNDAY';
  checkIn: string;
  checkOut: string;
  status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'IN_SHIFT' | 'EXCUSED';
  lateMinutes: number;
  hoursWorked: number;
}

export interface DashboardStats {
  onTime: number;
  late: number;
  absent: number;
  date: string;
}

export const attendanceApi = {
  checkIn: (lat: number, lng: number) =>
    apiFetch<AttendanceRecord>('/api/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    }),

  checkOut: (lat: number, lng: number) =>
    apiFetch<AttendanceRecord>('/api/attendance/checkout', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    }),

  getToday: () => apiFetch<AttendanceRecord | null>('/api/attendance/today'),

  getDaily: (date?: string) =>
    apiFetch<AttendanceRecord[]>(`/api/attendance/admin/daily${date ? `?date=${date}` : ''}`),

  getMonthly: (year: number, month: number) =>
    apiFetch<AttendanceRecord[]>(`/api/attendance/admin/monthly?year=${year}&month=${month}`),

  getStats: (date?: string) =>
    apiFetch<DashboardStats>(`/api/attendance/admin/stats${date ? `?date=${date}` : ''}`),

  update: (id: number, data: Partial<{ checkInTime: string; checkOutTime: string; status: string; notes: string }>) =>
    apiFetch<AttendanceRecord>(`/api/attendance/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Descarga el Excel de Pre-Nómina como un blob y lo guarda en el navegador. */
  downloadPayroll: async (year: number, month: number): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(
      `${API_BASE}/api/attendance/admin/payroll?year=${year}&month=${month}`,
      { headers: { Authorization: token ? `Bearer ${token}` : '' } }
    );
    if (!res.ok) throw new Error(`Error ${res.status} al descargar Pre-Nómina`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `prenomina_${month}_${year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ─── Employees ────────────────────────────────────────────────────────────────

export interface Employee {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  shiftType: 'MORNING' | 'EVENING' | 'SUNDAY' | '';
  active: boolean;
  profilePicture: string;
  branchId: number;
  branchName: string;
}

export const employeeApi = {
  getAll: () => apiFetch<Employee[]>('/api/employees'),
  getById: (id: number) => apiFetch<Employee>(`/api/employees/${id}`),
  create: (data: { username: string; password: string; fullName: string; email?: string; shiftType: string }) =>
    apiFetch<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Employee>) =>
    apiFetch<Employee>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActive: (id: number) =>
    apiFetch(`/api/employees/${id}/toggle`, { method: 'PATCH' }),
  changePassword: (id: number, password: string) =>
    apiFetch(`/api/employees/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
};

// ─── Branches ─────────────────────────────────────────────────────────────────

export interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  toleranceMinutes: number;
  active: boolean;
}

export const branchApi = {
  getAll: () => apiFetch<Branch[]>('/api/branches'),
  getById: (id: number) => apiFetch<Branch>(`/api/branches/${id}`),
  create: (data: Omit<Branch, 'id' | 'active'>) =>
    apiFetch<Branch>('/api/branches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Branch>) =>
    apiFetch<Branch>(`/api/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/api/branches/${id}`, { method: 'DELETE' }),
};

// ─── Admins ───────────────────────────────────────────────────────────────────

export const adminApi = {
  getAll: () => apiFetch<Employee[]>('/api/admins'),
  create: (data: { username: string; password: string; fullName: string; email?: string; branchId: number }) =>
    apiFetch<Employee>('/api/admins', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { fullName: string; email: string }) =>
    apiFetch<Employee>(`/api/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActive: (id: number) =>
    apiFetch(`/api/admins/${id}/toggle`, { method: 'PATCH' }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportApi = {
  getMonthly: (year: number, month: number) =>
    apiFetch<AttendanceRecord[]>(`/api/reports/monthly?year=${year}&month=${month}`),

  downloadExcel: async (year: number, month: number) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/reports/excel?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al descargar el reporte');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencia-${year}-${String(month).padStart(2, '0')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ─── Schedules ────────────────────────────────────────────────────────────────

export type RosterStatus = 'NORMAL' | 'DESCANSO' | 'CAMBIO_TURNO' | 'DOBLE_TURNO' | 'CAMBIO_AREA';

export interface RosterCell {
  id?: number;
  rowKey: string;
  areaName: string;
  shiftTime: string;
  dayIndex: number;
  employeeName: string;
  statusType: RosterStatus;
  weekStart: string;
  branchId?: number;
}

export const scheduleApi = {
  /** Carga la matriz semanal de una sucursal. */
  getRoster: (branchId: number, weekStart: string) =>
    apiFetch<RosterCell[]>(`/api/schedules?branchId=${branchId}&weekStart=${weekStart}`),

  /** Lista de semanas con datos para una sucursal. */
  getAvailableWeeks: (branchId: number) =>
    apiFetch<string[]>(`/api/schedules/weeks?branchId=${branchId}`),

  /** Guarda (reemplaza) la matriz completa de una semana. */
  saveRoster: (branchId: number, weekStart: string, cells: Omit<RosterCell, 'id' | 'branchId'>[]) =>
    apiFetch<{ saved: number; weekStart: string; branchId: number }>('/api/schedules/save', {
      method: 'POST',
      body: JSON.stringify({ branchId, weekStart, cells }),
    }),

  /** Elimina toda la semana de una sucursal. */
  deleteRoster: (branchId: number, weekStart: string) =>
    apiFetch(`/api/schedules?branchId=${branchId}&weekStart=${weekStart}`, { method: 'DELETE' }),
};

// ─── Leave Requests ───────────────────────────────────────────────────────────

export type LeaveType    = 'PERMISO' | 'INCAPACIDAD' | 'VACACIONES' | 'JUSTIFICANTE';
export type LeaveStatus  = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  requestType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  evidenceUrl?: string;
  status: LeaveStatus;
  adminNotes?: string;
  reviewedBy?: number;
  createdAt: string;
}

export const leaveApi = {
  /** Mis solicitudes (empleado autenticado). */
  getMyRequests: () => apiFetch<LeaveRequest[]>('/api/leaves/me'),

  /** Crear solicitud (empleado). */
  create: (data: {
    requestType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    evidenceUrl?: string;
  }) => apiFetch<LeaveRequest>('/api/leaves', { method: 'POST', body: JSON.stringify(data) }),

  /** Todas las solicitudes de la sucursal (admin). */
  getBranchRequests: (branchId?: number, pending = false) =>
    apiFetch<LeaveRequest[]>(
      `/api/leaves/admin?pending=${pending}${branchId ? `&branchId=${branchId}` : ''}`
    ),

  /** Aprobar solicitud (admin). */
  approve: (id: number, adminNotes?: string) =>
    apiFetch<LeaveRequest>(`/api/leaves/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes }),
    }),

  /** Rechazar solicitud (admin). */
  reject: (id: number, adminNotes: string) =>
    apiFetch<LeaveRequest>(`/api/leaves/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes }),
    }),
};

// ─── Geolocation helper ───────────────────────────────────────────────────────

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu dispositivo no soporta geolocalización'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        reject(new Error('Permiso de ubicación denegado. No puedes registrar asistencia.'));
      } else {
        reject(new Error('No se pudo obtener tu ubicación. Intenta de nuevo.'));
      }
    }, { timeout: 10000, enableHighAccuracy: true });
  });
}

// ─── Shift labels ─────────────────────────────────────────────────────────────

export const SHIFT_LABELS: Record<string, string> = {
  MORNING: 'Matutino (7:00–15:00)',
  EVENING: 'Vespertino (15:00–23:00)',
  SUNDAY:  'Dominical (8:00–18:00)',
};

export const STATUS_LABELS: Record<string, string> = {
  ON_TIME:  'Puntual',
  LATE:     'Tardanza',
  ABSENT:   'Falta',
  IN_SHIFT: 'En turno',
  EXCUSED:  'Justificado',
};

export const STATUS_COLORS: Record<string, string> = {
  ON_TIME:  '#10b981',
  LATE:     '#f59e0b',
  ABSENT:   '#ef4444',
  IN_SHIFT: '#6366f1',
  EXCUSED:  '#8b5cf6',
};
