const fs = require('fs');
const os = require('os');
const path = require('path');
const { Buffer } = require('buffer');
const { createHmac } = require('crypto');

const authTokens = require('../server/authTokens');
const plansModule = require('../server/subscriptionPlans');
const razorpay = require('../server/razorpayClient');
const subs = require('../server/subscriptions');

const create = subs.handlers['POST /api/subscriptions/create'];
const my = subs.handlers['GET /api/subscriptions/my'];
const cancel = subs.handlers['POST /api/subscriptions/cancel'];
const webhook = subs.handlers['POST /api/webhooks/razorpay'];

const JWT_SECRET = 'unit-test-secret-that-is-definitely-longer-than-32-chars';
const KEY_ID = 'rzp_test_ABC123';
const KEY_SECRET = 'rzp-secret';
const WEBHOOK_SECRET = 'whsec-unit-test';
const USER = '+917081002501';

let tmpDir;
let userContext;
let otherContext;
let razorpayCalls;
const anon = { headers: {} };

const expectRejection = async (promise, statusCode, message) => {
  let caught;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeDefined();
  expect(caught.statusCode).toBe(statusCode);
  if (message) {
    expect(caught.message).toBe(message);
  }
  expect(caught.success).toBe(false);
  return caught;
};

const subscriptionEntity = (overrides = {}) => ({
  id: 'sub_TEST123',
  plan_id: 'plan_TESTPLAN',
  status: 'created',
  current_start: null,
  current_end: null,
  charge_at: 1800000000,
  paid_count: 0,
  ...overrides,
});

const mockRazorpay = (responder) => {
  global.fetch = jest.fn(async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    razorpayCalls.push({ url, method: options.method, headers: options.headers, body });
    const result = await responder({ url, method: options.method, body });
    if (result instanceof Error) {
      throw result;
    }
    return { ok: result.ok !== false, status: result.status || 200, text: async () => JSON.stringify(result.body) };
  });
};

const defaultResponder = ({ url, method }) => {
  if (url.endsWith('/v1/subscriptions') && method === 'POST') {
    return { body: subscriptionEntity({ status: 'created', short_url: 'https://rzp.io/i/x' }) };
  }
  if (url.endsWith('/cancel')) {
    return { body: subscriptionEntity({ status: 'active' }) };
  }
  return { ok: false, status: 404, body: { error: { description: 'not found' } } };
};

