const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/profile  ->  validate + store a parent portal profile update
module.exports = createEndpoint("/api/profile");
