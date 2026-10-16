const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/consultation  ->  validate + store a consultation request
module.exports = createEndpoint("/api/consultation");
