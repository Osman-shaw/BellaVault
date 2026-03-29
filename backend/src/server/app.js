const express = require("express");
const cors = require("cors");
const routes = require("../routes");
const { apiRateLimiter } = require("../middleware/rateLimiter");
const { optionalAuth } = require("../middleware/authenticate");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(optionalAuth);
  app.use(apiRateLimiter);
  app.use("/api", routes);

  app.use((err, _req, res, _next) => {
    const message = err && err.message ? err.message : "Internal server error";
    const status = err && typeof err.statusCode === "number" ? err.statusCode : 500;
    res.status(status).json({ message });
  });

  return app;
}

module.exports = { createApp };
