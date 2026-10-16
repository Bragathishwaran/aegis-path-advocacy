const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/notify  ->  validate + store a "notify me" email subscription
module.exports = createEndpoint("/api/notify");
