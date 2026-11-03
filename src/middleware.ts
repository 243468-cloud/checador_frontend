import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/registro-empresa',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/proxy/branches/public', // Para el formulario de login/registro
  '/api/proxy/public',          // Para APIs públicas generales
  '/api/proxy/settings/public', // Para obtener configuraciones públicas del tenant
];

function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar estáticos, public files, y service worker
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/icon-192x192.png' ||
    pathname === '/icon-512x512.png' ||
    pathname.startsWith('/api/icons/') ||
    /^\/t\/[a-zA-Z0-9-]+\/manifest\.webmanifest$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const role = token ? getRoleFromToken(token) : null;
  const defaultHome = role === 'SUPERUSER' ? '/branches' : role === 'EMPLOYEE' ? '/checkin' : '/dashboard';

  // Comprobar si es una subruta de login/register (ej: /[slug]/login)
  const isDynamicAuthRoute = pathname.match(/^\/[a-zA-Z0-9-]+\/(login|register)$/);

  // Si está en ruta pública o es una subruta dinámica de auth
  if (isDynamicAuthRoute || PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    // Si ya está autenticado y trata de ir a login/register, mandarlo a su pantalla inicial según rol
    if (token && (pathname === '/login' || pathname === '/register' || pathname === '/' || isDynamicAuthRoute)) {
      return NextResponse.redirect(new URL(defaultHome, request.url));
    }
    return NextResponse.next();
  }

  // Rutas protegidas: si no hay token, redirigir al login genérico
  if (!token) {
    // Evita redirigir llamadas API que no deberían ser accedidas directamente
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si es raíz o si un EMPLOYEE intenta entrar a /dashboard, redirigir a /checkin
  if (pathname === '/') {
    return NextResponse.redirect(new URL(defaultHome, request.url));
  }
  if (role === 'EMPLOYEE' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/checkin', request.url));
  }
  if (role === 'SUPERUSER' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/branches', request.url));
  }

  return NextResponse.next();
}

// Configurar sobre qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/push/public-key (public api)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!api/push/public-key|_next/static|_next/image).*)',
  ],
};
