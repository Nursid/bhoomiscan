/**
 * Razorpay subscriptions for the plans in subscriptionPlans.js.
 *
 *   POST /api/subscriptions/create   auth   { planId }  -> Razorpay subscription for Checkout
 *   GET  /api/subscriptions/my       auth               -> the caller's current subscription
 *   POST /api/subscriptions/cancel   auth   { cancelAtPeriodEnd }
 *   POST /api/webhooks/razorpay      Razorpay (signature-verified) -> source of truth for status
 *
 * "auth" = the existing backend JWT (authTokens.requireAuth); the user id is the
 * token subject (E.164 mobile for OTP logins). The client only ever sends the
 * internal planId. Amount, interval and currency come from the stored plan, and
 * the Razorpay plan_id comes from the stored plan or the environment mapping
 * (RAZORPAY_MONTHLY_PLAN_ID, RAZORPAY_QUARTERLY_PLAN_ID). Razorpay plans are
 * created manually in the Razorpay dashboard (LIVE), never by this backend.
 *
 * Storage: no database exists, so subscriptions live in a JSON file
 * (SUBSCRIPTIONS_FILE, default server/data/subscriptions.json) alongside the
 * ids of webhook events already processed (for idempotency).
 */

const fs = require('fs');
const path = require('path');
const authTokens = require('./authTokens');
const plans = require('./subscriptionPlans');
const razorpay = require('./razorpayClient');

const ACTIVE_STATUSES = ['authenticated', 'active'];
const OPEN_STATUSES = ['authenticated', 'active', 'pending', 'halted', 'paused'];
const CANCELLABLE_STATUSES = ['authenticated', 'active', 'pending', 'halted', 'paused'];
const MAX_PROCESSED_EVENTS = 2000;

const getStoreFile = () =>
  path.resolve(process.env.SUBSCRIPTIONS_FILE || path.join(__dirname, 'data', 'subscriptions.json'));

const apiError = (statusCode, message, details) =>
  Object.assign(new Error(message), { statusCode, success: false, ...(details ? { details } : {}) });

const now = () => new Date().toISOString();
const fromUnix = (seconds) => (typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000).toISOString() : null);

/* -------------------------------- Storage -------------------------------- */

let cache = null;

const emptyStore = () => ({ subscriptions: [], processedEvents: {} });

const loadStore = () => {
  if (cache) {
    return cache;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(getStoreFile(), 'utf8'));
    cache = {
      subscriptions: Array.isArray(parsed?.subscriptions) ? parsed.subscriptions : [],
      processedEvents: parsed?.processedEvents && typeof parsed.processedEvents === 'object' ? parsed.processedEvents : {},
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[SUBSCRIPTIONS] Could not read store, starting empty:', error.message);
    }
    cache = emptyStore();
  }
  return cache;
};

const saveStore = (store) => {
  const file = getStoreFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, file);
  cache = store;
};

const resetCache = () => {
  cache = null;
};

const findByUser = (userId) =>
  loadStore()
    .subscriptions.filter((item) => item.userId === userId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

const findById = (subscriptionId) => loadStore().subscriptions.find((item) => item.id === subscriptionId) || null;

const upsert = (record) => {
  const store = loadStore();
  const index = store.subscriptions.findIndex((item) => item.id === record.id);
  const subscriptions = [...store.subscriptions];
  if (index === -1) {
    subscriptions.push(record);
  } else {
    subscriptions[index] = record;
  }
  saveStore({ ...store, subscriptions });
  return record;
};

/* ------------------------------ Presentation ----------------------------- */

const hasAccess = (record) => {
  if (!record) {
    return false;
  }
  if (ACTIVE_STATUSES.includes(record.status)) {
    return true;
  }
  // Cancelled/halted/pending/paused subscriptions keep access until the paid period ends.
  if (record.currentPeriodEnd && !['created', 'expired'].includes(record.status)) {
    return Date.parse(record.currentPeriodEnd) > Date.now();
  }
  return false;
};

const publicSubscription = (record) => ({
  subscriptionId: record.id,
  planId: record.planId,
  planName: record.planName,
  status: record.status,
  hasAccess: hasAccess(record),
  currentPeriodStart: record.currentPeriodStart || null,
  currentPeriodEnd: record.currentPeriodEnd || null,
  nextChargeAt: record.nextChargeAt || null,
  cancelAtPeriodEnd: Boolean(record.cancelAtPeriodEnd),
  cancelledAt: record.cancelledAt || null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

/* --------------------------- Razorpay plan lookup ------------------------ */

/**
 * Returns the Razorpay LIVE plan_id for an internal plan. Sources, in order:
 *   1. `razorpayPlanId` stored on the plan (set by an admin through the plans API),
 *   2. the environment mapping RAZORPAY_<PLAN_ID>_PLAN_ID.
 * Razorpay plans are never created here; an unmapped plan is a configuration error.
 */
const resolveRazorpayPlanId = (plan) => {
  if (plan.razorpayPlanId) {
    return plan.razorpayPlanId;
  }
  const fromEnv = razorpay.getConfiguredPlanId(plan.id);
  if (fromEnv) {
    return fromEnv;
  }
  throw apiError(503, `Razorpay plan is not configured for plan "${plan.id}" (set ${razorpay.planIdEnvName(plan.id)}).`);
};

/** Plans that have neither a stored nor an environment Razorpay plan id (for the startup check). */
const unmappedPlanIds = () =>
  plans.__testing
    .loadPlans()
    .filter((plan) => plan.active !== false && !plan.razorpayPlanId && !razorpay.getConfiguredPlanId(plan.id))
    .map((plan) => plan.id);

const withRazorpay = async (operation, failureMessage) => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof razorpay.RazorpayError) {
      throw apiError(error.statusCode, error.statusCode === 503 ? error.message : failureMessage, {
        provider: 'razorpay',
        reason: error.providerMessage,
      });
    }
    throw error;
  }
};

