// Tiny static server for previewing the studio locally (Node 22, stdlib only).
//
// Serves only files under app/ next to this file, rejects path traversal,
// and never logs request bodies or anything else. Run:
//   node serve.ts            # http://localhost:8080
//   PORT=9000 node serve.ts  # http://localhost:9000

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(join(dirname(fileURLToPath(import.meta.url)), "app"));
const port = Number(process.env.PORT || 8080);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("method not allowed\n");
    return;
  }
  const rawPath = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
  if (rawPath === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok\n");
    return;
  }
  const rel = normalize(rawPath === "/" ? "index.html" : rawPath.replace(/^\//, ""));
  const file = join(appDir, rel);
  if (!file.startsWith(appDir + sep) && file !== appDir) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden\n");
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found\n");
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
    "content-length": body.length,
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Neon Vice Cover Studio: http://localhost:${port}`);
});
