import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { assertSafeImageUrl, fetchImageLimited } from '@/lib/safe-image-fetch';

export const runtime = 'nodejs';

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/i;
const ALLOWED_FORMATS = ['png', 'jpeg', 'webp'];
const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

// Caché por URL de origen + tamaño (solo resultados exitosos).
const memoryCache = new Map<string, { buffer: Buffer; expiresAt: number }>();

function cacheSet(key: string, buffer: Buffer) {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { buffer, expiresAt: Date.now() + SUCCESS_TTL_MS });
}

async function genericIcon(size: number): Promise<Buffer> {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', `icon-${size}x${size}.png`));
  } catch {
    return sharp({
      create: { width: size, height: size, channels: 4, background: { r: 79, g: 70, b: 229, alpha: 1 } },
    })
      .png()
      .toBuffer();
  }
}

// CUALQUIER fallo / ausencia de logo → ícono genérico, NUNCA cacheable públicamente.
async function genericResponse(size: number) {
  const buffer = await genericIcon(size);
  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; size: string }> }
) {
  const { slug, size } = await params;
  const parsedSize = parseInt(size, 10);

  if (parsedSize !== 192 && parsedSize !== 512) {
    return new NextResponse('Tamaño inválido. Solo se admiten 192 y 512.', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl || !SLUG_PATTERN.test(slug)) return await genericResponse(parsedSize);

    const settingsRes = await fetch(`${baseUrl}/api/settings/public/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!settingsRes.ok) return await genericResponse(parsedSize);

    const data = await settingsRes.json();
    const sourceUrl: string | null = data.iconUrl || data.logoUrl || null;
    if (!sourceUrl) return await genericResponse(parsedSize);

    const cacheKey = `${parsedSize}:${sourceUrl}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const safeUrl = assertSafeImageUrl(sourceUrl); // https, sin localhost/IP privada/link-local
    const { buffer: input, contentType } = await fetchImageLimited(safeUrl);

    // SVG y cualquier tipo no raster se descartan sin procesarlos.
    if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      return await genericResponse(parsedSize);
    }
    const meta = await sharp(input, { limitInputPixels: 25_000_000 }).metadata();
    if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
      return await genericResponse(parsedSize);
    }

    const png = await sharp(input, { limitInputPixels: 25_000_000 })
      .resize(parsedSize, parsedSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    cacheSet(cacheKey, png);
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return await genericResponse(parsedSize);
  }
}
