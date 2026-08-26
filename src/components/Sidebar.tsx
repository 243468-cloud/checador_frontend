'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  BarChart3,
  Building2,
  ShieldCheck,
  ClipboardList,
  Settings,
  LogOut,
  Clock,
  Menu,
  X,
  FileText,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  icon: <LayoutDashboard size={18} />, label: 'Dashboard',           roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/attendance', icon: <CalendarCheck   size={18} />, label: 'Asistencia',           roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/employees',  icon: <Users           size={18} />, label: 'Empleados',            roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/schedules',  icon: <Clock           size={18} />, label: 'Horarios y Turnos',    roles: ['SUPERUSER', 'ADMIN', 'EMPLOYEE'] },
  { href: '/leaves',     icon: <FileText        size={18} />, label: 'Permisos / Faltas',    roles: ['SUPERUSER', 'ADMIN', 'EMPLOYEE'] },
  { href: '/reports',    icon: <BarChart3       size={18} />, label: 'Reportes',             roles: ['SUPERUSER', 'ADMIN'] },
  { href: '/branches',   icon: <Building2       size={18} />, label: 'Sucursales',           roles: ['SUPERUSER'] },
  { href: '/admins',     icon: <ShieldCheck     size={18} />, label: 'Administradores',      roles: ['SUPERUSER'] },
  { href: '/audit',      icon: <ClipboardList   size={18} />, label: 'Auditoría',            roles: ['SUPERUSER'] },
  { href: '/settings',   icon: <Settings        size={18} />, label: 'Configuración',        roles: ['SUPERUSER', 'ADMIN'] },
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

        <div className="mobile-header-right">
          {(user.role === 'SUPERUSER' || user.role === 'ADMIN') && (
            <NotificationBell />
          )}
          <button
            onClick={logout}
            className="header-logout-btn"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="hide-mobile-sm">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Drawer */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: '#ffffff', padding: '3px', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Vía Gourmet" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>Vía Gourmet</span>
            <span className="sidebar-logo-sub">{user.branchName || 'Checador de Asistencia'}</span>
          </div>
          <button
            className="mobile-drawer-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Menú Principal</span>
          {visibleItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.slice(1)}`}
              onClick={handleNavClick}
              className={`nav-item${pathname.startsWith(item.href) ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Card + Logout */}
        <div className="sidebar-footer">
          {(user.role === 'SUPERUSER' || user.role === 'ADMIN') && (
            <div style={{ padding: '8px 12px 4px' }}>
              <NotificationBell />
            </div>
          )}
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.fullName}</div>
              <div className="user-role">{ROLE_LABELS[user.role] || user.role}</div>
            </div>
            <button
              id="btn-logout"
              onClick={logout}
              title="Cerrar sesión"
              className="sidebar-logout-btn"
            >
              <LogOut size={16} />
              <span className="logout-text-mobile">Salir</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
