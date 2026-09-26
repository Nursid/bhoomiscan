/**
 * Application login tokens for this backend.
 *
 * kycServer.js had no login token of its own, so this module is the backend's
 * single place for issuing and checking JWTs. Mobile OTP login issues one after
 * MSG91 verifies the OTP; protected routes call `requireAuth(context)` to read
 * the `Authorization: Bearer <token>` header.
 *
 *   JWT_SECRET       required, long random string (never bundled in the app)
 *   JWT_EXPIRES_IN   optional, default "7d" (jsonwebtoken duration syntax)
 *   JWT_ISSUER       optional, default "trustledge-backend"
 *
 * Tokens are never logged.
 */

const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = '7d';
const DEFAULT_ISSUER = 'trustledge-backend';
const MIN_SECRET_LENGTH = 32;

const getConfig = () => ({
  secret: (process.env.JWT_SECRET || '').trim(),
  expiresIn: (process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN).trim(),
  issuer: (process.env.JWT_ISSUER || DEFAULT_ISSUER).trim(),
});

const isConfigured = () => getConfig().secret.length >= MIN_SECRET_LENGTH;

const authError = (statusCode, message) => Object.assign(new Error(message), { statusCode, success: false });

const ensureConfigured = () => {
  if (!isConfigured()) {
    throw authError(503, `Login tokens are not configured on the server (JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters).`);
  }
};

/**
 * Issues the application's login token for a user.
 * `user` must have a stable `id`; `mobile` (E.164) and `loginMethod` are stored as claims.
 */
const generateToken = (user) => {
  ensureConfigured();
  const { secret, expiresIn, issuer } = getConfig();
  if (!user || !user.id) {
    throw new Error('generateToken requires a user with an id');
  }
  const claims = {
    mobile: user.mobile || undefined,
    loginMethod: user.loginMethod || undefined,
  };
  return jwt.sign(claims, secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    issuer,
    expiresIn,
  });
};

/** Verifies a token and returns its claims, or throws a 401 auth error. */
const verifyToken = (token) => {
  ensureConfigured();
  const { secret, issuer } = getConfig();
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'], issuer });
  } catch (error) {
    const expired = error?.name === 'TokenExpiredError';
    throw authError(401, expired ? 'Login token has expired' : 'Invalid login token');
  }
};

const readBearerToken = (headers) => {
  const header = headers?.authorization || headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : null;
};

/**
 * Auth check for protected handlers. `context` is the second argument the
 * dispatcher passes to handlers ({ headers }). Returns the token claims.
 */
const requireAuth = (context) => {
  const token = readBearerToken(context?.headers);
  if (!token) {
    throw authError(401, 'Authorization token is required');
  }
  return verifyToken(token);
};

module.exports = {
  isConfigured,
  generateToken,
  verifyToken,
  requireAuth,
  readBearerToken,
  __testing: { getConfig, MIN_SECRET_LENGTH },
};
