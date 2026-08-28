'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentPosition, attendanceApi, AttendanceRecord, STATUS_LABELS } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  Play,
  Square,
  CheckCircle2,
  MapPin,
  MapPinOff,
  Loader2,
  LogOut,
  Clock3,
  Sun,
  Sunset,
  Calendar,
  Timer,
  AlertCircle,
  AlertTriangle,
  Flame,
  Laugh,
} from 'lucide-react';
import InstallPwaCard from '@/components/InstallPwaCard';
import Sidebar from '@/components/Sidebar';
import RewardsLeaderboard from '@/components/RewardsLeaderboard';
import ScreenGuard from '@/components/ScreenGuard';

type LocationStatus = 'idle' | 'loading' | 'ok' | 'error';

const SHIFT_TIMES: Record<string, string> = {
  MORNING: '7:00 – 15:00',
  EVENING: '15:00 – 23:00',
  SUNDAY:  '8:00 – 18:00',
  MIXED:   '11:00 – 19:00',
};

const SHIFT_NAMES: Record<string, string> = {
  MORNING: 'Matutino',
  EVENING: 'Vespertino',
  SUNDAY:  'Dominical',
  MIXED:   'Mixto',
};

const SHIFT_ICONS: Record<string, React.ReactNode> = {
  MORNING: <Sun size={13} />,
  EVENING: <Sunset size={13} />,
  SUNDAY:  <Calendar size={13} />,
  MIXED:   <Clock3 size={13} />,
};

const SARCASTIC_LATE_COMMENTS = [
  "¿Se te pegaron las sábanas o el tráfico solo te odia a ti hoy? 🛌⏰",
  "¡Casi llegas a tiempo para el turno de mañana! 🐢☀️",
  "El despertador se inventó en 1787... por si tenías la duda. ⏰😅",
  "Llegaste tan tarde que el café ya hasta se enfrió. ☕🚶‍♂️",
  "¿Trajiste justificación o nomás ganas de romper récords de impuntualidad? 🏎️💨",
  "Un minuto más tarde y te cobramos renta en la entrada. 🚪⌚",
  "Tranquilo, la puntualidad está sobrevalorada de todos modos... (dijo nadie nunca). 😜🔥",
  "Leyendas cuentan que algún día llegarás antes de la hora de entrada. 🦄✨",
  "¡Vaya sorpresa! Llegaste justo a tiempo para ver cómo trabajaban los demás. 🏁🏼",
  "¿Hubo alfombra roja en la entrada o por qué la entrada triunfal a esta hora? 🎭✨",
];

