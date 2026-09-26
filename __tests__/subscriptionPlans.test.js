const fs = require('fs');
const os = require('os');
const path = require('path');

const authTokens = require('../server/authTokens');
const adminAuth = require('../server/adminAuth');
const plansModule = require('../server/subscriptionPlans');

const { handlers } = plansModule;
const list = handlers['GET /api/subscriptions/plans'];
const getOne = handlers['GET /api/subscriptions/plans/:id'];
const create = handlers['POST /api/subscriptions/plans'];
const update = handlers['PUT /api/subscriptions/plans/:id'];
const remove = handlers['DELETE /api/subscriptions/plans/:id'];

const JWT_SECRET = 'unit-test-secret-that-is-definitely-longer-than-32-chars';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';

let tmpDir;
let adminContext;
let userContext;
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

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plans-test-'));
  process.env.PLANS_FILE = path.join(tmpDir, 'plans.json');
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  plansModule.__testing.resetCache();
  adminAuth.__testing.attempts.clear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  const login = await adminAuth.adminLogin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, { headers: {} });
  adminContext = { headers: { authorization: `Bearer ${login.token}` } };
  const userToken = authTokens.generateToken({ id: '+917081002501', mobile: '+917081002501', loginMethod: 'mobile_otp' });
  userContext = { headers: { authorization: `Bearer ${userToken}` } };
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('admin login', () => {
  it('issues a role=admin token for the configured account', async () => {
    const result = await adminAuth.adminLogin({ email: ' Admin@Example.com ', password: ADMIN_PASSWORD }, { headers: {} });
    expect(result).toMatchObject({ success: true, token: expect.any(String), user: { id: 'admin', email: ADMIN_EMAIL, role: 'admin' } });
    expect(authTokens.verifyToken(result.token)).toMatchObject({ sub: 'admin', role: 'admin' });
  });

  it('rejects wrong credentials, missing fields and missing config', async () => {
    await expectRejection(adminAuth.adminLogin({ email: ADMIN_EMAIL, password: 'nope' }, { headers: {} }), 401, 'Invalid email or password');
    await expectRejection(adminAuth.adminLogin({ email: 'x@y.z', password: ADMIN_PASSWORD }, { headers: {} }), 401, 'Invalid email or password');
    await expectRejection(adminAuth.adminLogin({ email: ADMIN_EMAIL }, { headers: {} }), 400, 'Email and password are required');
    process.env.ADMIN_PASSWORD = '';
    await expectRejection(adminAuth.adminLogin({ email: ADMIN_EMAIL, password: 'x' }, { headers: {} }), 503);
  });

  it('rate limits repeated failures per IP', async () => {
    const ctx = { headers: { 'x-forwarded-for': '203.0.113.9' } };
    for (let i = 0; i < adminAuth.__testing.MAX_ATTEMPTS; i += 1) {
      await expectRejection(adminAuth.adminLogin({ email: ADMIN_EMAIL, password: 'wrong' }, ctx), 401);
    }
    await expectRejection(adminAuth.adminLogin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, ctx), 429);
    // A different IP is unaffected.
    await expect(adminAuth.adminLogin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, { headers: { 'x-forwarded-for': '203.0.113.10' } })).resolves.toMatchObject({ success: true });
  });

  it('mobile-login tokens carry role=user, so they are not admins', () => {
    expect(authTokens.verifyToken(userContext.headers.authorization.slice(7)).role).toBe('user');
    expect(() => authTokens.requireRole(userContext, 'admin')).toThrow('Admin access required');
  });
});

