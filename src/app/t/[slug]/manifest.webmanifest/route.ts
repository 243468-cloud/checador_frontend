import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl}/api/settings/public/${slug}`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      return new NextResponse(null, { 
        status: 503, 
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } 
      });
    }

    const data = await res.json();
    
    const manifest = {
      name: data.companyName || 'Checador App',
      short_name: data.companyName || 'Checador',
      start_url: `/t/${slug}`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: data.primaryColor || '#000000',
      icons: [
        {
          src: data.iconUrl || '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        }
      ]
    };

    return new NextResponse(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    clearTimeout(timeoutId);
    return new NextResponse(null, { 
      status: 503, 
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } 
    });
  }
}
