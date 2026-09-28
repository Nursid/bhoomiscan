# Subscription Plans Flow (Razorpay LIVE)

This document describes how subscription plans work end to end: what the backend
already does, how Razorpay fits in, and the step-by-step plan for the mobile app.

Status at the time of writing:

| Part | Status |
|---|---|
| Backend plans API (public GET, admin CRUD) | Done |
| Backend subscription APIs (create / my / cancel) | Done |
| Razorpay webhook with signature verification | Done, needs `RAZORPAY_WEBHOOK_SECRET` |
| Razorpay LIVE plans mapped by env | Done (`monthly`, `quarterly`) |
| Mobile app: login token, plan screen, Checkout, status | **Not started** (steps below) |

---

## 1. Big picture

```
MOBILE APP                     BACKEND (server/kycServer.js)              RAZORPAY (LIVE)
----------                     -----------------------------              ---------------
Mobile OTP login  ──────────▶  POST /api/auth/mobile-verify
                  ◀──────────  { token (JWT), user }

GET plans         ──────────▶  GET /api/subscriptions/plans
                  ◀──────────  { plans: [monthly, quarterly] }

User picks plan
POST create       ──────────▶  POST /api/subscriptions/create ─────────▶  POST /v1/subscriptions
 { planId }                     (maps planId → LIVE plan_id)  ◀─────────  { id: sub_xxx, status: created }
                  ◀──────────  { subscriptionId, razorpayKeyId }

Open Razorpay Checkout  ────────────────────────────────────────────────▶  user authorizes + pays
                                                                            │
                               POST /api/webhooks/razorpay  ◀───────────────┘ subscription.authenticated
                               (HMAC signature verified)                      subscription.activated
                               store status + billing dates                   subscription.charged ...

GET my            ──────────▶  GET /api/subscriptions/my
                  ◀──────────  { status: active, hasAccess: true, currentPeriodEnd, nextChargeAt }

Unlock features
```

Rules the design follows:

- The app only ever sends the internal `planId`. Amount, interval, currency and
  the Razorpay `plan_id` are decided by the backend.
- Razorpay plans are created **manually in the Razorpay dashboard (LIVE)** and
  mapped by environment variable. The backend never creates Razorpay plans.
- The **webhook is the source of truth** for subscription status. A "payment
  success" callback in the app is only a hint to start polling.
- The Razorpay **key id** may be shown to the app; the **key secret** and the
  **webhook secret** never leave the backend.

---

## 2. Backend

### 2.1 Files

| File | Responsibility |
|---|---|
| `server/subscriptionPlans.js` | Plans store (`server/data/plans.json`), public GET, admin CRUD |
| `server/subscriptions.js` | create / my / cancel, webhook handling, store (`server/data/subscriptions.json`) |
| `server/razorpayClient.js` | Razorpay REST calls (Basic auth), env plan mapping, webhook signature check |
| `server/authTokens.js` | Backend JWT issue/verify, `requireAuth`, `requireRole` |
| `server/mobileVerify.js` | Mobile OTP login (MSG91 widget verifyOtp) → JWT |
| `server/adminAuth.js` | Admin login (env account) → JWT with `role=admin` |
| `server/kycServer.js` | HTTP server, route table, raw-body capture for webhook signatures |

### 2.2 Environment (`.env`)

```
# Razorpay LIVE
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...            # from the Razorpay webhook you create (see 2.6)
RAZORPAY_MONTHLY_PLAN_ID=plan_...      # created manually in Razorpay
RAZORPAY_QUARTERLY_PLAN_ID=plan_...    # created manually in Razorpay

# Auth
JWT_SECRET=<32+ random chars>
ADMIN_EMAIL=...
ADMIN_PASSWORD=<8+ chars>

# MSG91 (mobile OTP login)
MSG91_WIDGET_ID=...
MSG91_TOKEN_AUTH=...
```

Mapping rule: internal plan id `X` → env `RAZORPAY_<X upper-cased>_PLAN_ID`.
An admin can also store `razorpayPlanId` directly on a plan through the plans
API; the stored value wins over env.

Startup prints a config check; all of these must say `YES`:

```
RAZORPAY_SUBSCRIPTIONS_READY: 'YES'
RAZORPAY_WEBHOOK_READY: 'YES'
RAZORPAY_PLAN_MAPPING: 'YES'
JWT_SECRET_READY: 'YES'
MSG91_READY: 'YES'
```

### 2.3 Plans API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/subscriptions/plans` | public | list active plans (admins also see inactive) |
| GET | `/api/subscriptions/plans/:id` | public | one plan |
| POST | `/api/subscriptions/plans` | admin | create |
| PUT | `/api/subscriptions/plans/:id` | admin | update (partial) |
| DELETE | `/api/subscriptions/plans/:id` | admin | delete |

Plan shape:

```json
{ "id": "monthly", "name": "Monthly", "amount": 591, "currency": "INR",
  "interval": "monthly", "active": true, "createdAt": "...", "updatedAt": "..." }
```

`interval` is one of `monthly`, `quarterly`, `half_yearly`, `yearly`.

