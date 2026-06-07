const rateLimit = require("express-rate-limit");

/**
 * Auth limiter — strict rate limit for login / register endpoints.
 * Max 10 requests per 15 minutes per IP to prevent brute-force.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

/**
 * API limiter — general rate limit for all API endpoints.
 * Max 100 requests per 1 minute per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

module.exports = { authLimiter, apiLimiter };
