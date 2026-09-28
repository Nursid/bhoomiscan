/**
 * Razorpay REST client (subscriptions).
 *
 * The backend already talks to Razorpay with `fetch` + Basic auth (payments
 * poller in kycServer.js); this module follows the same approach for the
 * Subscriptions API. No SDK is installed, and none is needed.
 *
 *   RAZORPAY_KEY_ID          public key id (also returned to the app for Checkout)
 *   RAZORPAY_KEY_SECRET      secret, backend only
 *   RAZORPAY_WEBHOOK_SECRET  secret configured on the Razorpay webhook, backend only
 *
 * Docs: https://razorpay.com/docs/api/payments/subscriptions/
 */

const { Buffer } = require('buffer');
const { createHmac, timingSafeEqual } = require('crypto');

// Live API host. Test mode is not used by this project.
const DEFAULT_BASE_URL = 'https://api.razorpay.com';
const DEFAULT_TIMEOUT_MS = 20000;

class RazorpayError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'RazorpayError';
    this.statusCode = options.statusCode || 502;
    this.providerMessage = options.providerMessage || null;
    this.providerCode = options.providerCode || null;
  }
}

const getConfig = () => ({
  keyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
  keySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
  webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),
  baseUrl: (process.env.RAZORPAY_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
  timeoutMs: Number(process.env.RAZORPAY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
});

const isConfigured = () => {
  const { keyId, keySecret } = getConfig();
  return Boolean(keyId && keySecret);
};

const isWebhookConfigured = () => Boolean(getConfig().webhookSecret);

const getKeyId = () => getConfig().keyId;

const request = async (method, pathname, body) => {
  const { keyId, keySecret, baseUrl, timeoutMs } = getConfig();
  if (!keyId || !keySecret) {
    throw new RazorpayError('Payments are not configured on the server (Razorpay).', { statusCode: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let text = '';
  try {
    response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: {
        authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    text = await response.text();
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'Razorpay request timed out.' : error?.message;
    console.warn(`[RAZORPAY] ${method} ${pathname} unreachable:`, reason);
    throw new RazorpayError('Unable to reach the payment provider.', { statusCode: 502, providerMessage: reason });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok || !data || typeof data !== 'object') {
    const providerMessage = data?.error?.description || data?.error?.reason || `http ${response.status}`;
    const providerCode = data?.error?.code || null;
    console.warn(`[RAZORPAY] ${method} ${pathname} failed:`, providerMessage, providerCode ? `(${providerCode})` : '');
    throw new RazorpayError('Payment provider rejected the request.', {
      statusCode: response.status === 401 ? 503 : 502,
      providerMessage,
      providerCode,
    });
  }

  return data;
};

/* --------------------------------- Plans --------------------------------- */

/**
 * Razorpay plans are created manually in the Razorpay dashboard (LIVE mode) and
 * mapped here by environment variable, e.g.
 *   RAZORPAY_MONTHLY_PLAN_ID=plan_xxx
 *   RAZORPAY_QUARTERLY_PLAN_ID=plan_yyy
 * The variable name is RAZORPAY_<PLAN_ID>_PLAN_ID with the internal plan id
 * upper-cased and non-alphanumerics replaced by "_" (half_yearly -> HALF_YEARLY).
 * This client deliberately has no "create plan" call.
 */
const planIdEnvName = (planId) => `RAZORPAY_${String(planId).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_PLAN_ID`;

const getConfiguredPlanId = (planId) => {
  const value = (process.env[planIdEnvName(planId)] || '').trim();
  return /^plan_[A-Za-z0-9]{6,}$/.test(value) ? value : null;
};

/** Default number of billing cycles a subscription runs for (about 10 years). */
const defaultTotalCount = (interval) => {
  const override = Number(process.env.RAZORPAY_SUBSCRIPTION_TOTAL_COUNT);
  if (Number.isFinite(override) && override > 0) {
    return override;
  }
  return { monthly: 120, quarterly: 40, half_yearly: 20, yearly: 10 }[interval] || 12;
};

const fetchPlan = async (razorpayPlanId) => request('GET', `/v1/plans/${encodeURIComponent(razorpayPlanId)}`);

/* ----------------------------- Subscriptions ----------------------------- */

const createSubscription = async ({ razorpayPlanId, totalCount, notes, customerNotify = 1 }) =>
  request('POST', '/v1/subscriptions', {
    plan_id: razorpayPlanId,
    total_count: totalCount,
    customer_notify: customerNotify,
    notes: notes || {},
  });

const fetchSubscription = async (subscriptionId) =>
  request('GET', `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);

const cancelSubscription = async (subscriptionId, { atCycleEnd = true } = {}) =>
  request('POST', `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    cancel_at_cycle_end: atCycleEnd ? 1 : 0,
  });

/* -------------------------------- Webhooks ------------------------------- */

/**
 * Verifies Razorpay's webhook signature: HMAC-SHA256 of the raw request body
 * with the webhook secret, compared to the `x-razorpay-signature` header.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const { webhookSecret } = getConfig();
  if (!webhookSecret || typeof signature !== 'string' || !signature) {
    return false;
  }
  const expected = createHmac('sha256', webhookSecret).update(rawBody || '', 'utf8').digest('hex');
  const provided = signature.trim().toLowerCase();
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
};

module.exports = {
  RazorpayError,
  isConfigured,
  isWebhookConfigured,
  getKeyId,
  planIdEnvName,
  getConfiguredPlanId,
  defaultTotalCount,
  fetchPlan,
  createSubscription,
  fetchSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  __testing: { getConfig, request },
};
