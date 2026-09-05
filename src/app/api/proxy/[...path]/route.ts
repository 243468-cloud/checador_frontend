import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path.join('/');
  const searchParams = req.nextUrl.search; // get query string
  const backendUrl = `${API_BASE}/api/${pathParts}${searchParams}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const headers = new Headers();
  // Forward original headers (safely)
  req.headers.forEach((value, key) => {
      // Don't forward host or cookie to backend to prevent mismatch and leaking next cookies
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'cookie') {
          headers.set(key, value);
      }
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const backendRes = await fetch(backendUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      // Pass-through cache control is recommended but fetch does its own thing often
    });

    // We can pipe the response back
    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
        // Next.js handles CORS internally for API routes, but we can pass through content-type and others
        resHeaders.set(key, value);
    });
    
    // We remove the transfer-encoding header if it exists because NextJS handles chunking automatically
    resHeaders.delete('transfer-encoding');

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Proxy error: ' + error.message }, { status: 500 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const OPTIONS = handleProxy;
