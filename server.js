/**
 * ============================================================================
 * AegisPoint Advocacy & Consulting - Backend Server
 * Node.js HTTP server providing static file serving and strict backend API validation.
 * ============================================================================
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const {
  validateContactForm,
  validateConsultationForm,
  validateNewsletter,
  validateLogin,
  validateProfile,
  validateName,
  validateMobile,
  validateEmail,
  validateAge
} = require("./api/validator");

const os = require("os");
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
  ? path.join(os.tmpdir(), "data") 
  : path.join(__dirname, "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");

// Ensure data directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([]));
  }
} catch (e) {
  console.warn("Could not initialize submissions directory:", e.message);
}

function saveSubmission(type, payload) {
  try {
    let existing = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      existing = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf-8") || "[]");
    }
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      data: payload,
      createdAt: new Date().toISOString()
    };
    existing.push(record);
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(existing, null, 2));
    return record;
  } catch (err) {
    console.error("Error saving submission:", err);
    return null;
  }
}

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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
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

  // API Endpoints
  if (pathname.startsWith("/api/")) {
    if (method !== "POST" && method !== "GET") {
      return sendJson(res, 405, { success: false, error: "Method not allowed" });
    }

    try {
      const query = Object.fromEntries(parsedUrl.searchParams.entries());
      const body = method === "POST" ? await parseJsonBody(req) : query;

      // 1. Contact Form
      if (pathname === "/api/contact") {
        const result = validateContactForm(body);
        if (!result.isValid) {
          return sendJson(res, 400, {
            success: false,
            message: "Validation failed. Please correct the highlighted errors.",
            errors: result.errors
          });
        }
        const record = saveSubmission("contact", body);
        return sendJson(res, 200, {
          success: true,
          message: "Thank you! Your message has been received. An advocate will reach out within 1 business day.",
          recordId: record ? record.id : null
        });
      }

      // 2. Consultation Form
      if (pathname === "/api/consultation") {
        const result = validateConsultationForm(body);
        if (!result.isValid) {
          return sendJson(res, 400, {
            success: false,
            message: "Validation failed. Please correct the highlighted errors.",
            errors: result.errors
          });
        }
        const record = saveSubmission("consultation", body);
        return sendJson(res, 200, {
          success: true,
          message: "Thank you! Your consultation request has been received.",
          recordId: record ? record.id : null
        });
      }

      // 3. Newsletter / Notify
      if (pathname === "/api/newsletter" || pathname === "/api/notify") {
        const result = validateNewsletter(body);
        if (!result.isValid) {
          return sendJson(res, 400, {
            success: false,
            message: "Validation failed. Please enter a valid email address.",
            errors: result.errors
          });
        }
        const record = saveSubmission("newsletter", body);
        return sendJson(res, 200, {
          success: true,
          message: "Subscribed! Thank you for joining our community.",
          recordId: record ? record.id : null
        });
      }

      // 4. Login
      if (pathname === "/api/login") {
        const result = validateLogin(body);
        if (!result.isValid) {
          return sendJson(res, 400, {
            success: false,
            message: "Invalid login credentials format.",
            errors: result.errors
          });
        }
        return sendJson(res, 200, {
          success: true,
          message: "Login successful.",
          token: "demo-jwt-token"
        });
      }

      // 5. Profile Update
      if (pathname === "/api/profile") {
        const result = validateProfile(body);
        if (!result.isValid) {
          return sendJson(res, 400, {
            success: false,
            message: "Profile validation failed.",
            errors: result.errors
          });
        }
        saveSubmission("profile_update", body);
        return sendJson(res, 200, {
          success: true,
          message: "Profile settings successfully saved."
        });
      }

      // 6. Generic Field Validation
      if (pathname === "/api/validate") {
        const { field, value, type } = body;
        let error = null;
        if (type === "name") error = validateName(value, field || "Name");
        else if (type === "mobile" || type === "phone") error = validateMobile(value, field || "Mobile");
        else if (type === "email") error = validateEmail(value, field || "Email");
        else if (type === "age") error = validateAge(value);

        return sendJson(res, 200, {
          valid: !error,
          error: error || null
        });
      }

      return sendJson(res, 404, { success: false, error: "API endpoint not found" });
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
