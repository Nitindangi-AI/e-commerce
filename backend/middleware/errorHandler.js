"use strict";

const { ZodError } = require("zod");
const { AppError, AuthError, NotFoundError } = require("./errors");

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler — MUST be the last middleware registered in index.js.
//
// Signature: (err, req, res, next)  ← 4-arg form is required by Express.
//
// Status code mapping:
//   ZodError             → 400  (validation failure from Zod schema)
//   AuthError            → 401  (not authenticated / bad token)
//   NotFoundError        → 404  (resource does not exist)
//   AppError (other)     → err.statusCode  (ForbiddenError=403, BadRequestError=400 …)
//   Any other Error      → 500  (unexpected / internal)
//
// Response shape (always JSON):
//   { error: true, message: string, statusCode: number }
//
// In development (NODE_ENV !== 'production') the `stack` trace is also included.
// ─────────────────────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode;
  let message;

  // ── ZodError (body validation failures forwarded via next(err)) ──────────
  if (err instanceof ZodError) {
    statusCode = 400;
    const firstIssue = err.issues[0];
    message = firstIssue
      ? `${firstIssue.path.join(".") || "body"}: ${firstIssue.message}`
      : "Validation failed";
  }

  // ── Custom AuthError → 401 ───────────────────────────────────────────────
  else if (err instanceof AuthError) {
    statusCode = 401;
    message = err.message;
  }

  // ── Custom NotFoundError → 404 ───────────────────────────────────────────
  else if (err instanceof NotFoundError) {
    statusCode = 404;
    message = err.message;
  }

  // ── Any other AppError subclass (ForbiddenError=403, BadRequestError=400) ─
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // ── JWT errors (thrown by jsonwebtoken) ──────────────────────────────────
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
  }

  // ── PostgreSQL / pg-specific errors ─────────────────────────────────────
  else if (err.code === "23505") {
    // Unique constraint violation
    statusCode = 409;
    const detail = err.detail || "";
    const field = detail.match(/\(([^)]+)\)/)?.[1] || "field";
    message = `Duplicate value: ${field} already exists.`;
  }
  else if (err.code === "23503") {
    // Foreign key violation
    statusCode = 400;
    message = "Referenced resource does not exist.";
  }

  // ── Fallback → 500 Internal Server Error ─────────────────────────────────
  else {
    statusCode = err.statusCode || 500;
    // Never leak internal error details to the client in production
    message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message || "Internal Server Error";
  }

  // ── Server-side log (always) ──────────────────────────────────────────────
  const isServerError = statusCode >= 500;
  if (isServerError) {
    console.error(`❌ [${statusCode}] ${req.method} ${req.originalUrl} — ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.warn(`⚠️  [${statusCode}] ${req.method} ${req.originalUrl} — ${message}`);
  }

  // ── Response (always JSON) ────────────────────────────────────────────────
  const body = {
    error: true,
    message,
    statusCode,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
};

module.exports = errorHandler;
