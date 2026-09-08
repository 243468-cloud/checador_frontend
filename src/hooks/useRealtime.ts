'use client';

import { useEffect, useRef } from 'react';

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

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let sseDisabled = false; // Se desactiva si el endpoint no existe

    function connect() {
      if (sseDisabled) return;
      if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

      try {
        if (eventSource) eventSource.close();

        eventSource = new EventSource('/api/proxy/events/stream');

        let connected = false;
        eventSource.onopen = () => { connected = true; };

        const handleMessage = (e: MessageEvent) => {
          connected = true;
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
          if (!connected) {
            // El endpoint SSE no existe en el backend — desactivar permanentemente
            sseDisabled = true;
            return;
          }
          // Estaba conectado y se cortó — reintentar en 5s
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        // ignore
      }
    }

    // Verificación previa: si el endpoint SSE no existe, no abrir EventSource
    // (evita que el proxy intente hacer arrayBuffer() en un stream y devuelva 500)
    fetch('/api/proxy/events/stream', {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
      signal: AbortSignal.timeout(5000),
    }).then((res) => {
      if (res.ok || res.status === 0) {
        // El endpoint existe — conectar via EventSource
        connect();
      }
      // Si retorna 404, 500, etc. → sseDisabled = true implícitamente (connect() nunca se llama)
    }).catch(() => {
      // Error de red o timeout — no intentar SSE
    });

    const handleVisibilityOrFocus = () => {
      if (!sseDisabled && document.visibilityState === 'visible') {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          connect();
        }
      }
    };

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
