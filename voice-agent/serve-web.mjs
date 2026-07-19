import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./web", import.meta.url)));
const port = Number(process.argv[2] || 8790);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function resolveRequestPath(url) {
  const decodedPath = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const candidate = resolve(root, normalize(relativePath));
  return candidate.startsWith(root) ? candidate : null;
}

createServer((request, response) => {
  const path = resolveRequestPath(request.url);

  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(path)] || "application/octet-stream"
  });
  createReadStream(path).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`RMCC Voice Agent web server: http://127.0.0.1:${port}`);
  console.log(`Serving: ${root}`);
});