Important: Razorpay plan amounts cannot be edited after creation. If the local
amount changes, create a new Razorpay plan with the new amount and update the
env mapping (or the plan's `razorpayPlanId`).

### 2.4 Subscription API

**Create** — `POST /api/subscriptions/create` (Bearer user token)

```json
// request
{ "planId": "monthly" }
// response
{ "success": true, "subscriptionId": "sub_xxx", "razorpayKeyId": "rzp_live_xxx",
  "planId": "monthly", "status": "created" }
```

Errors: `400` planId missing · `404` plan unknown/inactive · `409` user already
has an open subscription (`details.subscription` included) · `502` Razorpay
error · `503` Razorpay keys or plan mapping not configured.

**My subscription** — `GET /api/subscriptions/my` (Bearer)

```json
{ "success": true,
  "subscription": {
    "subscriptionId": "sub_xxx", "planId": "monthly", "planName": "Monthly",
    "status": "active", "hasAccess": true,
    "currentPeriodStart": "2026-10-01T10:00:00.000Z",
    "currentPeriodEnd":   "2026-11-01T10:00:00.000Z",
    "nextChargeAt":       "2026-11-01T10:00:00.000Z",
    "cancelAtPeriodEnd": false, "cancelledAt": null,
    "createdAt": "...", "updatedAt": "..." } }
```

`subscription` is `null` when the user has none. `status` is Razorpay's own
status (`created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`,
`completed`, `paused`, `expired`). `hasAccess` is what the app should gate on:
true while `active`/`authenticated`, and for `cancelled`/`halted`/`pending`
until `currentPeriodEnd` passes.

**Cancel** — `POST /api/subscriptions/cancel` (Bearer)

```json
// request (default true)
{ "cancelAtPeriodEnd": true }
// response
{ "success": true,
  "message": "Subscription will be cancelled at the end of the current billing period",
  "subscription": { ...status still active, "cancelAtPeriodEnd": true } }
```

`{ "cancelAtPeriodEnd": false }` cancels immediately (`"message": "Subscription cancelled"`).

### 2.5 Webhook — `POST /api/webhooks/razorpay`

Called by Razorpay only. The backend:

1. Recomputes `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` and compares it to
   the `x-razorpay-signature` header (401 on mismatch, 503 if secret unset).
2. Ignores non-`subscription.*` events and unknown subscription ids.
3. Skips duplicates by `x-razorpay-event-id`, and ignores events older than the
   last applied one (a late `pending` cannot downgrade an `active` record).
4. Updates status, `currentPeriodStart/End`, `nextChargeAt`, last payment id.

Handled events: `subscription.authenticated`, `activated`, `charged`, `pending`,
`halted`, `cancelled`, `completed`, `paused`, `resumed`, `expired`.

### 2.6 Razorpay dashboard setup (one time)

1. Plans → create `Monthly` and `Quarterly` in LIVE mode (already done). Copy
   their ids into `RAZORPAY_MONTHLY_PLAN_ID` / `RAZORPAY_QUARTERLY_PLAN_ID`.
2. Settings → Webhooks → Add:
   - URL: `https://<your-backend>/api/webhooks/razorpay`
   - Events: all `subscription.*` events
   - Secret: any long random string → paste into `RAZORPAY_WEBHOOK_SECRET`
3. Restart the backend and confirm `RAZORPAY_WEBHOOK_READY: 'YES'`.

Local testing of the webhook without Razorpay:

```bash
BODY='{"event":"subscription.activated","created_at":1800000100,"payload":{"subscription":{"entity":{"id":"sub_xxx","status":"active","current_start":1800000000,"current_end":1802592000,"charge_at":1802592000}}}}'
SIG=$(node -e "console.log(require('crypto').createHmac('sha256','<RAZORPAY_WEBHOOK_SECRET>').update(process.argv[1]).digest('hex'))" "$BODY")
curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "Content-Type: application/json" -H "x-razorpay-signature: $SIG" -H "x-razorpay-event-id: evt_1" \
  --data-raw "$BODY"
```

---

## 3. Mobile app — step-by-step plan

Nothing below is implemented yet. Each step is small and can be shipped in order.

### Step 1 — Backend config and API client

- Add to `src/services/kycConfig.ts` (already has `trustledgeBackendConfig.baseUrl`)
  nothing new; reuse it.
- Create `src/services/subscriptionApi.ts`:

```ts
import { trustledgeBackendConfig } from './kycConfig';
import { getAuthToken } from './authSession';

const base = trustledgeBackendConfig.baseUrl.replace(/\/+$/, '');

async function request(path: string, init: RequestInit = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

export const getPlans = () => request('/api/subscriptions/plans', { method: 'GET' });
export const createSubscription = (planId: string) =>
  request('/api/subscriptions/create', { method: 'POST', body: JSON.stringify({ planId }) });
export const getMySubscription = () => request('/api/subscriptions/my', { method: 'GET' });
export const cancelSubscription = (cancelAtPeriodEnd = true) =>
  request('/api/subscriptions/cancel', { method: 'POST', body: JSON.stringify({ cancelAtPeriodEnd }) });
```

### Step 2 — Store the backend login token

- Create `src/services/authSession.ts` that saves/reads the JWT in AsyncStorage
  (`@trustledge_backend_token`), plus `clearAuthToken()` on logout.
- After the MSG91 widget's `verifyOtp` succeeds, call
  `POST /api/auth/mobile-verify` with `{ mobile, otp, reqId }`, then
  `setAuthToken(response.token)`.
- On 401 from any API, clear the token and send the user back to login.

### Step 3 — Plans screen

- New `src/screens/SubscriptionPlansScreen.tsx`.
- On mount: `getPlans()` → show a card per plan (`name`, `₹amount`, interval).
  Do not hardcode prices in the app; the API is the source.
- Also call `getMySubscription()`; if `hasAccess` is true, show the current plan
  and a "Manage" button instead of "Subscribe".
- Register the screen in `src/screenRoute/stacks.tsx` and link it from the
  Dashboard banner that currently points to the one-time `RazorpayPayment`.

### Step 4 — Create subscription and open Razorpay Checkout

```ts
import RazorpayCheckout from 'react-native-razorpay';

const { subscriptionId, razorpayKeyId } = await createSubscription(plan.id);

await RazorpayCheckout.open({
  key: razorpayKeyId,                 // LIVE key id from the backend, never the secret
  subscription_id: subscriptionId,    // this makes Checkout run in subscription mode
  name: 'Destiny Protocol',
  description: `${plan.name} plan`,
  prefill: { contact: user.mobile, email: user.email },
  theme: { color: '#DFB05B' },
});
```

- If `createSubscription` returns 409, the user already has an open
  subscription: show it (`error.data.details.subscription`) instead of failing.
- Checkout resolves with `razorpay_payment_id` and `razorpay_subscription_id`.
  Treat success only as "start polling"; do not unlock yet.
- If the user dismisses Checkout, nothing is charged; the backend record stays
  `created` and the user can try again later (create is allowed again).

### Step 5 — Confirm via the backend, not the client

- After Checkout closes, poll `getMySubscription()` every 3 seconds for up to
  ~60 seconds until `subscription.hasAccess === true` (webhook latency is
  usually a few seconds).
- Show "Confirming payment…" meanwhile; on timeout show "Payment received,
  activation pending" and re-check on next app open.

### Step 6 — Gate features on the subscription

- Replace the current `isPaid = !!profile?.verifications?.payment` checks in
  `DashboardScreen.tsx` and `CustomDrawerContent.tsx` with a hook:

```ts
const { subscription, loading } = useSubscription(); // wraps getMySubscription
const hasAccess = !!subscription?.hasAccess;
```

- Cache the last result in AsyncStorage so the app works offline briefly, but
  refresh on app foreground (`AppState` listener already exists in Dashboard).

### Step 7 — Manage / cancel

- In Profile or Settings, show plan name, `status`, "Renews on
  {nextChargeAt}" or "Access until {currentPeriodEnd}" when `cancelAtPeriodEnd`.
- "Cancel subscription" → confirm dialog → `cancelSubscription(true)` →
  refresh. Access continues until `currentPeriodEnd`.
- Handle `status: 'halted'` / `'pending'` (payment failed) with a banner:
  "Payment failed, update your payment method" — Razorpay retries automatically
  and emails the customer.

### Step 8 — Clean up the old one-time payment

- `RazorpayPaymentScreen.tsx` hardcodes an old Razorpay key id and charges a
  one-time ₹1 "Registry Fee". Either remove it or switch it to use
  `razorpayKeyId` from the backend, and stop writing `verifications.payment`
  as the access flag once Step 6 ships.

### Step 9 — Test checklist (LIVE mode, ₹1 plans)

1. Login → token stored → `GET /api/subscriptions/my` returns `null`.
2. Plans screen shows Monthly and Quarterly from the API.
3. Subscribe Monthly → Checkout opens in subscription mode → pay ₹1.
4. Within a few seconds `my` shows `active`, `hasAccess: true`, correct dates.
5. Subscribe again → 409 handled gracefully.
6. Cancel at period end → `cancelAtPeriodEnd: true`, access still true.
7. Kill and reopen the app → gating still correct from cached + refreshed state.
8. Repeat with Quarterly on a second account → `nextChargeAt` three months out.
9. Razorpay dashboard → Webhooks → check deliveries are 200.

---

## 4. Known limitations / next steps

- **Storage:** plans and subscriptions live in JSON files under `server/data/`.
  On Render's free tier the disk resets on each redeploy, which would lose the
  user ↔ subscription mapping. Move to a database (or a persistent disk) before
  real customers.
- **Prices:** both Razorpay plans are currently ₹1 for testing. Create new
  Razorpay plans at the real prices, update the env ids and local amounts.
- **Old payment routes:** `/api/payments/razorpay-webhook` (unsigned) and the
  payments poller are the legacy one-time flow; retire them once the app moves
  to subscriptions.
- **Local dev with Cursor:** Cursor's auto port forwarding can capture
  `localhost:3000`. Use the machine IP or disable
  `remote.autoForwardPorts` in Cursor settings.
