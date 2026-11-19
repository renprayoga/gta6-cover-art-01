// Neon Vice Cover Studio — the entry program (Node 22, standard library only).
//
// It hands the app in: it copies this repository's app/ (the offline static
// web app) and screenshots/ (3–4 JPEGs the maker took with Playwright) into
// /output — or $MAKEFUN_OUTPUT_DIR outside the grader — and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts, the
// summary the judge reads. Before copying it checks the gate's caps itself,
// so a bad entry fails here with a plain message instead of at the scorer:
// at most 4 screenshots of at most 256 KiB, app/ at most 993 entries and
// 48 MiB with no path over 1,000 bytes, and a dossier of at most 1.5 MiB.
// The copy is byte-for-byte, so two runs write the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's caps (kit reference/gate.json). Only text_max_bytes shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
const DOSSIER_MAX_BYTES = 1572864;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Counts files and bytes under `dir`, following no symlinks. */
function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const sub = countTree(path);
      files += sub.files + 1;
      bytes += sub.bytes;
    } else if (st.isFile()) {
      files += 1;
      bytes += st.size;
      if (Buffer.byteLength(path, 'utf8') > CAPS.app_path_max_bytes) {
        throw new Error(`main.ts: path over ${CAPS.app_path_max_bytes} bytes: ${path}`);
      }
    } else {
      throw new Error(`main.ts: app/ must hold plain files only, not: ${path}`);
    }
  }
  return { files, bytes };
}

function fail(msg) {
  throw new Error(`main.ts: ${msg}`);
}

// --- Validate the inputs before anything is copied. ---
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
const appCount = countTree(appDir);
if (appCount.files > CAPS.app_max_files) {
  fail(`app/ holds ${appCount.files} entries, over the ${CAPS.app_max_files} cap`);
}
if (appCount.bytes > CAPS.app_max_bytes) {
  fail(`app/ is ${appCount.bytes} bytes, over the ${CAPS.app_max_bytes} cap`);
}
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir)
  .filter((n) => !n.startsWith('.'))
  .sort();
if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
  fail(`screenshots/ holds ${shots.length} images, need 3 to ${CAPS.screenshots.max}`);
}
for (const name of shots) {
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('-')) {
    fail(`bad screenshot name: ${name}`);
  }
  const size = statSync(join(shotsDir, name)).size;
  if (size > CAPS.screenshots.max_bytes) {
    fail(`screenshot ${name} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
  }
}

// --- Copy app/ and screenshots/ into /output, then write the dossier. ---
mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
const dossier = buildDossier(out, CAPS);
if (dossier.length > DOSSIER_MAX_BYTES) {
  fail(`dossier.json is ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} cap`);
}
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`Neon Vice Cover Studio handed in:`);
console.log(`  app/: ${appCount.files} entries, ${appCount.bytes} bytes`);
console.log(`  screenshots/: ${shots.join(', ')}`);
console.log(`  dossier.json: ${dossier.length} bytes`);
console.log(`  output: ${out}`);
