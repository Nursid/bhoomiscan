/**
 * Subscription plans API.
 *
 *   GET    /api/subscriptions/plans        public   list plans
 *   GET    /api/subscriptions/plans/:id    public   one plan
 *   POST   /api/subscriptions/plans        admin    create
 *   PUT    /api/subscriptions/plans/:id    admin    update (partial)
 *   DELETE /api/subscriptions/plans/:id    admin    delete
 *
 * "admin" means a Bearer token issued by POST /api/auth/admin-login (role=admin).
 *
 * Storage: this backend has no database, so plans live in a JSON file
 * (PLANS_FILE, default server/data/plans.json) that is seeded with the default
 * plans on first use and rewritten atomically on every change.
 */

const fs = require('fs');
const path = require('path');
const authTokens = require('./authTokens');

const DEFAULT_PLANS = [
  { id: 'monthly', name: 'Monthly', amount: 591, interval: 'monthly' },
  { id: 'quarterly', name: 'Quarterly', amount: 1599, interval: 'quarterly' },
];
const INTERVALS = ['monthly', 'quarterly', 'half_yearly', 'yearly'];
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

const getPlansFile = () => path.resolve(process.env.PLANS_FILE || path.join(__dirname, 'data', 'plans.json'));

const apiError = (statusCode, message, details) =>
  Object.assign(new Error(message), { statusCode, success: false, ...(details ? { details } : {}) });

/* -------------------------------- Storage -------------------------------- */

let cache = null;

const now = () => new Date().toISOString();

const seedPlans = () =>
  DEFAULT_PLANS.map((plan) => ({ ...plan, currency: 'INR', active: true, createdAt: now(), updatedAt: now() }));

const loadPlans = () => {
  if (cache) {
    return cache;
  }
  const file = getPlansFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache = Array.isArray(parsed?.plans) ? parsed.plans : [];
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[PLANS] Could not read plans file, starting from defaults:', error.message);
    }
    cache = seedPlans();
    savePlans(cache);
  }
  return cache;
};

const savePlans = (plans) => {
  const file = getPlansFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ plans }, null, 2));
  fs.renameSync(tmp, file);
  cache = plans;
};

/** Test helper: forget the in-memory copy so the next call re-reads the file. */
const resetCache = () => {
  cache = null;
};

/* ------------------------------- Validation ------------------------------ */

const publicPlan = (plan) => ({
  id: plan.id,
  name: plan.name,
  amount: plan.amount,
  currency: plan.currency || 'INR',
  interval: plan.interval,
  ...(plan.description ? { description: plan.description } : {}),
  ...(plan.razorpayPlanId ? { razorpayPlanId: plan.razorpayPlanId } : {}),
  active: plan.active !== false,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

const validatePlanInput = (input, { partial = false } = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw apiError(400, 'Plan body must be a JSON object');
  }
  const errors = [];
  const out = {};

  if (!partial || input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 80) {
      errors.push('name is required (1-80 characters)');
    } else {
      out.name = name;
    }
  }

  if (!partial || input.amount !== undefined) {
    const amount = typeof input.amount === 'string' ? Number(input.amount) : input.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      errors.push('amount must be a positive number');
    } else {
      out.amount = Math.round(amount * 100) / 100;
    }
  }

  if (!partial || input.interval !== undefined) {
    const interval = typeof input.interval === 'string' ? input.interval.trim().toLowerCase() : '';
    if (!INTERVALS.includes(interval)) {
      errors.push(`interval must be one of: ${INTERVALS.join(', ')}`);
    } else {
      out.interval = interval;
    }
  }

  if (input.currency !== undefined) {
    const currency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : '';
    if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push('currency must be a 3-letter code');
    } else {
      out.currency = currency;
    }
  }

  if (input.description !== undefined) {
    if (input.description !== null && typeof input.description !== 'string') {
      errors.push('description must be a string');
    } else {
      out.description = input.description ? String(input.description).trim().slice(0, 500) : '';
    }
  }

  if (input.razorpayPlanId !== undefined) {
    const razorpayPlanId = input.razorpayPlanId === null ? '' : String(input.razorpayPlanId).trim();
    if (razorpayPlanId && !/^plan_[A-Za-z0-9]{6,}$/.test(razorpayPlanId)) {
      errors.push('razorpayPlanId must look like plan_XXXXXXXX');
    } else {
      out.razorpayPlanId = razorpayPlanId;
    }
  }

  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') {
      errors.push('active must be true or false');
    } else {
      out.active = input.active;
    }
  }

  if (errors.length > 0) {
    throw apiError(400, 'Invalid plan', { errors });
  }
  return out;
};

