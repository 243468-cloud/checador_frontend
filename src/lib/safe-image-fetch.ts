import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB límite estricto
const TOTAL_TIMEOUT_MS = 3000; // 3 segundos timeout corto

// Rangos que jamás deben ser alcanzables desde el servidor (SSRF).
const blocked = new net.BlockList();
[
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],       // Redes privadas 10.x
  ['100.64.0.0', 10],    // CGNAT
  ['127.0.0.0', 8],      // Loopback 127.x
  ['169.254.0.0', 16],   // Link-local / Cloud metadata (AWS/GCP/Azure: 169.254.169.254)
  ['172.16.0.0', 12],    // Redes privadas 172.16.x - 172.31.x
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],   // Redes privadas 192.168.x
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],      // Multicast
  ['240.0.0.0', 4],      // Reservado + broadcast
].forEach(([addr, prefix]) => blocked.addSubnet(addr as string, prefix as number, 'ipv4'));

[
  ['::', 128],
  ['::1', 128],          // Loopback IPv6
  ['fc00::', 7],         // Unique local IPv6
  ['fe80::', 10],        // Link-local IPv6
  ['ff00::', 8],         // Multicast IPv6
  ['2001:db8::', 32],    // Documentación IPv6
].forEach(([addr, prefix]) => blocked.addSubnet(addr as string, prefix as number, 'ipv6'));

/** true si la IP (v4 o v6) pertenece a un rango no público o privado. */
export function isBlockedAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').trim();
  const family = net.isIP(ip);
  if (family === 0) return true; // no es IP válida: se rechaza
  // IPv4 mapeada en IPv6 (::ffff:127.0.0.1) → evaluar la parte IPv4
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedAddress(mapped[1]);
  return blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

/** Valida la URL antes de conectar. Devuelve la URL parseada o lanza. */
export function assertSafeImageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL inválida');
  }
  if (url.protocol !== 'https:') throw new Error('Solo https');
  if (url.username || url.password) throw new Error('Credenciales en URL no permitidas');
  if (url.port && url.port !== '443') throw new Error('Puerto no permitido');

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Host no permitido');
  }

  // Las IP literales no pasan por lookup(): se validan directamente aquí
  if (net.isIP(host) !== 0 && isBlockedAddress(host)) {
    throw new Error('IP no permitida');
  }

  return url;
}

// lookup propio: valida CADA IP resuelta en el momento de conectar (anti DNS-rebinding).
export function safeLookup(
  hostname: string,
  options: { all?: boolean },
  callback: (err: Error | null, address?: unknown, family?: number) => void
) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new Error('Destino no permitido: IP privada o bloqueada'));
    }
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

/**
 * Valida los magic bytes del buffer para asegurar que sea estrictamente
 * PNG, JPEG o WebP. Rechaza de forma absoluta SVGs, HTMLs, o archivos disfrazados.
 */
export function validateMagicBytes(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (!buf || buf.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }

  // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // 'RIFF'
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50  // 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Descarga una imagen remota de forma segura:
 * - Solo HTTPS
 * - Resolución segura anti DNS-rebinding
 * - Valida y protege contra redirecciones maliciosas a IPs internas (máx 1 redirect verificado)
 * - Límite estricto de tamaño de descarga
 * - Timeout corto
 * - Validación de Magic Bytes
 */
export function fetchImageLimited(
  initialUrl: URL,
  redirectCount = 0
): Promise<{ buffer: Buffer; contentType: string; format: 'png' | 'jpeg' | 'webp' }> {
  if (redirectCount > 1) {
    return Promise.reject(new Error('Demasiadas redirecciones'));
  }

  const safeUrl = assertSafeImageUrl(initialUrl.href);

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true;
        clearTimeout(deadline);
        fn();
      }
    };

    const req = https.request(
      {
        protocol: 'https:',
        hostname: safeUrl.hostname.replace(/^\[|\]$/g, ''),
        port: 443,
        path: `${safeUrl.pathname}${safeUrl.search}`,
        method: 'GET',
        headers: {
          'User-Agent': 'checador-icon-fetcher',
          Accept: 'image/png,image/jpeg,image/webp',
        },
        lookup: safeLookup as never,
      },
      (res) => {
        const status = res.statusCode ?? 0;

        // Manejo estricto de redirecciones (301, 302, 307, 308):
        if (status === 301 || status === 302 || status === 307 || status === 308) {
          res.resume();
          const location = res.headers.location;
          if (!location) {
            return done(() => reject(new Error('Redirección sin encabezado Location')));
          }
          try {
            const redirectTarget = new URL(location, safeUrl);
            // assertSafeImageUrl verifica que la redirección sea HTTPS y NO sea IP privada/local
            assertSafeImageUrl(redirectTarget.href);
            return done(() => {
              fetchImageLimited(redirectTarget, redirectCount + 1)
                .then(resolve)
                .catch(reject);
            });
          } catch (err) {
            return done(() => reject(new Error(`Redirección insegura bloqueada: ${(err as Error).message}`)));
          }
        }

        if (status !== 200) {
          res.resume();
          return done(() => reject(new Error(`HTTP ${status}`)));
        }

        const rawContentType = String(res.headers['content-type'] || '').toLowerCase().split(';')[0].trim();
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(rawContentType)) {
          res.resume();
          return done(() => reject(new Error(`Content-Type no permitido: ${rawContentType}`)));
        }

        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
          res.resume();
          return done(() => reject(new Error('Imagen excede el tamaño máximo permitido (2MB)')));
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_IMAGE_BYTES) {
            req.destroy();
            return done(() => reject(new Error('Descarga abortada: excede 2MB')));
          }
          chunks.push(chunk);
        });

        res.on('end', () =>
          done(() => {
            const buffer = Buffer.concat(chunks);
            const format = validateMagicBytes(buffer);
            if (!format) {
              return reject(new Error('Magic bytes inválidos: no es un archivo PNG, JPEG o WebP legítimo'));
            }
            resolve({
              buffer,
              contentType: rawContentType,
              format,
            });
          })
        );

        res.on('error', (e) => done(() => reject(e)));
      }
    );

    const deadline = setTimeout(() => {
      req.destroy();
      done(() => reject(new Error('Timeout de descarga')));
    }, TOTAL_TIMEOUT_MS);

    req.on('error', (e) => done(() => reject(e)));
    req.end();
  });
}
