const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/newsletter  ->  validate + store a newsletter subscription
module.exports = createEndpoint("/api/newsletter");