const signedWebhook = (payloadObject, { eventId = `evt_${Math.random().toString(36).slice(2)}`, secret = WEBHOOK_SECRET } = {}) => {
  const rawBody = JSON.stringify(payloadObject);
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
  return { body: payloadObject, context: { headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': eventId }, rawBody } };
};

const event = (name, entityOverrides = {}, extra = {}) => ({
  event: name,
  created_at: extra.createdAt || 1800000100,
  payload: {
    subscription: { entity: subscriptionEntity(entityOverrides) },
    ...(extra.payment ? { payment: { entity: extra.payment } } : {}),
  },
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subs-test-'));
  process.env.PLANS_FILE = path.join(tmpDir, 'plans.json');
  process.env.SUBSCRIPTIONS_FILE = path.join(tmpDir, 'subscriptions.json');
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.RAZORPAY_KEY_ID = KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.RAZORPAY_MONTHLY_PLAN_ID = 'plan_TESTPLAN';
  process.env.RAZORPAY_QUARTERLY_PLAN_ID = 'plan_QUARTERLY1';
  delete process.env.RAZORPAY_SUBSCRIPTION_TOTAL_COUNT;
  plansModule.__testing.resetCache();
  subs.__testing.resetCache();
  razorpayCalls = [];
  mockRazorpay(defaultResponder);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  const token = authTokens.generateToken({ id: USER, mobile: USER, loginMethod: 'mobile_otp' });
  userContext = { headers: { authorization: `Bearer ${token}` } };
  const other = authTokens.generateToken({ id: '+919999999999', mobile: '+919999999999', loginMethod: 'mobile_otp' });
  otherContext = { headers: { authorization: `Bearer ${other}` } };
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

afterAll(() => {
  delete global.fetch;
});

describe('POST /api/subscriptions/create', () => {
  it('creates a Razorpay subscription for the LIVE plan id mapped in env, using only server-side plan data', async () => {
    const result = await create({ planId: 'monthly', amount: 1, interval: 'yearly', currency: 'USD', razorpayPlanId: 'plan_EVIL' }, userContext);

    expect(result).toEqual({ success: true, subscriptionId: 'sub_TEST123', razorpayKeyId: KEY_ID, planId: 'monthly', status: 'created' });

    // exactly one Razorpay call: the subscription, with the env-mapped plan id; never an order or a plan
    expect(razorpayCalls).toHaveLength(1);
    expect(razorpayCalls[0].url).toBe('https://api.razorpay.com/v1/subscriptions');
    expect(razorpayCalls[0].headers.authorization).toBe(`Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`);
    expect(razorpayCalls[0].body).toEqual({ plan_id: 'plan_TESTPLAN', total_count: 120, customer_notify: 1, notes: { userId: USER, planId: 'monthly' } });
    expect(razorpayCalls.some((c) => c.url.includes('/v1/orders') || c.url.endsWith('/v1/plans'))).toBe(false);
  });

  it('never calls the Razorpay create-plan API, even when a plan is unmapped', async () => {
    delete process.env.RAZORPAY_MONTHLY_PLAN_ID;
    const error = await expectRejection(create({ planId: 'monthly' }, userContext), 503);
    expect(error.message).toBe('Razorpay plan is not configured for plan "monthly" (set RAZORPAY_MONTHLY_PLAN_ID).');
    expect(razorpayCalls).toHaveLength(0);
    expect(typeof razorpay.createPlan).toBe('undefined');
    expect(subs.unmappedPlanIds()).toEqual(['monthly']);
  });

  it('prefers a razorpayPlanId stored on the plan over the env mapping', async () => {
    plansModule.setRazorpayPlanId('monthly', 'plan_STOREDONE');
    await create({ planId: 'monthly' }, userContext);
    expect(razorpayCalls[0].body.plan_id).toBe('plan_STOREDONE');
  });

  it('maps quarterly to its own LIVE plan id with a 40-cycle count', async () => {
    await create({ planId: 'quarterly' }, userContext);
    expect(razorpayCalls).toHaveLength(1);
    expect(razorpayCalls[0].body).toMatchObject({ plan_id: 'plan_QUARTERLY1', total_count: 40 });
    expect(razorpay.planIdEnvName('quarterly')).toBe('RAZORPAY_QUARTERLY_PLAN_ID');
    expect(razorpay.planIdEnvName('half_yearly')).toBe('RAZORPAY_HALF_YEARLY_PLAN_ID');
    expect(razorpay.getConfiguredPlanId('quarterly')).toBe('plan_QUARTERLY1');
    process.env.RAZORPAY_QUARTERLY_PLAN_ID = 'not-a-plan-id';
    expect(razorpay.getConfiguredPlanId('quarterly')).toBeNull();
  });

  it('requires auth, a known active plan, and Razorpay configuration', async () => {
    await expectRejection(create({ planId: 'monthly' }, anon), 401, 'Authorization token is required');
    await expectRejection(create({}, userContext), 400, 'planId is required');
    await expectRejection(create({ planId: 'nope' }, userContext), 404, 'Plan not found');
    process.env.RAZORPAY_KEY_SECRET = '';
    await expectRejection(create({ planId: 'monthly' }, userContext), 503, 'Payments are not configured on the server (Razorpay).');
    expect(razorpayCalls).toHaveLength(0);
  });

  it('refuses a second subscription while one is open, but allows it after an abandoned checkout', async () => {
    await create({ planId: 'monthly' }, userContext);
    // still "created" (checkout never completed) -> allowed to try again
    await expect(create({ planId: 'monthly' }, userContext)).resolves.toMatchObject({ success: true });

    const { body, context } = signedWebhook(event('subscription.activated', { status: 'active', current_start: 1800000000, current_end: 1802592000 }));
    await webhook(body, context);
    const error = await expectRejection(create({ planId: 'quarterly' }, userContext), 409, 'You already have an active subscription');
    expect(error.details.subscription.status).toBe('active');
  });

  it('maps provider failures to 502 without leaking credentials', async () => {
    mockRazorpay(() => ({ ok: false, status: 400, body: { error: { code: 'BAD_REQUEST_ERROR', description: 'plan does not exist' } } }));
    const error = await expectRejection(create({ planId: 'monthly' }, userContext), 502, 'Unable to create the subscription');
    expect(JSON.stringify(error.details)).not.toContain(KEY_SECRET);
    mockRazorpay(() => Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expectRejection(create({ planId: 'monthly' }, userContext), 502);
  });
});

describe('GET /api/subscriptions/my', () => {
  it('returns null without a subscription and the current one after creation', async () => {
    await expect(my({}, userContext)).resolves.toEqual({ success: true, subscription: null });
    await create({ planId: 'monthly' }, userContext);
    const result = await my({}, userContext);
    expect(result.subscription).toMatchObject({
      subscriptionId: 'sub_TEST123',
      planId: 'monthly',
      planName: 'Monthly',
      status: 'created',
      hasAccess: false,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
    // another user sees nothing
    await expect(my({}, otherContext)).resolves.toEqual({ success: true, subscription: null });
    await expectRejection(my({}, anon), 401);
  });
});

describe('POST /api/webhooks/razorpay', () => {
  beforeEach(async () => {
    await create({ planId: 'monthly' }, userContext);
  });

  it('rejects unsigned, badly signed, and unconfigured webhooks', async () => {
    const payload = event('subscription.activated', { status: 'active' });
    await expectRejection(webhook(payload, { headers: {}, rawBody: JSON.stringify(payload) }), 401, 'Invalid webhook signature');
    const forged = signedWebhook(payload, { secret: 'wrong-secret' });
    await expectRejection(webhook(forged.body, forged.context), 401, 'Invalid webhook signature');
    // tampered body after signing
    const ok = signedWebhook(payload);
    await expectRejection(webhook({ ...ok.body, event: 'subscription.cancelled' }, { ...ok.context, rawBody: '{"event":"subscription.cancelled"}' }), 401);
    process.env.RAZORPAY_WEBHOOK_SECRET = '';
    await expectRejection(webhook(ok.body, ok.context), 503);
    expect((await my({}, userContext)).subscription.status).toBe('created');
  });

  it('applies the subscription lifecycle and billing periods from signed events', async () => {
    let w = signedWebhook(event('subscription.authenticated', { status: 'authenticated' }, { createdAt: 1800000100 }));
    await webhook(w.body, w.context);
    expect((await my({}, userContext)).subscription).toMatchObject({ status: 'authenticated', hasAccess: true });

    w = signedWebhook(event('subscription.charged', { status: 'active', current_start: 1800000000, current_end: 1802592000, paid_count: 1 }, { createdAt: 1800000200, payment: { id: 'pay_1', amount: 59100 } }));
    await webhook(w.body, w.context);
    let current = (await my({}, userContext)).subscription;
    expect(current).toMatchObject({ status: 'active', hasAccess: true, currentPeriodStart: '2027-01-15T08:00:00.000Z', currentPeriodEnd: '2027-02-14T08:00:00.000Z' });
    expect(subs.__testing.findById('sub_TEST123').lastPaymentId).toBe('pay_1');

    w = signedWebhook(event('subscription.halted', { status: 'halted', current_start: 1800000000, current_end: 1802592000 }, { createdAt: 1800000300 }));
    await webhook(w.body, w.context);
    expect((await my({}, userContext)).subscription.status).toBe('halted');

    w = signedWebhook(event('subscription.cancelled', { status: 'cancelled', ended_at: 1802592000 }, { createdAt: 1800000400 }));
    await webhook(w.body, w.context);
    current = (await my({}, userContext)).subscription;
    expect(current).toMatchObject({ status: 'cancelled', cancelAtPeriodEnd: false, cancelledAt: '2027-02-14T08:00:00.000Z' });

    w = signedWebhook(event('subscription.completed', { status: 'completed' }, { createdAt: 1800000500 }));
    await webhook(w.body, w.context);
    expect((await my({}, userContext)).subscription.status).toBe('completed');
  });

  it('is idempotent: duplicate event ids and stale events do not change state', async () => {
    const activated = signedWebhook(event('subscription.activated', { status: 'active', current_end: 1802592000 }, { createdAt: 1800000200 }), { eventId: 'evt_A' });
    await expect(webhook(activated.body, activated.context)).resolves.toMatchObject({ success: true, status: 'active' });
    await expect(webhook(activated.body, activated.context)).resolves.toEqual({ success: true, duplicate: true });

    // an older "pending" event delivered late must not downgrade the active subscription
    const stale = signedWebhook(event('subscription.pending', { status: 'pending' }, { createdAt: 1800000100 }), { eventId: 'evt_B' });
    await expect(webhook(stale.body, stale.context)).resolves.toMatchObject({ ignored: true, reason: 'stale event' });
    expect((await my({}, userContext)).subscription.status).toBe('active');

    // survives a restart (re-read from disk)
    subs.__testing.resetCache();
    await expect(webhook(activated.body, activated.context)).resolves.toEqual({ success: true, duplicate: true });
  });

  it('ignores unknown subscriptions and non-subscription events without failing', async () => {
    const unknown = signedWebhook(event('subscription.activated', { id: 'sub_UNKNOWN', status: 'active' }));
    await expect(webhook(unknown.body, unknown.context)).resolves.toMatchObject({ success: true, ignored: true });
    const payment = signedWebhook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x' } } } });
    await expect(webhook(payment.body, payment.context)).resolves.toMatchObject({ success: true, ignored: true });
  });
});

describe('POST /api/subscriptions/cancel', () => {
  beforeEach(async () => {
    await create({ planId: 'monthly' }, userContext);
    const w = signedWebhook(event('subscription.activated', { status: 'active', current_start: 1800000000, current_end: 1802592000 }));
    await webhook(w.body, w.context);
  });

  it('cancels at period end by default, keeps access until then, and is idempotent', async () => {
    const result = await cancel({}, userContext);
    expect(result).toMatchObject({ success: true, message: 'Subscription will be cancelled at the end of the current billing period' });
    expect(razorpayCalls.at(-1)).toMatchObject({ url: 'https://api.razorpay.com/v1/subscriptions/sub_TEST123/cancel', body: { cancel_at_cycle_end: 1 } });
    expect(result.subscription).toMatchObject({ status: 'active', cancelAtPeriodEnd: true, hasAccess: true, currentPeriodEnd: '2027-02-14T08:00:00.000Z' });

    const calls = razorpayCalls.length;
    await expect(cancel({ cancelAtPeriodEnd: true }, userContext)).resolves.toMatchObject({ success: true });
    expect(razorpayCalls).toHaveLength(calls); // no second provider call

    // Razorpay later confirms the cancellation at cycle end
    const w = signedWebhook(event('subscription.cancelled', { status: 'cancelled', current_end: 1802592000 }, { createdAt: 1800000900 }));
    await webhook(w.body, w.context);
    expect((await my({}, userContext)).subscription).toMatchObject({ status: 'cancelled', cancelAtPeriodEnd: false });
  });

  it('cancels immediately when asked', async () => {
    mockRazorpay(({ url, method }) => (url.endsWith('/cancel') ? { body: subscriptionEntity({ status: 'cancelled', current_end: 1800000500 }) } : defaultResponder({ url, method })));
    const result = await cancel({ cancelAtPeriodEnd: false }, userContext);
    expect(result).toMatchObject({ success: true, message: 'Subscription cancelled' });
    expect(razorpayCalls.at(-1).body).toEqual({ cancel_at_cycle_end: 0 });
    expect(result.subscription).toMatchObject({ status: 'cancelled', cancelAtPeriodEnd: false });
    expect(result.subscription.cancelledAt).toEqual(expect.any(String));
  });

  it('requires auth and an open subscription', async () => {
    await expectRejection(cancel({}, anon), 401);
    await expectRejection(cancel({}, otherContext), 404, 'No active subscription to cancel');
    mockRazorpay(() => ({ ok: false, status: 400, body: { error: { description: 'already cancelled' } } }));
    await expectRejection(cancel({}, userContext), 502, 'Unable to cancel the subscription');
  });
});

describe('razorpayClient.verifyWebhookSignature', () => {
  it('matches only the exact raw body and secret', () => {
    const raw = '{"event":"subscription.activated"}';
    const sig = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    expect(razorpay.verifyWebhookSignature(raw, sig)).toBe(true);
    expect(razorpay.verifyWebhookSignature(raw, sig.toUpperCase())).toBe(true);
    expect(razorpay.verifyWebhookSignature(`${raw} `, sig)).toBe(false);
    expect(razorpay.verifyWebhookSignature(raw, 'abc')).toBe(false);
    expect(razorpay.verifyWebhookSignature(raw, undefined)).toBe(false);
  });
});
