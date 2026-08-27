'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Smartphone, Volume2, ShieldAlert } from 'lucide-react';
import { useRealtime, RealtimeEventData } from '@/hooks/useRealtime';
import { subscribeUserToPush, registerServiceWorker } from '@/lib/push';

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string;
  icon: string;
  read: boolean;
  createdAt: string;
}

const notifApi = {
  getAll: () => fetch_json('/api/notifications'),
  getUnreadCount: () => fetch_json('/api/notifications/unread-count'),
  markAllRead: () => fetch_json('/api/notifications/mark-all-read', 'POST'),
  markOneRead: (id: number) => fetch_json(`/api/notifications/${id}/read`, 'PATCH'),
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function fetch_json(path: string, method: string = 'GET') {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} d`;
}

function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

function triggerVibration() {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([250, 120, 250]);
    }
  } catch (_) {}
}

function sendSystemNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notifOptions = {
          body,
          icon: '/logo.png',
          badge: '/icons/icon-192x192.png',
          tag: 'via-gourmet-notif-' + Date.now(),
        };
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, notifOptions as NotificationOptions);
          });
        } else {
          new Notification(title, notifOptions as NotificationOptions);
        }
      } catch (err) {
        console.error('System notification display error:', err);
      }
    }
  }
}

export default function NotificationBell() {
  const [open, setOpen]             = useState(false);
  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [unread, setUnread]         = useState(0);
  const [loading, setLoading]       = useState(false);
  const [systemPerm, setSystemPerm] = useState<NotificationPermission>('default');
  const panelRef                    = useRef<HTMLDivElement>(null);
  const prevUnreadRef               = useRef<number>(-1);

  // Registrar Service Worker y auto-suscribir a Web Push al cargar el componente
  useEffect(() => {
    registerServiceWorker().then(() => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setSystemPerm(Notification.permission);
        if (Notification.permission === 'granted') {
          subscribeUserToPush().catch(() => {});
        }
      }
    });
  }, []);

  const requestPermission = async () => {
    const success = await subscribeUserToPush();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSystemPerm(Notification.permission);
    }
    if (success) {
      sendSystemNotification('Vía Gourmet 🔔', '¡Notificaciones Push del celular activadas correctamente!');
    }
  };

  // Obtener conteo inicial de no-leídas
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notifApi.getUnreadCount();
      const count = data.count ?? 0;
      prevUnreadRef.current = count;
      setUnread(count);
    } catch { /* silencioso */ }
  }, []);

  // Cargar notificaciones completas al abrir
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notifApi.getAll();
      setNotifs(data);
      const unreadCount = (data as Notif[]).filter(n => !n.read).length;
      setUnread(unreadCount);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Escuchar eventos en TIEMPO REAL (SSE cero latencia)
  useRealtime(useCallback((event: RealtimeEventData) => {
    if (event.type === 'NOTIFICATION_ADDED') {
      const newNotif = event.data;
      playNotificationSound();
      triggerVibration();
      sendSystemNotification(newNotif.title || 'Vía Gourmet 🔔', newNotif.body || 'Nueva notificación de asistencia');

      setUnread(prev => prev + 1);
      setNotifs(prev => [newNotif, ...prev]);
    } else if (event.type === 'NOTIFICATIONS_READ') {
      if (event.data === 'all') {
        setUnread(0);
        setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      } else {
        setUnread(prev => Math.max(0, prev - 1));
        setNotifs(prev => prev.map(n => n.id === event.data ? { ...n, read: true } : n));
      }
    }
  }, []));

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) await loadAll();
  };

  const handleMarkAll = async () => {
    try {
      await notifApi.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* silencioso */ }
  };

  const handleMarkOne = async (id: number) => {
    try {
      await notifApi.markOneRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silencioso */ }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        id="btn-notifications"
        onClick={handleOpen}
        title="Notificaciones"
        style={{
          position: 'relative',
          background: open ? 'rgba(225, 29, 72, 0.12)' : '#ffffff',
          border: '1px solid',
          borderColor: open ? 'rgba(225, 29, 72, 0.35)' : 'rgba(225, 29, 72, 0.15)',
          borderRadius: '10px',
          padding: '8px 10px',
          cursor: 'pointer',
          color: '#e11d48',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
        }}
      >
        <Bell size={18} color="#e11d48" />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#e11d48',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 800,
            borderRadius: '999px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 0 0 2px #ffffff, 0 2px 6px rgba(225, 29, 72, 0.4)',
            animation: 'pulse 2s infinite',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel Modern Cream & White */}
      {open && (
        <div className="notification-popover">
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #fdfbf7, #f6f2ea)',
            borderBottom: '1px solid rgba(225, 29, 72, 0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(225, 29, 72, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#e11d48',
              }}>
                <Bell size={15} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.2px' }}>
                Notificaciones
              </span>
              {unread > 0 && (
                <span style={{
                  background: 'rgba(225, 29, 72, 0.1)',
                  color: '#e11d48',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  border: '1px solid rgba(225, 29, 72, 0.2)',
                }}>
                  {unread} nueva{unread !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  fontSize: '11px',
                  color: '#e11d48',
                  background: 'rgba(225, 29, 72, 0.08)',
                  border: '1px solid rgba(225, 29, 72, 0.2)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <CheckCheck size={13} />
                <span>Leér todas</span>
              </button>
            )}
          </div>

          {/* Banner para Activar Notificaciones del Celular */}
          {systemPerm !== 'granted' && (
            <div style={{
              margin: '12px 14px 4px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #fdfbf7, #f7efe2)',
              border: '1px dashed rgba(225, 29, 72, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} color="#e11d48" />
                <div style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 600 }}>
                  Activar notificaciones en la pantalla de tu celular
                </div>
              </div>
              <button
                onClick={requestPermission}
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(225, 29, 72, 0.25)',
                }}
              >
                Activar
              </button>
            </div>
          )}

          {/* Notification List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                Cargando notificaciones...
              </div>
            ) : notifs.length === 0 ? (
              <div style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.85rem',
              }}>
                <Bell size={32} style={{ opacity: 0.2, marginBottom: 8, color: '#e11d48' }} />
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Sin notificaciones pendientes</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>Estás al día con el control de asistencia</div>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkOne(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1ece1',
                    cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? '#ffffff' : 'rgba(225, 29, 72, 0.04)',
                    borderLeft: n.read ? '3px solid transparent' : '3px solid #e11d48',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: n.read ? 'rgba(0,0,0,0.04)' : 'rgba(225, 29, 72, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                    color: n.read ? '#64748b' : '#e11d48',
                  }}>
                    <Bell size={16} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: n.read ? 600 : 800,
                      fontSize: '0.84rem',
                      color: n.read ? '#475569' : '#0f172a',
                      marginBottom: '3px',
                      lineHeight: 1.3,
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#475569',
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {n.body}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#94a3b8',
                      fontWeight: 600,
                      marginTop: '4px',
                    }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#e11d48',
                      flexShrink: 0,
                      marginTop: '6px',
                      boxShadow: '0 0 6px rgba(225, 29, 72, 0.4)',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            background: '#faf8f5',
            borderTop: '1px solid #f1ece1',
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748b',
            fontWeight: 600,
          }}>
            Vía Gourmet System • Sincronizado con notificaciones del celular
          </div>
        </div>
      )}
    </div>
  );
}
