/**
 * Admin login.
 *
 *   POST /api/auth/admin-login   { email, password }  ->  { success, token, user }
 *
 * The single admin account comes from the environment (no user database here):
 *   ADMIN_EMAIL      admin's email
 *   ADMIN_PASSWORD   admin's password (keep it long; never bundled in the app)
 *
 * The token is the same backend JWT as mobile login (authTokens.js) but carries
 * role=admin, which admin-only routes check with authTokens.requireRole().
 * Passwords are compared in constant time and never logged. Failed attempts are
 * rate limited per client IP.
 */

const { createHash, timingSafeEqual } = require('crypto');
const authTokens = require('./authTokens');

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map();

const getConfig = () => ({
  email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || '',
});

const MIN_PASSWORD_LENGTH = 8;

const isConfigured = () => {
  const { email, password } = getConfig();
  return Boolean(email && password.length >= MIN_PASSWORD_LENGTH);
};

/** Human-readable reason when not configured, for logs and the 503 message. */
const configProblem = () => {
  const { email, password } = getConfig();
  if (!email) {
    return 'ADMIN_EMAIL is not set';
  }
  if (!password) {
    return 'ADMIN_PASSWORD is not set';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters (currently ${password.length})`;
  }
  return null;
};

const authError = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, success: false, ...extra });

const sha256 = (value) => createHash('sha256').update(String(value)).digest();

/** Constant-time string comparison (hashes first so lengths never leak). */
const safeEqual = (a, b) => timingSafeEqual(sha256(a), sha256(b));

const clientIp = (context) =>
  String(context?.headers?.['x-forwarded-for'] || context?.ip || 'unknown')
    .split(',')[0]
    .trim() || 'unknown';

const checkRateLimit = (ip) => {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= Date.now()) {
    return;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
    throw authError(429, 'Too many login attempts. Please try again later.', { details: { retryAfterSeconds } });
  }
};

const recordFailure = (ip) => {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= Date.now()) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
};

const adminLogin = async (body, context) => {
  if (!isConfigured()) {
    throw authError(503, `Admin login is not configured on the server: ${configProblem()}. Update .env and restart.`);
  }
  if (!authTokens.isConfigured()) {
    throw authError(503, 'Login tokens are not configured on the server (JWT_SECRET).');
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) {
    throw authError(400, 'Email and password are required');
  }

  const ip = clientIp(context);
  checkRateLimit(ip);

  const config = getConfig();
  const emailOk = safeEqual(email, config.email);
  const passwordOk = safeEqual(password, config.password);
  if (!emailOk || !passwordOk) {
    recordFailure(ip);
    console.warn(`[ADMIN LOGIN] Failed attempt from ${ip}`);
    throw authError(401, 'Invalid email or password');
  }

  attempts.delete(ip);
  const user = { id: 'admin', email: config.email, role: 'admin', loginMethod: 'password' };
  const token = authTokens.generateToken(user);
  console.log(`[ADMIN LOGIN] Admin logged in from ${ip}`);
  return {
    success: true,
    token,
    user: { id: user.id, email: user.email, role: user.role, lastLoginAt: new Date().toISOString() },
  };
};

const handlers = {
  'POST /api/auth/admin-login': adminLogin,
};

module.exports = {
  handlers,
  adminLogin,
  isConfigured,
  configProblem,
  __testing: { attempts, MAX_ATTEMPTS, MIN_PASSWORD_LENGTH },
};
