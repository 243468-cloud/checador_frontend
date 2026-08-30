'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Building2,
  ShieldCheck,
  FileText,
  BarChart3,
  ClipboardList,
  Settings,
  Clock,
  Menu,
  X,
  LogOut,
  Trophy,
  CheckSquare,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  icon: <LayoutDashboard size={18} />, label: 'Inicio (Home)',       roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/checkin',    icon: <Clock           size={18} />, label: 'Inicio / Checador',   roles: ['EMPLOYEE'] },
  { href: '/schedules',  icon: <Clock           size={18} />, label: 'Horarios y Turnos',    roles: ['SUPERUSER', 'ADMIN', 'EMPLOYEE'] },
  { href: '/ranking',    icon: <Trophy          size={18} />, label: 'Ranking & Recompensas', roles: ['SUPERUSER', 'ADMIN', 'EMPLOYEE'] },
  { href: '/leaves',     icon: <FileText        size={18} />, label: 'Permisos / Faltas',    roles: ['SUPERUSER', 'ADMIN', 'EMPLOYEE'] },
  { href: '/attendance', icon: <CalendarCheck   size={18} />, label: 'Asistencia',           roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/employees',  icon: <Users           size={18} />, label: 'Empleados',            roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/reports',    icon: <BarChart3       size={18} />, label: 'Reportes',             roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/branches',   icon: <Building2       size={18} />, label: 'Sucursales',           roles: ['SUPERUSER'] },
  { href: '/admins',     icon: <ShieldCheck     size={18} />, label: 'Administradores',      roles: ['SUPERUSER'] },
  { href: '/audit',      icon: <ClipboardList   size={18} />, label: 'Auditoría',            roles: ['SUPERUSER'] },
  { href: '/settings',   icon: <Settings        size={18} />, label: 'Configuración',        roles: ['SUPERUSER', 'ADMIN', 'EMPLOYEE'] },
];

const ROLE_LABELS: Record<string, string> = {
  SUPERUSER: 'Superusuario',
  ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="mobile-header-navbar">
        <div className="mobile-header-left">
          <button
            className="mobile-menu-toggle-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="mobile-logo-box">
            <Clock size={18} color="#60a5fa" />
            <span className="mobile-logo-title">Checador</span>
          </div>
        </div>

        <div className="mobile-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(user.role === 'SUPERUSER' || user.role === 'ADMIN') && (
            <NotificationBell />
          )}
          <button
            onClick={logout}
            className="header-logout-btn"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="hide-mobile-sm">Salir</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Drawer */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo Header */}
        <div className="sidebar-logo" style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.18)',
              border: '1px solid #f1f5f9',
              flexShrink: 0,
            }}
          >
            <img src="/logo.png" alt="Vía Gourmet" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '1.08rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Vía Gourmet
            </span>
            <span style={{ fontSize: '0.56rem', color: '#e11d48', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              SABORES • AROMAS • TEXTURAS
            </span>
          </div>

          <button
            className="mobile-drawer-close"
            onClick={() => setMobileOpen(false)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 8px 6px 8px', display: 'block' }}>
            Navegación
          </span>
          {visibleItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.slice(1)}`}
                onClick={handleNavClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 800 : 700,
                  color: isActive ? '#ffffff' : '#475569',
                  background: isActive ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'transparent',
                  boxShadow: isActive ? '0 6px 18px rgba(225, 29, 72, 0.28)' : 'none',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 4,
                      borderRadius: '0 4px 4px 0',
                      background: '#ffffff',
                    }}
                  />
                )}
                <span style={{ color: isActive ? '#ffffff' : '#64748b', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer Card */}
        <div style={{ padding: 14, borderTop: '1px solid #f1f5f9' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                  {ROLE_LABELS[user.role] || user.role}
                </div>
              </div>
            </div>
            <button
              id="btn-logout"
              onClick={logout}
              title="Cerrar sesión"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#e11d48',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
