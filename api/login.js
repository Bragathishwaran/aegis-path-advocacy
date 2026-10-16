const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/login  ->  validate credentials (demo only)
module.exports = createEndpoint("/api/login");
