const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

const apiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests, please try again later.",
  },
});

module.exports = { apiRateLimiter };
