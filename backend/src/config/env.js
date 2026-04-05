const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";

const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  nodeEnv,
  /** When true, OTP codes are included in API JSON (dev convenience). In production, set explicitly — never enable without SMS. */
  authReturnOtpInResponse:
    process.env.AUTH_RETURN_OTP_IN_RESPONSE === "true" ||
    (nodeEnv !== "production" && process.env.AUTH_RETURN_OTP_IN_RESPONSE !== "false"),
  /** Server-only. Used for GoldAPI.io / app.goldapi.net precious metal spot prices. Never expose to clients. */
  goldapiApiKey: process.env.GOLDAPI_API_KEY || "",
  goldapiBaseUrl: (process.env.GOLDAPI_BASE_URL || "https://app.goldapi.net").replace(/\/$/, ""),
};

module.exports = { env };
