import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const TOTAL_TIMEOUT_MS = 5000;

// Rangos que jamás deben ser alcanzables desde el servidor (SSRF).
const blocked = new net.BlockList();
[
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (incluye metadata cloud 169.254.169.254)
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reservado + broadcast
].forEach(([addr, prefix]) => blocked.addSubnet(addr as string, prefix as number, 'ipv4'));
[
  ['::', 128],
  ['::1', 128], // loopback
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
  ['2001:db8::', 32], // documentación
].forEach(([addr, prefix]) => blocked.addSubnet(addr as string, prefix as number, 'ipv6'));

/** true si la IP (v4 o v6) pertenece a un rango no público. */
export function isBlockedAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '');
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
  // Las IP literales no pasan por lookup(): se validan aquí.
  if (net.isIP(host) !== 0 && isBlockedAddress(host)) throw new Error('IP no permitida');
  return url;
}

// lookup propio: valida CADA IP resuelta en el momento de conectar (anti DNS-rebinding).
function safeLookup(
  hostname: string,
  options: { all?: boolean },
  callback: (err: Error | null, address?: unknown, family?: number) => void
) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new Error('Destino no permitido'));
    }
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

/**
 * Descarga una imagen remota: https, sin seguir redirects, límite de bytes
 * leyendo el stream (se aborta al pasar MAX_IMAGE_BYTES) y timeout total.
 */
export function fetchImageLimited(url: URL): Promise<{ buffer: Buffer; contentType: string }> {
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
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { 'User-Agent': 'checador-icon-fetcher', Accept: 'image/png,image/jpeg,image/webp' },
        lookup: safeLookup as never,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        // 3xx incluido: NO se siguen redirects.
        if (status !== 200) {
          res.resume();
          return done(() => reject(new Error(`HTTP ${status}`)));
        }
        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
          res.resume();
          return done(() => reject(new Error('Imagen excede 5MB')));
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_IMAGE_BYTES) {
            req.destroy();
            return done(() => reject(new Error('Imagen excede 5MB')));
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          done(() =>
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: String(res.headers['content-type'] || '').toLowerCase(),
            })
          )
        );
        res.on('error', (e) => done(() => reject(e)));
      }
    );

    const deadline = setTimeout(() => {
      req.destroy();
      done(() => reject(new Error('Timeout')));
    }, TOTAL_TIMEOUT_MS);

    req.on('error', (e) => done(() => reject(e)));
    req.end();
  });
}
