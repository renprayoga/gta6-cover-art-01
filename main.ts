// Neon Vice Cover Studio — entrypoint (Node 22, standard library only).
//
// Copies app/ and screenshots/ into the output directory and writes
// /output/dossier.json with make.fun's own buildDossier(), so the dossier
// is byte-identical to what the scorer computes from the same files.
// Deterministic: files are copied in sorted path order, and the dossier
// depends only on file contents, so two runs produce identical bytes.

import { buildDossier } from "./vendor/makefun-app.ts";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

function sortedEntries(dir: string): string[] {
  return readdirSync(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function copyTree(src: string, dest: string): number {
  let count = 0;
  mkdirSync(dest, { recursive: true });
  for (const name of sortedEntries(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) {
      count += copyTree(from, to);
    } else {
      cpSync(from, to);
      count += 1;
    }
  }
  return count;
}

const appFiles = copyTree(join(repoRoot, "app"), join(outDir, "app"));
let shotFiles = 0;
if (existsSync(join(repoRoot, "screenshots"))) {
  shotFiles = copyTree(join(repoRoot, "screenshots"), join(outDir, "screenshots"));
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
if (dossier.length > 1572864) {
  throw new Error(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
}
const sha = createHash("sha256").update(dossier).digest("hex");

console.log(`copied ${appFiles} app files and ${shotFiles} screenshots to ${outDir}`);
console.log(`dossier.json: ${dossier.length} bytes, sha256 ${sha}`);
