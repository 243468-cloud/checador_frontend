'use client';

import { useEffect, useState, useRef } from 'react';
import { ShieldAlert, ShieldCheck, MapPinOff } from 'lucide-react';
import { notificationApi } from '@/lib/api';

interface ScreenGuardProps {
  userName?: string;
  userId?: number;
  isLocationValid?: boolean | null; // true = inside branch, false = outside branch, null = checking
  children: React.ReactNode;
}

export default function ScreenGuard({ userName, userId, isLocationValid, children }: ScreenGuardProps) {
  const [timeStr, setTimeStr] = useState('');
  const [isBlurred, setIsBlurred] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [ping, setPing] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Trigger real-time Security Alert Push notification to Admin & Superadmin when outside branch location
  useEffect(() => {
    if (isLocationValid === false) {
      const now = Date.now();
      const lastAlert = Number(sessionStorage.getItem('last_security_alert_time') || '0');
      if (now - lastAlert > 30000) { // 30s cooldown throttle to prevent alert spam
        sessionStorage.setItem('last_security_alert_time', now.toString());
        notificationApi.sendSecurityAlert('intentó capturar pantalla o consultar asistencia fuera del local').catch(() => {});
      }
    }
  }, [isLocationValid]);

  // Live ticking clock for anti-spoofing verification
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time server latency ping check (every 12 seconds)
  useEffect(() => {
    const checkConnection = async () => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('/api/branches/public', { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          setPing(Date.now() - start);
          setIsOnline(true);
        } else {
          setPing(null);
          setIsOnline(false);
        }
      } catch (_) {
        setPing(null);
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 12000);
    return () => clearInterval(interval);
  }, []);

  // Rolling OTP dynamic token generator (updates every 10 seconds)
  useEffect(() => {
    const updateCode = () => {
      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth();
      const hour = now.getHours();
      const min = now.getMinutes();
      const block = Math.floor(now.getSeconds() / 10);
      const uid = userId || 0;
      
      const input = `${uid}-${day}-${month}-${hour}-${min}-${block}`;
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        hash = input.charCodeAt(i) + ((hash << 5) - hash);
      }
      const token = Math.abs(hash).toString(16).toUpperCase().slice(0, 6);
      setSecurityCode(`VG-${token}`);
    };

    updateCode();
    const interval = setInterval(updateCode, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Obscure screen when app loses focus / app switcher is opened
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Intercept desktop screenshot shortcuts (PrintScreen, Ctrl+P, Ctrl+S, F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert('Captura de pantalla deshabilitada por motivos de seguridad.');
        return false;
      }
      // Prevent Ctrl+P or Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('Impresión de pantalla bloqueada.');
        return false;
      }
      // Prevent Ctrl+S or Cmd+S (Save page)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Prevent F12 (Developer Tools) or Ctrl+Shift+I / Cmd+Shift+I
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className="screen-protected"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Hide page contents completely during print/save dialogs */}
      <style>{`
        @media print {
          body {
            display: none !important;
          }
        }
      `}</style>
      {/* Dynamic Security Watermark Header Ticker */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: isLocationValid === false || !isOnline
            ? 'linear-gradient(90deg, #991b1b, #ef4444)'
            : 'linear-gradient(90deg, #064e3b, #10b981)',
          color: '#ffffff',
          padding: '10px 14px',
          borderRadius: '12px',
          marginBottom: '16px',
          fontSize: '0.74rem',
          fontWeight: 700,
          letterSpacing: '0.3px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isLocationValid === false ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
            <span>
              {isLocationValid === false
                ? 'CAPTURA INVÁLIDA: FUERA DE LOCAL'
                : 'GPS VERIFICADO: EN LOCAL'}
            </span>
          </div>
          <div style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
            {userName ? `${userName.split(' ')[0]} • ` : ''}{timeStr}
          </div>
        </div>

        {/* Dynamic Code and Server Connection Ticker */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          paddingTop: '6px',
          fontSize: '0.68rem',
          opacity: 0.95
        }}>
          <div>
            CÓDIGO: <strong style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>{securityCode}</strong>
          </div>
          <div>
            {isOnline ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                SERVIDOR: ONLINE ({ping !== null ? `${ping}ms` : 'OK'})
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fca5a5' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />
                SERVIDOR: SIN CONEXIÓN ❌
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content with Dynamic Location Guard Overlay */}
      <div
        style={{
          position: 'relative',
          filter: isBlurred || isLocationValid === false ? 'blur(10px)' : 'none',
          pointerEvents: isLocationValid === false ? 'none' : 'auto',
          transition: 'filter 0.3s ease',
        }}
      >
        {children}
      </div>

      {/* Outside Branch Location Lockout & Anti-Spoofing Overlay */}
      {isLocationValid === false && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <MapPinOff size={32} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', marginBottom: '8px' }}>
            CAPTURA NO VÁLIDA — FUERA DEL LOCAL
          </h2>

          <p style={{ fontSize: '0.86rem', color: '#cbd5e1', maxWidth: 360, marginBottom: '16px' }}>
            Estás fuera del perímetro GPS permitido. Cualquier captura de pantalla tomada aquí carece de validez oficial.
          </p>

          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fca5a5',
            }}
          >
            UBICACIÓN NO VERIFICADA • {userName || 'EMPLEADO'} • {timeStr}
          </div>
        </div>
      )}
    </div>
  );
}
