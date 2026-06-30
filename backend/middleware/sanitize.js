const xssClean = require("xss-clean");

/**
 * Input sanitization middleware stack.
 *
 * - xss-clean:              Strips HTML / script tags from req.body, req.query, req.params
 *
 * Apply as global middleware BEFORE route handlers.
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
];

module.exports = sanitize;
