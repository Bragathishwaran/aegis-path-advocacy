/**
 * ============================================================================
 * AegisPoint Advocacy & Consulting - Backend Server
 * Node.js HTTP server providing static file serving and strict backend API validation.
 * ============================================================================
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleApiRequest, sendJson } = require("./lib/api-core");

const PORT = process.env.PORT || 3000;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Protect against large payloads
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (e) {
        // Fallback for urlencoded
        try {
          const params = new URLSearchParams(body);
          const obj = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          resolve(obj);
        } catch (err) {
          resolve({});
        }
      }
    });
    req.on("error", reject);
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, "http://localhost");
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  // API Endpoints (delegated to the shared core so the local server and the
  // Vercel Serverless Functions in /api behave identically)
  if (pathname.startsWith("/api/")) {
    if (method !== "POST" && method !== "GET") {
      return sendJson(res, 405, { success: false, error: "Method not allowed" });
    }

    try {
      const query = Object.fromEntries(parsedUrl.searchParams.entries());
      const body = method === "POST" ? await parseJsonBody(req) : query;
      const { status, payload } = await handleApiRequest(pathname, method, body);
      return sendJson(res, status, payload);
    } catch (err) {
      console.error("API error:", err);
      return sendJson(res, 500, { success: false, error: "Internal server error" });
    }
  }

  // Static File Serving
  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (e) {
    decodedPath = pathname;
  }
  let filePath = path.join(__dirname, decodedPath === "/" ? "index.html" : decodedPath);
  // Normalize and prevent directory traversal
  filePath = path.normalize(filePath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      // If file not found, try appending .html
      if (!path.extname(filePath)) {
        const htmlPath = filePath + ".html";
        if (fs.existsSync(htmlPath)) {
          filePath = htmlPath;
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          const notFoundPath = path.join(__dirname, "404.html");
          if (fs.existsSync(notFoundPath)) {
            return fs.createReadStream(notFoundPath).pipe(res);
          }
          return res.end("404 Not Found");
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("404 Not Found");
      }
    } else if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Internal Server Error");
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
});

if (require.main === module || (process.env.PORT && !process.env.VERCEL)) {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