/* -------------------------------- Handlers ------------------------------- */

const createSubscription = async (body, context) => {
  const claims = authTokens.requireAuth(context);
  const userId = String(claims.sub);

  if (!razorpay.isConfigured()) {
    throw apiError(503, 'Payments are not configured on the server (Razorpay).');
  }

  const planId = typeof body?.planId === 'string' ? body.planId.trim().toLowerCase() : '';
  if (!planId) {
    throw apiError(400, 'planId is required');
  }
  const plan = plans.findPlanById(planId);
  if (!plan || plan.active === false) {
    throw apiError(404, 'Plan not found');
  }

  const existing = findByUser(userId);
  if (existing && OPEN_STATUSES.includes(existing.status) && !existing.cancelAtPeriodEnd) {
    throw apiError(409, 'You already have an active subscription', {
      subscription: publicSubscription(existing),
    });
  }

  const razorpayPlanId = resolveRazorpayPlanId(plan);
  const created = await withRazorpay(
    () =>
      razorpay.createSubscription({
        razorpayPlanId,
        totalCount: razorpay.defaultTotalCount(plan.interval),
        notes: { userId, planId: plan.id },
      }),
    'Unable to create the subscription',
  );
  if (!created?.id) {
    throw apiError(502, 'Payment provider did not return a subscription id');
  }

  const record = upsert({
    id: created.id,
    userId,
    planId: plan.id,
    planName: plan.name,
    razorpayPlanId,
    amount: plan.amount,
    currency: plan.currency || 'INR',
    interval: plan.interval,
    status: created.status || 'created',
    currentPeriodStart: fromUnix(created.current_start),
    currentPeriodEnd: fromUnix(created.current_end),
    nextChargeAt: fromUnix(created.charge_at),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    lastEventAt: null,
    lastPaymentId: null,
    createdAt: now(),
    updatedAt: now(),
  });
  console.log(`[SUBSCRIPTIONS] ${record.id} created for user ${userId} on plan "${plan.id}"`);

  return {
    success: true,
    subscriptionId: record.id,
    razorpayKeyId: razorpay.getKeyId(),
    planId: plan.id,
    status: record.status,
  };
};

const mySubscription = async (body, context) => {
  const claims = authTokens.requireAuth(context);
  const record = findByUser(String(claims.sub));
  return { success: true, subscription: record ? publicSubscription(record) : null };
};

const cancelSubscription = async (body, context) => {
  const claims = authTokens.requireAuth(context);
  const userId = String(claims.sub);
  const atPeriodEnd = body?.cancelAtPeriodEnd === undefined ? true : body.cancelAtPeriodEnd === true;

  const record = findByUser(userId);
  if (!record || !CANCELLABLE_STATUSES.includes(record.status)) {
    throw apiError(404, 'No active subscription to cancel');
  }
  if (atPeriodEnd && record.cancelAtPeriodEnd) {
    return {
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      subscription: publicSubscription(record),
    };
  }

  const result = await withRazorpay(
    () => razorpay.cancelSubscription(record.id, { atCycleEnd: atPeriodEnd }),
    'Unable to cancel the subscription',
  );

  const updated = upsert({
    ...record,
    status: atPeriodEnd ? record.status : result?.status || 'cancelled',
    cancelAtPeriodEnd: atPeriodEnd,
    cancelledAt: atPeriodEnd ? record.cancelledAt || null : now(),
    currentPeriodEnd: atPeriodEnd ? record.currentPeriodEnd : fromUnix(result?.current_end) || record.currentPeriodEnd,
    updatedAt: now(),
  });
  console.log(`[SUBSCRIPTIONS] ${record.id} cancel requested by ${userId} (at period end: ${atPeriodEnd})`);

  return {
    success: true,
    message: atPeriodEnd
      ? 'Subscription will be cancelled at the end of the current billing period'
      : 'Subscription cancelled',
    subscription: publicSubscription(updated),
  };
};

