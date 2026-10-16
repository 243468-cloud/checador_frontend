import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeImageUrl, isBlockedAddress, validateMagicBytes } from './src/lib/safe-image-fetch.ts';

test('SSRF Protection: isBlockedAddress rechaza IPs privadas, loopback y link-local', () => {
  // Loopback (127.0.0.0/8)
  assert.equal(isBlockedAddress('127.0.0.1'), true, 'Debe bloquear 127.0.0.1');
  assert.equal(isBlockedAddress('127.0.1.10'), true, 'Debe bloquear subred 127.x');

  // Cloud metadata & Link-local (169.254.0.0/16)
  assert.equal(isBlockedAddress('169.254.169.254'), true, 'Debe bloquear AWS/GCP metadata 169.254.169.254');
  assert.equal(isBlockedAddress('169.254.1.1'), true, 'Debe bloquear link-local');

  // Redes privadas (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  assert.equal(isBlockedAddress('10.0.0.1'), true, 'Debe bloquear 10.x');
  assert.equal(isBlockedAddress('10.254.1.5'), true, 'Debe bloquear 10.x');
  assert.equal(isBlockedAddress('172.16.0.1'), true, 'Debe bloquear 172.16.x');
  assert.equal(isBlockedAddress('172.31.255.255'), true, 'Debe bloquear 172.31.x');
  assert.equal(isBlockedAddress('192.168.1.1'), true, 'Debe bloquear 192.168.x');

  // Loopback IPv6 y Unique local
  assert.equal(isBlockedAddress('::1'), true, 'Debe bloquear ::1');
  assert.equal(isBlockedAddress('fe80::1'), true, 'Debe bloquear fe80::');
  assert.equal(isBlockedAddress('fc00::1'), true, 'Debe bloquear fc00::');

  // IP pública legítima
  assert.equal(isBlockedAddress('1.1.1.1'), false, 'No debe bloquear IP pública');
  assert.equal(isBlockedAddress('8.8.8.8'), false, 'No debe bloquear IP pública');
});

test('SSRF Protection: assertSafeImageUrl rechaza URLs no seguras', () => {
  // Solo HTTPS
  assert.throws(() => assertSafeImageUrl('http://example.com/logo.png'), /Solo https/);

  // IPs privadas directas
  assert.throws(() => assertSafeImageUrl('https://127.0.0.1/logo.png'), /IP no permitida/);
  assert.throws(() => assertSafeImageUrl('https://169.254.169.254/latest/meta-data'), /IP no permitida/);
  assert.throws(() => assertSafeImageUrl('https://10.0.0.1/admin.png'), /IP no permitida/);
  assert.throws(() => assertSafeImageUrl('https://192.168.0.1/router.png'), /IP no permitida/);

  // Hosts locales
  assert.throws(() => assertSafeImageUrl('https://localhost/logo.png'), /Host no permitido/);
  assert.throws(() => assertSafeImageUrl('https://mycorp.local/logo.png'), /Host no permitido/);
  assert.throws(() => assertSafeImageUrl('https://service.internal/logo.png'), /Host no permitido/);

  // Puertos no permitidos
  assert.throws(() => assertSafeImageUrl('https://example.com:8080/logo.png'), /Puerto no permitido/);

  // URL HTTPS pública válida
  const safe = assertSafeImageUrl('https://cdn.example.com/logo.png');
  assert.equal(safe.protocol, 'https:');
  assert.equal(safe.hostname, 'cdn.example.com');
});

test('Magic Bytes Validation: identifica formatos permitidos y rechaza SVG o payloads', () => {
  // PNG magic bytes
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  assert.equal(validateMagicBytes(pngHeader), 'png');

  // JPEG magic bytes
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.equal(validateMagicBytes(jpegHeader), 'jpeg');

  // WebP magic bytes
  const webpHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  ]);
  assert.equal(validateMagicBytes(webpHeader), 'webp');

  // SVG (XML / texto) debe rechazarse
  const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(validateMagicBytes(svgPayload), null, 'Debe rechazar SVG');

  // HTML / script debe rechazarse
  const htmlPayload = Buffer.from('<html><body><h1>Error</h1></body></html>');
  assert.equal(validateMagicBytes(htmlPayload), null, 'Debe rechazar HTML');
});
