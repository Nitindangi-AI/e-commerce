const xssClean = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");

/**
 * Input sanitization middleware stack.
 *
 * - xss-clean:              Strips HTML / script tags from req.body, req.query, req.params
 * - express-mongo-sanitize: Removes $ and . from user input to prevent NoSQL injection
 *
 * Apply both as global middleware BEFORE route handlers.
 */
const sanitize = [
  (req, res, next) => {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true
    });
    Object.defineProperty(req, 'params', {
      value: { ...req.params },
      writable: true,
      configurable: true
    });
    next();
  },
  xssClean(),
  mongoSanitize({ replaceWith: "_" }),
];

module.exports = sanitize;
