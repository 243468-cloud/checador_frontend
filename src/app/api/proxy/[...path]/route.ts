import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path.join('/');
  const searchParams = req.nextUrl.search;
  const backendUrl = `${API_BASE}/api/${pathParts}${searchParams}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  // Build clean headers — only forward safe headers to backend
  const forwardHeaders: Record<string, string> = {
    'content-type': req.headers.get('content-type') || 'application/json',
    'accept': 'application/json',
    // Do NOT forward accept-encoding — backend must respond uncompressed
    // so that Next.js can pass the body through without decoding issues
  };

  if (token) {
    forwardHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const backendRes = await fetch(backendUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    // Read body as a buffer so Next.js has already decompressed it (fetch auto-decompresses)
    const bodyBuffer = await backendRes.arrayBuffer();

    // Only forward safe, non-encoding headers to the browser
    const resHeaders = new Headers();
    const SKIP_HEADERS = new Set([
      'transfer-encoding',
      'content-encoding', // body is already decoded by fetch above
      'content-length',   // length changed after decompression — browser will compute it
      'connection',
      'keep-alive',
    ]);
    backendRes.headers.forEach((value, key) => {
      if (!SKIP_HEADERS.has(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    return new NextResponse(bodyBuffer, {
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
