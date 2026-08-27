'use client';

import { useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface RealtimeEventData {
  type: string;
  data: any;
  timestamp: number;
}

export function useRealtime(onEvent: (event: RealtimeEventData) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSourceUrl = `${API_BASE}/api/events/subscribe?token=${encodeURIComponent(token)}`;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

      try {
        if (eventSource) eventSource.close();
        eventSource = new EventSource(eventSourceUrl);

        const handleMessage = (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.type !== 'PING' && parsed.type !== 'CONNECTED') {
              onEventRef.current(parsed);
            }
          } catch (_) {}
        };

        eventSource.addEventListener('CHECK_IN', handleMessage);
        eventSource.addEventListener('CHECK_OUT', handleMessage);
        eventSource.addEventListener('NOTIFICATION_ADDED', handleMessage);
        eventSource.addEventListener('NOTIFICATIONS_READ', handleMessage);
        eventSource.addEventListener('LEAVE_STATUS_CHANGED', handleMessage);

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          // Auto-reconnect after 3 seconds if connection drops
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('Error iniciando conexión SSE en vivo:', err);
      }
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          connect();
        }
      }
    };

    connect();

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);
}