describe('GET /api/subscriptions/plans', () => {
  it('is public and seeds the default plans in the exact requested shape', async () => {
    const result = await list({}, anon);
    expect(result.success).toBe(true);
    expect(result.plans.map(({ id, name, amount, interval }) => ({ id, name, amount, interval }))).toEqual([
      { id: 'monthly', name: 'Monthly', amount: 591, interval: 'monthly' },
      { id: 'quarterly', name: 'Quarterly', amount: 1599, interval: 'quarterly' },
    ]);
    expect(fs.existsSync(process.env.PLANS_FILE)).toBe(true);
  });

  it('returns one plan by id and 404 for unknown ids', async () => {
    await expect(getOne({}, { ...anon, params: { id: 'monthly' } })).resolves.toMatchObject({ success: true, plan: { id: 'monthly', amount: 591 } });
    await expectRejection(getOne({}, { ...anon, params: { id: 'nope' } }), 404, 'Plan not found');
  });

  it('hides inactive plans from the public but shows them to admins', async () => {
    await update({ active: false }, { ...adminContext, params: { id: 'monthly' } });
    expect((await list({}, anon)).plans.map((p) => p.id)).toEqual(['quarterly']);
    expect((await list({}, userContext)).plans.map((p) => p.id)).toEqual(['quarterly']);
    expect((await list({}, adminContext)).plans.map((p) => p.id)).toEqual(['monthly', 'quarterly']);
    await expectRejection(getOne({}, { ...anon, params: { id: 'monthly' } }), 404);
  });
});

describe('admin-only plan mutations', () => {
  const body = { name: 'Yearly', amount: 4999, interval: 'yearly' };

  it('refuses anonymous and non-admin users', async () => {
    await expectRejection(create(body, anon), 401, 'Authorization token is required');
    await expectRejection(create(body, userContext), 403, 'Admin access required');
    await expectRejection(update({ amount: 1 }, { ...userContext, params: { id: 'monthly' } }), 403, 'Admin access required');
    await expectRejection(remove({}, { ...anon, params: { id: 'monthly' } }), 401);
    await expectRejection(remove({}, { ...userContext, params: { id: 'monthly' } }), 403);
    expect((await list({}, anon)).plans).toHaveLength(2);
  });

  it('creates, reads back, updates and deletes a plan, persisting to the file', async () => {
    const created = await create(body, adminContext);
    expect(created).toMatchObject({ success: true, plan: { id: 'yearly', name: 'Yearly', amount: 4999, interval: 'yearly', currency: 'INR', active: true } });

    plansModule.__testing.resetCache(); // force a re-read from disk
    expect((await list({}, anon)).plans.map((p) => p.id)).toEqual(['monthly', 'quarterly', 'yearly']);

    const updated = await update({ amount: 4499, description: 'Best value' }, { ...adminContext, params: { id: 'yearly' } });
    expect(updated.plan).toMatchObject({ id: 'yearly', name: 'Yearly', amount: 4499, description: 'Best value' });

    await expect(remove({}, { ...adminContext, params: { id: 'yearly' } })).resolves.toEqual({ success: true, message: 'Plan deleted', id: 'yearly' });
    plansModule.__testing.resetCache();
    expect((await list({}, anon)).plans.map((p) => p.id)).toEqual(['monthly', 'quarterly']);
    await expectRejection(remove({}, { ...adminContext, params: { id: 'yearly' } }), 404, 'Plan not found');
  });

  it('accepts an explicit id and rejects duplicates and id changes', async () => {
    await expect(create({ ...body, id: 'Annual-Plan' }, adminContext)).resolves.toMatchObject({ plan: { id: 'annual-plan' } });
    await expectRejection(create({ ...body, id: 'annual-plan' }, adminContext), 409, 'A plan with this id already exists');
    await expectRejection(create({ ...body, id: 'bad id!' }, adminContext), 400, 'Invalid plan');
    await expectRejection(update({ id: 'renamed' }, { ...adminContext, params: { id: 'annual-plan' } }), 400, 'Invalid plan');
  });

  it('validates plan fields', async () => {
    const error = await expectRejection(create({ name: '', amount: -5, interval: 'weekly' }, adminContext), 400, 'Invalid plan');
    expect(error.details.errors).toEqual([
      'name is required (1-80 characters)',
      'amount must be a positive number',
      'interval must be one of: monthly, quarterly, half_yearly, yearly',
    ]);
    await expectRejection(create('not-an-object', adminContext), 400, 'Plan body must be a JSON object');
    await expectRejection(update({}, { ...adminContext, params: { id: 'monthly' } }), 400, 'Invalid plan');
    await expectRejection(update({ active: 'yes' }, { ...adminContext, params: { id: 'monthly' } }), 400, 'Invalid plan');
    await expect(create({ name: 'Half', amount: '999.5', interval: 'HALF_YEARLY' }, adminContext)).resolves.toMatchObject({ plan: { id: 'half', amount: 999.5, interval: 'half_yearly' } });
  });
});