/* -------------------------------- Webhook -------------------------------- */

const EVENT_STATUS = {
  'subscription.authenticated': 'authenticated',
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.pending': 'pending',
  'subscription.halted': 'halted',
  'subscription.cancelled': 'cancelled',
  'subscription.completed': 'completed',
  'subscription.paused': 'paused',
  'subscription.resumed': 'active',
  'subscription.expired': 'expired',
  'subscription.updated': null, // keep entity status
};

const razorpayWebhook = async (body, context) => {
  if (!razorpay.isWebhookConfigured()) {
    throw apiError(503, 'Razorpay webhook secret is not configured on the server.');
  }

  const signature = context?.headers?.['x-razorpay-signature'];
  if (!razorpay.verifyWebhookSignature(context?.rawBody || '', signature)) {
    console.warn('[SUBSCRIPTIONS] Webhook rejected: invalid signature');
    throw apiError(401, 'Invalid webhook signature');
  }

  const event = typeof body?.event === 'string' ? body.event : '';
  const eventId = String(context?.headers?.['x-razorpay-event-id'] || '').trim();
  const entity = body?.payload?.subscription?.entity;
  const payment = body?.payload?.payment?.entity;

  if (!event.startsWith('subscription.')) {
    return { success: true, ignored: true, reason: 'not a subscription event' };
  }
  if (!entity?.id) {
    return { success: true, ignored: true, reason: 'no subscription entity in payload' };
  }

  const store = loadStore();

  // Idempotency 1: Razorpay retries deliver the same event id.
  if (eventId && store.processedEvents[eventId]) {
    return { success: true, duplicate: true };
  }

  const record = findById(entity.id);
  if (!record) {
    console.warn(`[SUBSCRIPTIONS] Webhook for unknown subscription ${entity.id} (${event}) ignored`);
    markProcessed(store, eventId);
    return { success: true, ignored: true, reason: 'unknown subscription' };
  }

  // Idempotency 2: never let an older event overwrite a newer state.
  const eventAt = fromUnix(body?.created_at) || now();
  if (record.lastEventAt && Date.parse(eventAt) < Date.parse(record.lastEventAt)) {
    markProcessed(store, eventId);
    return { success: true, ignored: true, reason: 'stale event' };
  }

  const mappedStatus = EVENT_STATUS[event];
  const status = entity.status || mappedStatus || record.status;
  const updated = {
    ...record,
    status,
    currentPeriodStart: fromUnix(entity.current_start) || record.currentPeriodStart,
    currentPeriodEnd: fromUnix(entity.current_end) || record.currentPeriodEnd,
    nextChargeAt: fromUnix(entity.charge_at) || (status === 'active' ? record.nextChargeAt : null),
    cancelAtPeriodEnd: status === 'cancelled' ? false : Boolean(record.cancelAtPeriodEnd),
    cancelledAt: status === 'cancelled' ? record.cancelledAt || fromUnix(entity.ended_at) || eventAt : record.cancelledAt,
    lastPaymentId: event === 'subscription.charged' && payment?.id ? payment.id : record.lastPaymentId,
    paidCount: typeof entity.paid_count === 'number' ? entity.paid_count : record.paidCount,
    lastEvent: event,
    lastEventAt: eventAt,
    updatedAt: now(),
  };

  const index = store.subscriptions.findIndex((item) => item.id === record.id);
  const subscriptions = [...store.subscriptions];
  subscriptions[index] = updated;
  markProcessed({ ...store, subscriptions }, eventId);

  console.log(`[SUBSCRIPTIONS] ${record.id}: ${event} -> ${status}`);
  return { success: true, subscriptionId: record.id, status };
};

const markProcessed = (store, eventId) => {
  const processedEvents = { ...store.processedEvents };
  if (eventId) {
    processedEvents[eventId] = now();
    const ids = Object.keys(processedEvents);
    if (ids.length > MAX_PROCESSED_EVENTS) {
      ids
        .sort((a, b) => processedEvents[a].localeCompare(processedEvents[b]))
        .slice(0, ids.length - MAX_PROCESSED_EVENTS)
        .forEach((id) => delete processedEvents[id]);
    }
  }
  saveStore({ ...store, processedEvents });
};

const handlers = {
  'POST /api/subscriptions/create': createSubscription,
  'GET /api/subscriptions/my': mySubscription,
  'POST /api/subscriptions/cancel': cancelSubscription,
  'POST /api/webhooks/razorpay': razorpayWebhook,
};

module.exports = {
  handlers,
  hasAccess,
  resolveRazorpayPlanId,
  unmappedPlanIds,
  __testing: { loadStore, saveStore, resetCache, findByUser, findById, getStoreFile },
};
