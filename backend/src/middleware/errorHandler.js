"use strict";

const { ZodError } = require("zod");
const { AppError, AuthError, NotFoundError } = require("./errors");

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode;
  let message;

  if (err instanceof ZodError) {
    statusCode = 400;
    const firstIssue = err.issues[0];
    message = firstIssue
      ? `${firstIssue.path.join(".") || "body"}: ${firstIssue.message}`
      : "Validation failed";
  }
  else if (err instanceof AuthError) {
    statusCode = 401;
    message = err.message;
  }
  else if (err instanceof NotFoundError) {
    statusCode = 404;
    message = err.message;
  }
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
  }
  else if (err.code === "23505") {
    statusCode = 409;
    const detail = err.detail || "";
    const field = detail.match(/\(([^)]+)\)/)?.[1] || "field";
    message = `Duplicate value: ${field} already exists.`;
  }
  else if (err.code === "23503") {
    statusCode = 400;
    message = "Referenced resource does not exist.";
  }
  else {
    statusCode = err.statusCode || 500;
    message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message || "Internal Server Error";
  }

  const isServerError = statusCode >= 500;
  if (isServerError) {
    console.error(`❌ [${statusCode}] ${req.method} ${req.originalUrl} — ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.warn(`⚠️  [${statusCode}] ${req.method} ${req.originalUrl} — ${message}`);
  }

  const body = {
    error: true,
    message,
    statusCode,
  };

  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
};

module.exports = errorHandler;
