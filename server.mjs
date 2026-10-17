// Fenster local server: serves the app, dataset and content as static files, plus the /api routes that call Claude.
// Run with `npm start` (reads ANTHROPIC_API_KEY from .env), then open http://localhost:3000
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleCheck, UserError } from "./server/routes/check.mjs";
import { claudeAvailable, MODEL } from "./server/lib/claude.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
// Only these top-level folders are served. Everything else (.env, scripts, server code) stays private.
const PUBLIC_DIRS = new Set(["app", "dataset", "content", "design"]);
const ROUTES = {
  "POST /api/check": handleCheck,
};
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req, limit = 20_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new UserError("Message too long.");
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new UserError("Invalid request.");
  }
}

/** Resolve a URL path to a file inside a public folder, or null. */
export function resolvePublicPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const rel = normalize(decoded).replace(/^[/\\]+/, "");
  const top = rel.split(/[/\\]/)[0];
  if (!PUBLIC_DIRS.has(top) || rel.split(/[/\\]/).includes("..")) return null;
  const file = join(ROOT, rel);
  return file.startsWith(ROOT + top + sep) || file === join(ROOT, top) ? file : null;
}

async function serveStatic(pathname, res) {
  let file = resolvePublicPath(pathname);
  if (file && (await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
  const data = file && (await readFile(file).catch(() => null));
  if (!data) return sendJson(res, 404, { error: "Not found" });
  // no-cache: the browser always gets the latest file while we edit (no stale screens in the demo).
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  res.end(data);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    const route = ROUTES[`${req.method} ${url.pathname}`];
    if (route) return sendJson(res, 200, await route(await readJsonBody(req)));
    if (url.pathname.startsWith("/api/")) return sendJson(res, 404, { error: "Not found" });
    if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed" });
    if (url.pathname === "/") {
      res.writeHead(302, { Location: `/app/${url.search}` });
      return res.end();
    }
    await serveStatic(url.pathname, res);
  } catch (err) {
    if (err instanceof UserError) return sendJson(res, err.status, { error: err.message });
    console.error(err);
    sendJson(res, 500, { error: "Something didn't work. Please try again." });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`Fenster is running: http://localhost:${PORT}`);
    console.log(
      claudeAvailable()
        ? `Claude: on (${MODEL})`
        : "Claude: off (no ANTHROPIC_API_KEY in .env). The scam checker uses its simple offline check.",
    );
  });
}
