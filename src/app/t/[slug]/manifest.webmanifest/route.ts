import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl}/api/settings/public/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    const data = await res.json();

    const icons: Array<{ src: string; sizes?: string; type?: string; purpose?: string }> = [];

    if (data.iconUrl) {
      icons.push({
        src: data.iconUrl,
        sizes: 'any',
        type: 'image/png'
      });
    } else {
      icons.push({
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      });
    }

    if (data.logoUrl) {
      icons.push({
        src: data.logoUrl,
        sizes: 'any',
        type: 'image/png'
      });
    } else {
      icons.push({
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      });
    }
    
    const manifest = {
      id: `checador-${slug}`,
      name: data.companyName || 'Checador App',
      short_name: data.companyName || 'Checador',
      start_url: `/${encodeURIComponent(slug)}/login`,
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: data.primaryColor || '#000000',
      icons
    };

    return new NextResponse(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    clearTimeout(timeoutId);
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
