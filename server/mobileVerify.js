/**
 * Mobile OTP login via the MSG91 OTP Widget.
 *
 *   POST /api/auth/mobile-verify   { mobile, otp, reqId }
 *
 * The UI already calls the MSG91 widget's sendOtp() and receives a reqId. This
 * backend never generates, sends, stores or compares an OTP. It only:
 *
 *   1. validates the request,
 *   2. asks MSG91 to verify `otp` for `reqId` (widget verifyOtp API, credentials from .env),
 *   3. on success issues this backend's login JWT (see authTokens.js) and returns
 *      { success, token, user }. The UI sends it as `Authorization: Bearer <token>`.
 *
 *   GET /api/auth/me   -> identity behind a Bearer token (protected-route example)
 *
 * SECURITY NOTE: MSG91's verifyOtp proves that the caller knows the OTP that
 * was sent for `reqId`. It does not, by itself, prove that `mobile` is the
 * number that OTP went to unless MSG91 echoes the identifier in its response.
 * When MSG91 does echo it, the backend enforces that it matches `mobile`.
 */

const msg91 = require('./msg91Client');
const authTokens = require('./authTokens');

const getConfig = () => ({
  defaultCountryCode: String(process.env.MOBILE_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, ''),
});

const authError = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, success: false, ...extra });

const maskMobile = (digits) => `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;

/* ----------------------------- Mobile handling ---------------------------- */

/**
 * Normalizes a phone number into one canonical E.164 form.
 *
 * The app is India-first (Aadhaar / PAN / Indian land records / Razorpay and
 * the existing `.slice(-10)` handling in RazorpayPaymentScreen), so a bare
 * 10-digit number gets the default country code (MOBILE_DEFAULT_COUNTRY_CODE=91).
 * Numbers that already carry a country code (+91..., 0091..., 91...) are kept,
 * which is the format the MSG91 widget uses (country code + number).
 *
 *   7081002501 / 07081002501 / 917081002501 / +91 70810 02501 -> +917081002501
 */
const normalizeMobile = (input, defaultCountryCode = getConfig().defaultCountryCode) => {
  if (input === undefined || input === null) {
    return null;
  }

  let raw = String(input).trim().replace(/[\s\-().]/g, '');
  if (!raw) {
    return null;
  }

  let hasExplicitCountryCode = false;
  if (raw.startsWith('+')) {
    hasExplicitCountryCode = true;
    raw = raw.slice(1);
  } else if (raw.startsWith('00')) {
    hasExplicitCountryCode = true;
    raw = raw.slice(2);
  }

  if (!/^\d+$/.test(raw)) {
    return null;
  }

  let digits = raw;
  if (!hasExplicitCountryCode) {
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      digits = `${defaultCountryCode}${digits}`;
    } else if (!digits.startsWith(defaultCountryCode)) {
      return null;
    }
  }

  // E.164: 8-15 digits, no leading zero.
  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) {
    return null;
  }

  const countryCode = digits.startsWith(defaultCountryCode) ? defaultCountryCode : null;
  const national = countryCode ? digits.slice(countryCode.length) : null;

  if (countryCode === '91' && !/^[6-9]\d{9}$/.test(national || '')) {
    return null;
  }

  return { e164: `+${digits}`, digits, countryCode, national };
};

/* ------------------------------ Request checks ---------------------------- */

const readRequest = (body) => {
  const mobile = normalizeMobile(body?.mobile);
  if (!mobile) {
    throw authError(400, 'Invalid mobile number');
  }

  const otp = body?.otp === undefined || body?.otp === null ? '' : String(body.otp).trim();
  if (!/^\d{4,8}$/.test(otp)) {
    throw authError(400, 'Invalid OTP');
  }

  const reqId = typeof body?.reqId === 'string' ? body.reqId.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(reqId)) {
    throw authError(400, 'reqId is required');
  }

  return { mobile, otp, reqId };
};

/* --------------------------- Application login step ----------------------- */

/**
 * Issues this backend's login token for the MSG91-verified mobile number.
 *
 * This backend keeps no user table: the app's profiles live in its client-side
 * provider. The verified mobile number is therefore the user's identity here
 * (user.id === E.164 mobile). If a user database is added later, look the
 * mobile up in it in this function and pass that record to generateToken.
 */
const issueApplicationLogin = async (mobile) => {
  const user = {
    id: mobile.e164,
    mobile: mobile.e164,
    loginMethod: 'mobile_otp',
  };
  const token = authTokens.generateToken(user);
  return {
    success: true,
    token,
    user: {
      id: user.id,
      mobile: user.mobile,
      loginMethod: user.loginMethod,
      lastLoginAt: new Date().toISOString(),
    },
  };
};

/* --------------------------------- Handler -------------------------------- */

const mobileVerify = async (body) => {
  if (!msg91.isConfigured()) {
    throw authError(503, 'Mobile OTP login is not configured on the server (MSG91).');
  }
  if (!authTokens.isConfigured()) {
    throw authError(503, 'Login tokens are not configured on the server (JWT_SECRET).');
  }

  const { mobile, otp, reqId } = readRequest(body);

  let result;
  try {
    result = await msg91.verifyWidgetOtp({ reqId, otp });
  } catch (error) {
    if (error instanceof msg91.Msg91Error) {
      throw authError(error.statusCode, error.message);
    }
    throw error;
  }

  if (result.identifier) {
    const verifiedMobile = normalizeMobile(result.identifier);
    if (!verifiedMobile || verifiedMobile.e164 !== mobile.e164) {
      console.warn(`[MOBILE VERIFY] Client mobile does not match the number MSG91 verified (${maskMobile(mobile.digits)})`);
      throw authError(401, 'Mobile number does not match the verified OTP session');
    }
  }

  console.log(`[MOBILE VERIFY] OTP verified by MSG91 for ${maskMobile(mobile.digits)} (reqId ${reqId})`);
  return module.exports.issueApplicationLogin(mobile);
};

/**
 * Returns the identity behind a login token. Example of a protected route:
 * send `Authorization: Bearer <token>` from the mobile-verify response.
 */
const me = async (body, context) => {
  const claims = authTokens.requireAuth(context);
  return {
    success: true,
    user: {
      id: claims.sub,
      mobile: claims.mobile || null,
      email: claims.email || null,
      role: claims.role || 'user',
      loginMethod: claims.loginMethod || null,
    },
    expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
  };
};

const handlers = {
  'POST /api/auth/mobile-verify': mobileVerify,
  'GET /api/auth/me': me,
};

module.exports = {
  handlers,
  mobileVerify,
  me,
  normalizeMobile,
  issueApplicationLogin,
};
