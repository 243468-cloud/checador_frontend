import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Cache en memoria por URL/slug/size para respuestas instantáneas
const memoryCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

function getFallbackIcon(size: number): Buffer {
  const fileName = size === 512 ? 'icon-512x512.png' : 'icon-192x192.png';
  const filePath = path.join(process.cwd(), 'public', fileName);
  try {
    return fs.readFileSync(filePath);
  } catch {
    // Si por alguna razón no se puede leer, generar con sharp al vuelo
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 79, g: 70, b: 229, alpha: 1 },
      },
    })
      .png()
      .toBuffer() as unknown as Buffer;
  }
}

function isUnsafeSvg(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes('<script') ||
    lower.includes('javascript:') ||
    lower.includes('onload=') ||
    lower.includes('onerror=') ||
    lower.includes('xlink:href="javascript:')
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; size: string }> }
) {
  const { slug, size } = await params;
  const parsedSize = parseInt(size, 10);

  if (parsedSize !== 192 && parsedSize !== 512) {
    return new NextResponse('Tamaño inválido. Solo se admiten 192 y 512.', { status: 400 });
  }

  const cacheKey = `${slug}:${parsedSize}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    const fallback = getFallbackIcon(parsedSize);
    return new NextResponse(new Uint8Array(fallback), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  try {
    // 1. Obtener settings públicos de la empresa con timeout
    const settingsController = new AbortController();
    const settingsTimeout = setTimeout(() => settingsController.abort(), 4000);

    const settingsRes = await fetch(
      `${baseUrl}/api/settings/public/${encodeURIComponent(slug)}`,
      {
        signal: settingsController.signal,
        cache: 'no-store',
      }
    );
    clearTimeout(settingsTimeout);

    if (!settingsRes.ok) {
      throw new Error(`Settings no encontrados para slug ${slug}`);
    }

    const data = await settingsRes.json();
    const targetImageUrl: string | null = data.iconUrl || data.logoUrl || null;

    if (!targetImageUrl) {
      const fallback = getFallbackIcon(parsedSize);
      memoryCache.set(cacheKey, { buffer: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
      return new NextResponse(new Uint8Array(fallback), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 2. Descargar imagen remota con timeout
    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), 5000);

    const imgRes = await fetch(targetImageUrl, {
      signal: imgController.signal,
      cache: 'no-store',
    });
    clearTimeout(imgTimeout);

    if (!imgRes.ok) {
      throw new Error(`Error descargando logo desde ${targetImageUrl}`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Protección de tamaño máximo: 5 MB
    if (inputBuffer.length > 5 * 1024 * 1024) {
      throw new Error('Imagen remota excede el límite de 5MB');
    }

    // Verificación si es SVG (rechazar si contiene scripts o eventos)
    const contentType = imgRes.headers.get('content-type') || '';
    if (
      contentType.includes('svg') ||
      targetImageUrl.toLowerCase().endsWith('.svg') ||
      inputBuffer.toString('utf8', 0, 100).includes('<svg')
    ) {
      const svgText = inputBuffer.toString('utf8');
      if (isUnsafeSvg(svgText)) {
        throw new Error('SVG no sanitizado o potencialmente inseguro detectado');
      }
    }

    // 3. Conversión a PNG cuadrado con sharp
    const pngBuffer = await sharp(inputBuffer)
      .resize(parsedSize, parsedSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    memoryCache.set(cacheKey, { buffer: pngBuffer, expiresAt: Date.now() + CACHE_TTL_MS });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    // Si falla descarga o procesamiento, se entrega el icono neutro de respaldo
    const fallback = getFallbackIcon(parsedSize);
    return new NextResponse(new Uint8Array(fallback), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
