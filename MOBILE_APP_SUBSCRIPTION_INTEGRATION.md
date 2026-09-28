# Mobile App Integration — Login + Subscription Plans

For: mobile developers building the new app.


Placeholders used in every curl below:

```
BASE_URL = backend base URL
TOKEN    = the login token returned by Step 2
```

All requests and responses are JSON. Every error looks like:

```json
{ "success": false, "message": "reason" }
```

---

## Flow

```
Step 1  MSG91 OTP widget in the app      → reqId, user enters OTP
Step 2  POST /api/auth/mobile-verify     → TOKEN (save it)
Step 3  GET  /api/subscriptions/plans    → show plans
Step 4  POST /api/subscriptions/create   → subscriptionId + razorpayKeyId
Step 5  Razorpay Checkout in the app     → user pays
Step 6  GET  /api/subscriptions/my       → poll until hasAccess = true → unlock
Step 7  POST /api/subscriptions/cancel   → manage screen
```

The token: a JWT issued by this backend after OTP verification. Valid 7 days.
Send it on every call after login as the header `Authorization: Bearer TOKEN`.
If any API returns `401`, delete the token and show the login screen.

---

## Step 1 — Send OTP with the MSG91 widget (in the app)

Use the MSG91 OTP widget SDK: `sendOtp(mobile)` returns a `reqId`. Keep the
`reqId` and the mobile number; the user then types the OTP.

Mobile developer does: mobile number screen → call widget `sendOtp` → OTP entry screen.

---

## Step 2 — Verify OTP and get the token

```bash
curl -X POST "$BASE_URL/api/auth/mobile-verify" \
  -H "Content-Type: application/json" \
  -d '{"mobile":"917081002501","otp":"488412","reqId":"36697a6f694a353432323432"}'
```

Body:

| Field | Meaning |
|---|---|
| `mobile` | number the OTP was sent to, with country code (`917081002501`, `+917081002501` and `7081002501` all accepted) |
| `otp` | the code the user typed |
| `reqId` | value returned by the widget's `sendOtp` |

Response `200`:

```json
{ "success": true, "token": "eyJhbGciOi...", "user": { "id": "+917081002501", "mobile": "+917081002501" } }
```

Errors: `400` bad mobile / OTP format / missing reqId · `401 Invalid or expired OTP` (OTP is single-use; ask the user to resend) · `502/503` MSG91 unavailable.

Mobile developer does: save `token` securely (Keychain / EncryptedSharedPreferences / AsyncStorage), save `user.mobile`, go to the home screen.

---

## Step 3 — Show the plans

```bash
curl "$BASE_URL/api/subscriptions/plans"
```

No token needed.

Response:

```json
{ "success": true,
  "plans": [
    { "id": "monthly",   "name": "Monthly",   "amount": 591,  "currency": "INR", "interval": "monthly" },
    { "id": "quarterly", "name": "Quarterly", "amount": 1599, "currency": "INR", "interval": "quarterly" }
  ] }
```

| Field | Meaning |
|---|---|
| `id` | the only value you send back when subscribing |
| `amount` | price in rupees, shown as is |
| `interval` | `monthly`, `quarterly`, `half_yearly` or `yearly` → label it "per month", "every 3 months", "every 6 months", "per year" |

Mobile developer does: render one card per plan from this response. Do not hardcode prices. Call Step 6 first; if the user already has access, show "Manage" instead of "Subscribe".

---

## Step 4 — Create the subscription

```bash
curl -X POST "$BASE_URL/api/subscriptions/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId":"monthly"}'
```

Body: `planId` = the plan `id` the user tapped. Nothing else. Amount and currency are decided by the backend.

Response `200`:

```json
{ "success": true, "subscriptionId": "sub_RkT9xxxxxxxx", "razorpayKeyId": "rzp_live_xxxxxxxx", "planId": "monthly", "status": "created" }
```

`status: created` means "waiting for payment"; no money has moved yet.

Errors: `401` re-login · `404 Plan not found` · `409 You already have an active subscription` (response `details.subscription` has the current one → open Manage) · `502/503` payment provider unavailable, show retry.