export default function CheckInPage() {
  const { user, logout } = useAuth();
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [record, setRecord] = useState<AttendanceRecord | null | undefined>(undefined);
  const [locStatus, setLocStatus] = useState<LocationStatus>('idle');
  const [locMsg, setLocMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Tardies tracking
  const [monthlyTardiesCount, setMonthlyTardiesCount] = useState<number>(0);
  const [sarcasticQuote, setSarcasticQuote] = useState<string | null>(null);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load today's record & monthly tardies history
  useEffect(() => {
    attendanceApi.getToday()
      .then(rec => {
        setRecord(rec);
        if (rec && rec.status === 'LATE') {
          const randomComment = SARCASTIC_LATE_COMMENTS[Math.floor(Math.random() * SARCASTIC_LATE_COMMENTS.length)];
          setSarcasticQuote(randomComment);
        }
      })
      .catch(() => setRecord(null));

    // Fetch monthly logs to count tardies for current user
    const now = new Date();
    attendanceApi.getMyHistory(now.getFullYear(), now.getMonth() + 1)
      .then(logs => {
        if (Array.isArray(logs)) {
          const userTardies = logs.filter(r => r.status === 'LATE' || r.lateMinutes > 0).length;
          setMonthlyTardiesCount(userTardies);
        }
      })
      .catch(() => {
        // Fallback stored count
        const savedCount = localStorage.getItem(`tardies_${user?.userId}`);
        if (savedCount) setMonthlyTardiesCount(Number(savedCount));
      });

    // Pre-warm GPS location in background so it resolves instantly on check-in button tap
    getCurrentPosition().catch(() => {});
  }, [user]);

  const checkLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setLocStatus('loading');
    setLocMsg('Obteniendo ubicación GPS...');
    try {
      const pos = await getCurrentPosition();
      setLocStatus('ok');
      setLocMsg('Ubicación GPS verificada');
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err: any) {
      setLocStatus('error');
      setLocMsg(err.message);
      return null;
    }
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setMessage(null);
    setSarcasticQuote(null);
    const loc = await checkLocation();
    if (!loc) { setActionLoading(false); return; }
    try {
      const rec = await attendanceApi.checkIn(loc.lat, loc.lng);
      setRecord(rec);

      const isLate = rec.status === 'LATE' || rec.lateMinutes > 0;
      if (isLate) {
        const newCount = monthlyTardiesCount + 1;
        setMonthlyTardiesCount(newCount);
        localStorage.setItem(`tardies_${user?.userId}`, newCount.toString());

        const randomComment = SARCASTIC_LATE_COMMENTS[Math.floor(Math.random() * SARCASTIC_LATE_COMMENTS.length)];
        setSarcasticQuote(randomComment);

        setMessage({
          type: 'error',
          text: `Entrada registrada con retardo (+${rec.lateMinutes} min tarde). ¡Cuidado con la impuntualidad!`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Entrada registrada a las ${rec.checkIn.split('T')[1]?.slice(0,5)} · ¡Llegaste puntual! 🎉`,
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setMessage(null);
    const loc = await checkLocation();
    if (!loc) { setActionLoading(false); return; }
    try {
      const rec = await attendanceApi.checkOut(loc.lat, loc.lng);
      setRecord(rec);
      setMessage({ type: 'success', text: `Salida registrada a las ${rec.checkOut.split('T')[1]?.slice(0,5)} · ${rec.hoursWorked?.toFixed(1)}h trabajadas` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const hasCheckedIn  = record && record.checkIn;
  const hasCheckedOut = record && record.checkOut;
  const shiftType     = user?.shiftType ?? '';

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div style={{ width: '100%', maxWidth: 500, marginBottom: 16 }}>
          <InstallPwaCard />
        </div>

        <div className="checkin-card animate-slide-up" style={{ width: '100%', maxWidth: 500, marginBottom: 32 }}>
          <ScreenGuard
            userName={user?.fullName}
            userId={user?.userId}
            isLocationValid={locStatus === 'ok' ? true : locStatus === 'error' ? false : null}
          >

        {/* ── Header: date + clock + shift ── */}
        <div className="checkin-header-card" style={{
          background: '#ffffff',
          border: '1px solid rgba(225, 29, 72, 0.18)',
          borderRadius: '20px',
          padding: '24px 28px',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
        }}>
          <div className="checkin-top-line" />

          <p className="checkin-date" style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, textTransform: 'capitalize' }}>
            {date}
          </p>

          <div className="clock-display" style={{ fontSize: '3.2rem', fontWeight: 800, color: '#0f172a', margin: '8px 0', letterSpacing: '-1.5px' }}>
            {time}
          </div>

          <div className="checkin-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            {shiftType && (
              <span className="badge badge-primary flex items-center gap-1.5" style={{
                background: 'rgba(225, 29, 72, 0.1)',
                color: '#e11d48',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 800,
                borderRadius: '20px',
              }}>
                {SHIFT_ICONS[shiftType]}
                <span>{SHIFT_NAMES[shiftType]} &middot; {SHIFT_TIMES[shiftType]}</span>
              </span>
            )}
            <span className="checkin-greeting" style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
              Hola, {user?.fullName?.split(' ')[0]}
            </span>
          </div>

          {/* ACCUMULATED TARDIES COUNTER BADGE */}
          <div
            className="flex items-center justify-center gap-2"
            style={{
              background: monthlyTardiesCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${monthlyTardiesCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              padding: '8px 16px',
              borderRadius: 20,
              width: 'fit-content',
              margin: '14px auto 0 auto',
            }}
          >
            {monthlyTardiesCount > 0 ? <AlertTriangle size={16} color="#d97706" /> : <CheckCircle2 size={16} color="#059669" />}
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: monthlyTardiesCount > 0 ? '#b45309' : '#059669' }}>
              {monthlyTardiesCount > 0
                ? `Llevas ${monthlyTardiesCount} retardo${monthlyTardiesCount > 1 ? 's' : ''} acumulado${monthlyTardiesCount > 1 ? 's' : ''} este mes`
                : '¡Sin retardos acumulados este mes! Excelente puntualidad'}
            </span>
          </div>
        </div>

        {/* ── Main action card ── */}
        <div className="checkin-body-card">

          {/* Action button */}
          <div className="checkin-btn-wrapper">
            {!hasCheckedIn ? (
              <button
                id="btn-checkin"
                className="checkin-btn-large checkin-btn-in"
                onClick={handleCheckIn}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <Loader2 size={36} className="spin-icon" />
                  : <>
                      <Play size={36} strokeWidth={2} />
                      <span>ENTRADA</span>
                    </>
                }
              </button>
            ) : !hasCheckedOut ? (
              <button
                id="btn-checkout"
                className="checkin-btn-large checkin-btn-out"
                onClick={handleCheckOut}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <Loader2 size={36} className="spin-icon" />
                  : <>
                      <Square size={34} strokeWidth={2} fill="currentColor" />
                      <span>SALIDA</span>
                    </>
                }
              </button>
            ) : (
              <div className="checkin-btn-large checkin-btn-done">
                <CheckCircle2 size={40} strokeWidth={1.5} />
                <span>Turno completado</span>
              </div>
            )}
          </div>

          {/* Location status */}
          {locStatus !== 'idle' && (
            <div className={`location-indicator location-${locStatus === 'ok' ? 'ok' : locStatus === 'error' ? 'err' : 'loading'}`}>
              {locStatus === 'ok'      && <MapPin     size={14} />}
              {locStatus === 'error'   && <MapPinOff  size={14} />}
              {locStatus === 'loading' && <Loader2    size={14} className="spin-icon" />}
              <span>{locMsg}</span>
            </div>
          )}

          {/* Record summary */}
          {record && (
            <div className="checkin-record-grid">
              <div className="checkin-record-cell">
                <div className="checkin-record-label">
                  <Clock3 size={12} />
                  Entrada
                </div>
                <div className="checkin-record-value">
                  {record.checkIn ? record.checkIn.split('T')[1]?.slice(0,5) : '—'}
                </div>
              </div>
              <div className="checkin-record-cell">
                <div className="checkin-record-label">
                  <Clock3 size={12} />
                  Salida
                </div>
                <div className="checkin-record-value">
                  {record.checkOut ? record.checkOut.split('T')[1]?.slice(0,5) : '—'}
                </div>
              </div>
              <div className="checkin-record-cell">
                <div className="checkin-record-label">
                  <AlertCircle size={12} />
                  Estado
                </div>
                <StatusBadge status={record.status} />
              </div>
              <div className="checkin-record-cell">
                <div className="checkin-record-label">
                  <Timer size={12} />
                  Horas
                </div>
                <div className="checkin-record-value">
                  {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Notes & Overtime Banner */}
          {record && record.notes && (
            <div
              className="mt-3 p-3 rounded-xl flex items-center justify-between text-xs font-semibold"
              style={{
                background: record.notes.includes('Horas extra') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: record.notes.includes('Horas extra') ? '#059669' : '#dc2626',
                border: `1px solid ${record.notes.includes('Horas extra') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              <span>📝 {record.notes}</span>
            </div>
          )}

          {/* SARCASTIC LATE COMMENT BANNER */}
          {sarcasticQuote && (
            <div
              className="animate-slide-up p-4 rounded-xl mt-4"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="flex items-center gap-2 mb-1" style={{ color: '#f87171', fontWeight: 800, fontSize: '0.88rem' }}>
                <Flame size={18} color="#ef4444" />
                <span>Mensaje de Impuntualidad:</span>
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fef08a', fontStyle: 'italic', margin: '4px 0 8px 0' }}>
                "{sarcasticQuote}"
              </p>
              <div className="flex items-center gap-2" style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                <Laugh size={14} />
                <span>Acumulas <strong>{monthlyTardiesCount} retardo{monthlyTardiesCount > 1 ? 's' : ''}</strong> en el mes. ¡Procura salir con tiempo la próxima!</span>
              </div>
            </div>
          )}

          {/* Alert message */}
          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : message.type === 'error' ? 'danger' : 'info'}`} style={{ marginTop: 16 }}>
              {message.type === 'success' && <CheckCircle2 size={16} />}
              {message.type === 'error'   && <MapPinOff   size={16} />}
              {message.text}
            </div>
          )}
        </div>

        <p className="checkin-footer-note">
          <MapPin size={11} />
          Se requiere GPS para registrar asistencia
        </p>
          </ScreenGuard>
      </div>

      {/* Real-time Rewards & Attendance Ranking Summary */}
      <div style={{ width: '100%', maxWidth: 700, marginTop: 16 }}>
        <RewardsLeaderboard />
      </div>
    </main>
  </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    ON_TIME:  'badge-success',
    LATE:     'badge-warning',
    ABSENT:   'badge-danger',
    IN_SHIFT: 'badge-primary',
    EXCUSED:  'badge-info',
  };
  return <span className={`badge ${cls[status] || 'badge-muted'}`}>{STATUS_LABELS[status] || status}</span>;
}
