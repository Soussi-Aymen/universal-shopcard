'use strict';

const MAX_INTENT_LENGTH = 500;

const INJECTION_PATTERNS = [
  /\bignore\b/gi,
  /\boverride\b/gi,
  /\bsystem\s+prompt\b/gi,
  /\bprevious\s+instructions\b/gi,
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<script\b[^>]*>/gi,
];

/**
 * Remove nested JSON object literals embedded in a string.
 * @param {string} input
 * @returns {string}
 */
function stripNestedJsonObjects(input) {
  let result = input;
  let previous;
  const jsonObjectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  do {
    previous = result;
    result = result.replace(jsonObjectPattern, '');
  } while (result !== previous);
  return result;
}

/**
 * Strip injection patterns, trim, and collapse whitespace.
 * @param {string} input
 * @returns {string}
 */
function sanitizeIntentString(input) {
  let value = input.trim().replace(/\s+/g, ' ');

  for (const pattern of INJECTION_PATTERNS) {
    value = value.replace(pattern, '');
  }

  value = stripNestedJsonObjects(value);
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Express middleware: sanitize intent/prompt strings on incoming JSON bodies.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function sanitizeMiddleware(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const intentField =
    typeof req.body.prompt === 'string'
      ? 'prompt'
      : typeof req.body.intent === 'string'
        ? 'intent'
        : null;

  if (!intentField) {
    return next();
  }

  const raw = req.body[intentField];

  if (raw.length > MAX_INTENT_LENGTH) {
    return res.status(400).json({
      error: `Intent string exceeds maximum length of ${MAX_INTENT_LENGTH} characters`,
    });
  }

  req.body[intentField] = sanitizeIntentString(raw);
  return next();
}

module.exports = sanitizeMiddleware;
module.exports.sanitizeIntentString = sanitizeIntentString;
module.exports.MAX_INTENT_LENGTH = MAX_INTENT_LENGTH;
