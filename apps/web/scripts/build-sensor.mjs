/**
 * Tarayıcı sensörünü derler: `sdk/sensor.ts` → `src/generated/sensor-v1.bundle.js` (ham) + `sensor-v1.ts` (sarmalayıcı).
 *
 * Ham dosyanın adı bilerek `.bundle.js`: `sensor-v1.js` ile `sensor-v1.ts` aynı dizinde bulunursa
 * Vite/vitest `.js` sürümünü çözer ve sarmalayıcının dışa aktarımları kaybolur (Next.js `.ts` çözer).
 *
 * Çıktı deterministiktir (aynı kaynak → aynı bayt), bu yüzden üretilen dosyalar depoya commit
 * edilir. `pnpm build` her çalıştığında yeniden üretilir (`build` script'i buna bağlıdır), böylece
 * CI'da derlenmiş dosyanın güncelliği garanti olur.
 *
 * Boyut bütçesi: gzip < 5 KB. Aşılırsa derleme HATA verir (sessizce şişmesin).
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(APP_DIR, 'sdk', 'sensor.ts');
const OUT_DIR = path.join(APP_DIR, 'src', 'generated');
const OUT_JS = path.join(OUT_DIR, 'sensor-v1.bundle.js');
const OUT_TS = path.join(OUT_DIR, 'sensor-v1.ts');

/** gzip bütçesi (bayt). */
const GZIP_BUDGET = 5 * 1024;

const source = readFileSync(ENTRY, 'utf8');
const versionMatch = source.match(/SDK_VERSION\s*=\s*'([^']+)'/);
const version = versionMatch ? versionMatch[1] : '0.0.0';

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'iife',
  target: ['es2017'],
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
  // esbuild ESM girdisini IIFE'ye çevirirken çıktının başına kendisi `"use strict";` koyar.
  write: false,
});

const first = result.outputFiles[0];
if (!first) throw new Error('esbuild çıktısı boş');
const code = `${first.text.trim()}\n`;

const gzip = gzipSync(Buffer.from(code, 'utf8'), { level: 9 }).length;
if (gzip > GZIP_BUDGET) {
  throw new Error(`Sensör paketi bütçeyi aştı: ${gzip} B gzip > ${GZIP_BUDGET} B`);
}

const etag = `"${createHash('sha256').update(code).digest('hex').slice(0, 32)}"`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JS, code, 'utf8');
writeFileSync(
  OUT_TS,
  [
    '// OTOMATİK ÜRETİLDİ — elle düzenlemeyin.',
    '// Kaynak: apps/web/sdk/sensor.ts · Üretici: apps/web/scripts/build-sensor.mjs',
    `export const SENSOR_VERSION = ${JSON.stringify(version)};`,
    `export const SENSOR_ETAG = ${JSON.stringify(etag)};`,
    `export const SENSOR_SOURCE = ${JSON.stringify(code)};`,
    '',
  ].join('\n'),
  'utf8',
);

process.stdout.write(
  `sensor v${version}: ${Buffer.byteLength(code)} B ham · ${gzip} B gzip (bütçe ${GZIP_BUDGET} B) → src/generated/sensor-v1.bundle.js\n`,
);
