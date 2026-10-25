#!/usr/bin/env node
// Minimal Nx self-hosted remote cache (the OpenAPI contract: GET/PUT /v1/cache/{hash}, bearer token).
// Test double for benchmarks, not a production server: no TTL, no read-only tokens.
//   node bench/nx/cache-server.mjs <storage-dir> [--port 8787] [--token secret]
import { createServer } from "node:http";
import { mkdirSync, createReadStream, createWriteStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const [dir, ...rest] = process.argv.slice(2);
const flag = (n, d) => (rest.includes(`--${n}`) ? rest[rest.indexOf(`--${n}`) + 1] : d);
const port = Number(flag("port", 8787));
const token = flag("token", "secret");
mkdirSync(dir, { recursive: true });

createServer((req, res) => {
  const m = /^\/v1\/cache\/([A-Za-z0-9]+)$/.exec(req.url ?? "");
  if (req.headers.authorization !== `Bearer ${token}`)
    return void res.writeHead(401).end("unauthorized");
  if (!m) return void res.writeHead(404).end();
  const file = join(dir, m[1]);
  if (req.method === "GET") {
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": statSync(file).size,
    });
    return void createReadStream(file).pipe(res);
  }
  if (req.method === "PUT") {
    if (existsSync(file)) return void res.writeHead(409).end("exists");
    req.pipe(createWriteStream(file)).on("finish", () => res.writeHead(200).end());
    return;
  }
  res.writeHead(405).end();
}).listen(port, () => console.error(`nx cache server on :${port}, storage ${dir}`));