Mobile developer does: call this when the user taps Subscribe, then go straight to Step 5 with the two returned values.

---

## Step 5 — Open Razorpay Checkout (in the app)

Use the Razorpay Checkout SDK for your platform with:

| Checkout option | Value |
|---|---|
| `key` | `razorpayKeyId` from Step 4 |
| `subscription_id` | `subscriptionId` from Step 4 |
| `name`, `description` | your app name and the plan name |
| `prefill.contact` | the user's mobile |

Do not pass `amount` or `order_id`; `subscription_id` puts Checkout in subscription mode and Razorpay charges the plan price.

Mobile developer does: on Checkout success, show "Confirming payment…" and go to Step 6. Do not unlock anything yet. On dismiss, nothing was charged; the user can tap Subscribe again.

---

## Step 6 — Confirm and gate access

```bash
curl "$BASE_URL/api/subscriptions/my" \
  -H "Authorization: Bearer $TOKEN"
```

Response when the user has a subscription:

```json
{ "success": true,
  "subscription": {
    "subscriptionId": "sub_RkT9xxxxxxxx",
    "planId": "monthly", "planName": "Monthly",
    "status": "active",
    "hasAccess": true,
    "currentPeriodStart": "2026-10-01T10:00:00.000Z",
    "currentPeriodEnd":   "2026-11-01T10:00:00.000Z",
    "nextChargeAt":       "2026-11-01T10:00:00.000Z",
    "cancelAtPeriodEnd": false } }
```

Response when there is none: `{ "success": true, "subscription": null }` (this is a normal 200).

| Field | Use |
|---|---|
| `hasAccess` | the only flag that unlocks paid features |
| `status` | `created` (unpaid), `active`, `pending` (payment retrying), `halted` (payment failed), `cancelled`, `expired` |
| `nextChargeAt` | "Renews on …" |
| `currentPeriodEnd` | "Access until …" when cancelled or halted |
| `cancelAtPeriodEnd` | `true` → show "Cancels on …" and hide the Cancel button |

Mobile developer does:

- After Checkout: call this every 3 seconds for up to 60 seconds until `hasAccess` is `true` (Razorpay tells the backend a few seconds after payment). If it does not flip, show "Payment received, activation pending" and re-check on next app open.
- Call it on every app start and when the app returns to the foreground. Cache the last result so screens render offline.
- Gate every paid feature on `hasAccess` only.
- Status banners: `pending` → "Payment is being retried"; `halted` → "Payment failed, update your payment method"; `cancelled` with `hasAccess` true → "Access until {currentPeriodEnd}"; otherwise "No active plan".

---

## Step 7 — Cancel (Manage screen)

```bash
curl -X POST "$BASE_URL/api/subscriptions/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cancelAtPeriodEnd":true}'
```

Body: `cancelAtPeriodEnd` `true` = keep access until the paid period ends (recommended); `false` = stop now.

Response `200`:

```json
{ "success": true, "message": "Subscription will be cancelled at the end of the current billing period", "subscription": { "...": "same shape as Step 6, cancelAtPeriodEnd: true" } }
```

Errors: `404 No active subscription to cancel` → refresh Step 6 and update the screen.

Mobile developer does: Manage screen shows plan name, status, renew or access-until date, and a Cancel button with a confirm dialog. After cancel, refresh Step 6. To change plan, the user waits until the current one ends (a second subscribe returns 409).

---

## Test checklist (live mode, plans are ₹1 during testing)

1. OTP login → token saved → Step 6 returns `subscription: null`.
2. Plans screen shows Monthly and Quarterly from the API.
3. Subscribe Monthly → Checkout opens in subscription mode → pay ₹1.
4. Within ~10 s Step 6 shows `status: active`, `hasAccess: true`.
5. Subscribe again → 409 → app opens Manage, no error shown.
6. Cancel at period end → `cancelAtPeriodEnd: true`, access still unlocked.
7. Kill and reopen the app → access state correct.
8. Remove the token → any API gives 401 → app returns to login.
9. Second account → Quarterly → `nextChargeAt` three months out.
