'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { attendanceApi } from '@/lib/api';

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

export default function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const panelRef                  = useRef<HTMLDivElement>(null);
  const POLL_INTERVAL             = 30_000; // 30 s

  // Obtener conteo de no-leídas (ligero, para polling)
  const pollUnread = useCallback(async () => {
    try {
      const data = await notifApi.getUnreadCount();
      setUnread(data.count ?? 0);
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

  // Polling inicial y periódico
  useEffect(() => {
    pollUnread();
    const id = setInterval(pollUnread, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [pollUnread]);

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
          background: open ? 'rgba(96,165,250,0.15)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '8px 10px',
          cursor: 'pointer',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s',
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '999px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 0 0 2px #1e293b',
            animation: 'pulse 2s infinite',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '340px',
          maxWidth: 'calc(100vw - 24px)',
          background: 'linear-gradient(135deg, #1a2035 0%, #1e293b 100%)',
          border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#60a5fa" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>
                Notificaciones
              </span>
              {unread > 0 && (
                <span style={{
                  background: 'rgba(239,68,68,0.2)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  padding: '1px 6px',
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
                  color: '#60a5fa',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                }}
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                Cargando...
              </div>
            ) : notifs.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.85rem',
              }}>
                <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Sin notificaciones</div>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkOne(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? 'transparent' : 'rgba(96,165,250,0.06)',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                    {n.icon || '🔔'}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: n.read ? 500 : 700,
                      fontSize: '0.82rem',
                      color: n.read ? '#94a3b8' : '#e2e8f0',
                      marginBottom: '3px',
                      lineHeight: 1.3,
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {n.body}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#475569',
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
                      background: '#60a5fa',
                      flexShrink: 0,
                      marginTop: '5px',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            fontSize: '11px',
            color: '#475569',
          }}>
            Se actualiza cada 30 segundos • Mostrando últimas 50
          </div>
        </div>
      )}
    </div>
  );
}
