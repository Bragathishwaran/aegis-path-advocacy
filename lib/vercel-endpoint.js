/**
 * ============================================================================
 * AegisPoint Advocacy & Consulting - Vercel Endpoint Factory
 * Wraps the shared API core into a Vercel Serverless Function handler.
 * ============================================================================
 */

const { handleApiRequest, sendJson, CORS_HEADERS } = require("./api-core");

/**
 * Create a Vercel Serverless Function for a given API path.
 * @param {string} apiPath e.g. "/api/contact"
 * @returns {(req: any, res: any) => Promise<any>}
 */
function createEndpoint(apiPath) {
  return async function handler(req, res) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      return res.end();
    }

    try {
      const { status, payload } = await handleApiRequest(apiPath, req.method, req.body);
      return sendJson(res, status, payload);
    } catch (err) {
      console.error(`API error (${apiPath}):`, err);
      return sendJson(res, 500, { success: false, error: "Internal server error" });
    }
  };
}

module.exports = { createEndpoint };
