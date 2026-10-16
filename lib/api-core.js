/**
 * ============================================================================
 * AegisPoint Advocacy & Consulting - Shared API Core
 * Single source of truth for API routing/validation/persistence.
 * Used by both the local Node server (server.js) and the Vercel Serverless
 * Functions in /api, so behaviour is identical in development and production.
 * ============================================================================
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

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
} = require("../api/validator");

// Serverless platforms give us a read-only project directory, so submissions
// are written to the temporary directory instead.
const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
);
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), "data")
  : path.join(__dirname, "..", "data");
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

/**
 * Dispatch an API request to the correct endpoint.
 *
 * @param {string} pathname  e.g. "/api/contact"
 * @param {string} method    HTTP method
 * @param {object} body      Parsed request body (or query string object for GET)
 * @returns {Promise<{status: number, payload: object}>}
 */
async function handleApiRequest(pathname, method, body) {
  method = String(method || "POST").toUpperCase();
  if (!body || typeof body !== "object") body = {};

  if (method !== "POST" && method !== "GET") {
    return { status: 405, payload: { success: false, error: "Method not allowed" } };
  }

  // 1. Contact Form
  if (pathname === "/api/contact") {
    const result = validateContactForm(body);
    if (!result.isValid) {
      return {
        status: 400,
        payload: {
          success: false,
          message: "Validation failed. Please correct the highlighted errors.",
          errors: result.errors
        }
      };
    }
    const record = saveSubmission("contact", body);
    return {
      status: 200,
      payload: {
        success: true,
        message: "Thank you! Your message has been received. An advocate will reach out within 1 business day.",
        recordId: record ? record.id : null
      }
    };
  }

  // 2. Consultation Form
  if (pathname === "/api/consultation") {
    const result = validateConsultationForm(body);
    if (!result.isValid) {
      return {
        status: 400,
        payload: {
          success: false,
          message: "Validation failed. Please correct the highlighted errors.",
          errors: result.errors
        }
      };
    }
    const record = saveSubmission("consultation", body);
    return {
      status: 200,
      payload: {
        success: true,
        message: "Thank you! Your consultation request has been received.",
        recordId: record ? record.id : null
      }
    };
  }

  // 3. Newsletter / Notify
  if (pathname === "/api/newsletter" || pathname === "/api/notify") {
    const result = validateNewsletter(body);
    if (!result.isValid) {
      return {
        status: 400,
        payload: {
          success: false,
          message: "Validation failed. Please enter a valid email address.",
          errors: result.errors
        }
      };
    }
    const record = saveSubmission("newsletter", body);
    return {
      status: 200,
      payload: {
        success: true,
        message: "Subscribed! Thank you for joining our community.",
        recordId: record ? record.id : null
      }
    };
  }

  // 4. Login
  if (pathname === "/api/login") {
    const result = validateLogin(body);
    if (!result.isValid) {
      return {
        status: 400,
        payload: {
          success: false,
          message: "Invalid login credentials format.",
          errors: result.errors
        }
      };
    }
    return {
      status: 200,
      payload: {
        success: true,
        message: "Login successful.",
        token: "demo-jwt-token"
      }
    };
  }

  // 5. Profile Update
  if (pathname === "/api/profile") {
    const result = validateProfile(body);
    if (!result.isValid) {
      return {
        status: 400,
        payload: {
          success: false,
          message: "Profile validation failed.",
          errors: result.errors
        }
      };
    }
    saveSubmission("profile_update", body);
    return {
      status: 200,
      payload: {
        success: true,
        message: "Profile settings successfully saved."
      }
    };
  }

  // 6. Generic Field Validation
  if (pathname === "/api/validate") {
    const { field, value, type } = body;
    let error = null;
    if (type === "name") error = validateName(value, field || "Name");
    else if (type === "mobile" || type === "phone") error = validateMobile(value, field || "Mobile");
    else if (type === "email") error = validateEmail(value, field || "Email");
    else if (type === "age") error = validateAge(value);

    return {
      status: 200,
      payload: {
        valid: !error,
        error: error || null
      }
    };
  }

  return { status: 404, payload: { success: false, error: "API endpoint not found" } };
}

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/**
 * Write a JSON response. Works with both the classic Node
 * (req, res) server and Vercel's helper-augmented response object.
 */
function sendJson(res, statusCode, data) {
  if (res && typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, CORS_HEADERS);
  res.end(JSON.stringify(data));
}

module.exports = {
  handleApiRequest,
  sendJson,
  CORS_HEADERS,
  saveSubmission,
  DATA_DIR,
  SUBMISSIONS_FILE
};