const normalizeId = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/* -------------------------------- Handlers ------------------------------- */

const requireAdmin = (context) => authTokens.requireRole(context, 'admin');

const listPlans = async (body, context) => {
  const isAdmin = (() => {
    try {
      requireAdmin(context);
      return true;
    } catch {
      return false;
    }
  })();
  // Admins see inactive plans too; everyone else only active ones.
  const plans = loadPlans().filter((plan) => isAdmin || plan.active !== false);
  return { success: true, plans: plans.map(publicPlan) };
};

const getPlan = async (body, context) => {
  const id = normalizeId(context?.params?.id);
  const plan = loadPlans().find((item) => item.id === id && item.active !== false);
  if (!plan) {
    throw apiError(404, 'Plan not found');
  }
  return { success: true, plan: publicPlan(plan) };
};

const createPlan = async (body, context) => {
  const admin = requireAdmin(context);
  const fields = validatePlanInput(body);
  const id = body.id !== undefined ? normalizeId(body.id) : slugify(fields.name);
  if (!ID_PATTERN.test(id)) {
    throw apiError(400, 'Invalid plan', { errors: ['id must be 1-40 chars: lowercase letters, digits, - or _'] });
  }

  const plans = loadPlans();
  if (plans.some((plan) => plan.id === id)) {
    throw apiError(409, 'A plan with this id already exists');
  }

  const plan = {
    id,
    currency: 'INR',
    active: true,
    description: '',
    ...fields,
    createdAt: now(),
    updatedAt: now(),
    createdBy: admin.sub,
  };
  savePlans([...plans, plan]);
  console.log(`[PLANS] Plan "${id}" created by ${admin.sub}`);
  return { success: true, plan: publicPlan(plan) };
};

const updatePlan = async (body, context) => {
  const admin = requireAdmin(context);
  const id = normalizeId(context?.params?.id);
  const plans = loadPlans();
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) {
    throw apiError(404, 'Plan not found');
  }
  if (body?.id !== undefined && normalizeId(body.id) !== id) {
    throw apiError(400, 'Invalid plan', { errors: ['id cannot be changed'] });
  }

  const fields = validatePlanInput(body, { partial: true });
  if (Object.keys(fields).length === 0) {
    throw apiError(400, 'Invalid plan', { errors: ['no updatable fields provided'] });
  }

  const updated = { ...plans[index], ...fields, updatedAt: now(), updatedBy: admin.sub };
  const next = [...plans];
  next[index] = updated;
  savePlans(next);
  console.log(`[PLANS] Plan "${id}" updated by ${admin.sub}`);
  return { success: true, plan: publicPlan(updated) };
};

const deletePlan = async (body, context) => {
  const admin = requireAdmin(context);
  const id = normalizeId(context?.params?.id);
  const plans = loadPlans();
  if (!plans.some((plan) => plan.id === id)) {
    throw apiError(404, 'Plan not found');
  }
  savePlans(plans.filter((plan) => plan.id !== id));
  console.log(`[PLANS] Plan "${id}" deleted by ${admin.sub}`);
  return { success: true, message: 'Plan deleted', id };
};

const handlers = {
  'GET /api/subscriptions/plans': listPlans,
  'GET /api/subscriptions/plans/:id': getPlan,
  'POST /api/subscriptions/plans': createPlan,
  'PUT /api/subscriptions/plans/:id': updatePlan,
  'DELETE /api/subscriptions/plans/:id': deletePlan,
};

/** Read helpers for other modules (subscriptions). */
const findPlanById = (id) => loadPlans().find((plan) => plan.id === normalizeId(id)) || null;

const setRazorpayPlanId = (id, razorpayPlanId) => {
  const plansList = loadPlans();
  const index = plansList.findIndex((plan) => plan.id === normalizeId(id));
  if (index === -1) {
    throw apiError(404, 'Plan not found');
  }
  const next = [...plansList];
  next[index] = { ...next[index], razorpayPlanId, updatedAt: now() };
  savePlans(next);
  return next[index];
};

module.exports = {
  handlers,
  DEFAULT_PLANS,
  INTERVALS,
  findPlanById,
  setRazorpayPlanId,
  __testing: { loadPlans, savePlans, resetCache, validatePlanInput, getPlansFile },
};
