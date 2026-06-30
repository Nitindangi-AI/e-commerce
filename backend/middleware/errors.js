"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// Custom application error classes
//
// Usage in controllers/middleware:
//   throw new NotFoundError("Product not found");
//   throw new AuthError("Invalid token");
//   next(new NotFoundError("Order not found"));   // when inside a try/catch
// ─────────────────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 401 — caller is not authenticated or token is invalid */
class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

/** 403 — caller is authenticated but lacks permission */
class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403);
  }
}

/** 404 — requested resource does not exist */
class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

/** 400 — request body / params are semantically invalid */
class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

module.exports = { AppError, AuthError, ForbiddenError, NotFoundError, BadRequestError };
