import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/proxy/branches/public', // Para el formulario de login/registro
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar estáticos, public files, y service worker
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // Si está en ruta pública
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    // Si ya está autenticado y trata de ir a /login, mandarlo al dashboard
    if (token && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Rutas protegidas: si no hay token, redirigir al login
  if (!token) {
    // Evita redirigir llamadas API que no deberían ser accedidas directamente
    if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
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
