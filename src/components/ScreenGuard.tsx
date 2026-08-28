'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, MapPinOff } from 'lucide-react';

interface ScreenGuardProps {
  userName?: string;
  userId?: number;
  isLocationValid?: boolean | null; // true = inside branch, false = outside branch, null = checking
  children: React.ReactNode;
}

export default function ScreenGuard({ userName, userId, isLocationValid, children }: ScreenGuardProps) {
  const [timeStr, setTimeStr] = useState('');
  const [isBlurred, setIsBlurred] = useState(false);

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
      {/* Dynamic Security Watermark Header Ticker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          background: isLocationValid === false
            ? 'linear-gradient(90deg, #991b1b, #ef4444)'
            : 'linear-gradient(90deg, #064e3b, #10b981)',
          color: '#ffffff',
          padding: '6px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.76rem',
          fontWeight: 700,
          letterSpacing: '0.4px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isLocationValid === false ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
          <span>
            {isLocationValid === false
              ? 'CAPTURA NO VÁLIDA: FUERA DE SUCURSAL'
              : 'GPS VERIFICADO: DENTRO DE SUCURSAL'}
          </span>
        </div>
        <div style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
          {userName ? `${userName} • ` : ''}{timeStr}
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
            justify: 'center',
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
