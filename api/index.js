const app = require("../backend/src/index");
const serverless = require("serverless-http");

module.exports = serverless(app);
