import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import http from "node:http";

const ROOT = resolve("D:/SCIGUIDEAPP");
const PORT = 4173;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function safePath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalized = normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const requested = normalized === "/" ? "site/index.html" : normalized.replace(/^[/\\]+/, "");
  const absolute = resolve(ROOT, requested);

  if (!absolute.startsWith(ROOT)) {
    return null;
  }

  if (existsSync(absolute) && statSync(absolute).isDirectory()) {
    const indexFile = join(absolute, "index.html");
    return existsSync(indexFile) ? indexFile : null;
  }

  return existsSync(absolute) ? absolute : null;
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url || "/");

  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });

  createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SCI site server running at http://127.0.0.1:${PORT}/site/`);
});
