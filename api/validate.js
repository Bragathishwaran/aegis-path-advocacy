const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/validate  ->  single-field validation helper
module.exports = createEndpoint("/api/validate");
