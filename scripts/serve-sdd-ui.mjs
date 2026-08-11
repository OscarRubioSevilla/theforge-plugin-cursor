#!/usr/bin/env node
/**
 * Servidor estático + API JSON para el dashboard SDD local.
 *
 * Uso:
 *   node scripts/serve-sdd-ui.mjs [--root PATH] [--port 4173] [--host 127.0.0.1]
 */
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkflowViewModel } from "./workflow-read.util.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const UI_DIR = join(PACKAGE_ROOT, "ui");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function parseArgs(argv) {
  const opts = {
    root: PACKAGE_ROOT,
    port: 4173,
    host: "127.0.0.1",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root" && argv[i + 1]) opts.root = resolve(argv[++i]);
    else if (arg === "--port" && argv[i + 1]) opts.port = Number(argv[++i]);
    else if (arg === "--host" && argv[i + 1]) opts.host = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isFinite(opts.port) || opts.port <= 0) {
    console.error("Error: --port debe ser un número positivo.");
    process.exit(1);
  }

  return opts;
}

function printHelp() {
  console.log(`Uso: node scripts/serve-sdd-ui.mjs [opciones]

Opciones:
  --root PATH   Raíz del workspace SDD (default: packages/cursor-sdd-workspace)
  --port NUM    Puerto HTTP (default: 4173)
  --host HOST   Host de escucha (default: 127.0.0.1)
  --help        Mostrar ayuda
`);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(body);
}

function serveStatic(res, filePath) {
  if (!existsSync(filePath)) {
    sendText(res, 404, "No encontrado");
    return;
  }

  const ext = extname(filePath);
  const mime = MIME[ext] ?? "application/octet-stream";
  const body = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
  res.end(body);
}

function createHandler(root) {
  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/workflow") {
      try {
        sendJson(res, 200, buildWorkflowViewModel(root));
      } catch (err) {
        sendJson(res, 500, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (pathname === "/api/health") {
      sendJson(res, 200, { ok: true, root });
      return;
    }

    let filePath;
    if (pathname === "/" || pathname === "") {
      filePath = join(UI_DIR, "index.html");
    } else {
      const relative = pathname.replace(/^\/+/, "");
      if (relative.includes("..")) {
        sendText(res, 400, "Ruta inválida");
        return;
      }
      filePath = join(UI_DIR, relative);
    }

    serveStatic(res, filePath);
  };
}

function main() {
  const opts = parseArgs(process.argv);
  const server = createServer(createHandler(opts.root));

  server.listen(opts.port, opts.host, () => {
    console.log("");
    console.log("Forge SDD — dashboard local");
    console.log(`  URL:      http://${opts.host}:${opts.port}/`);
    console.log(`  WORKFLOW: ${join(opts.root, "WORKFLOW.yaml")}`);
    console.log(`  API:      http://${opts.host}:${opts.port}/api/workflow`);
    console.log("");
    console.log("Ctrl+C para detener.");
  });
}

main();
