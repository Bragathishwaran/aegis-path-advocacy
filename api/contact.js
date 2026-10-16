const { createEndpoint } = require("../lib/vercel-endpoint");

// POST /api/contact  ->  validate + store a contact form submission
module.exports = createEndpoint("/api/contact");
