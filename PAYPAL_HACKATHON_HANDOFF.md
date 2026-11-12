# Studenius — PayPal Sandbox demo & review handoff

> **Status (2026-11-13): engineering candidate, not production payment release.**
> GitHub CI has verified the application build and locally mocked safety tests.
> A live merchant-authorized Sandbox payment has **not yet been run or verified**.
> Demo is enabled only if explicitly configured. No real-money checkout is enabled
> by this patch and Sandbox captures **never** grant paid production access.

## What the demo demonstrates

- Studenius converts study materials into AI-assisted active recall and practice.
- A signed-in learner can select a Studenius VIP plan and use an **opt-in PayPal Sandbox** order for a simulated purchase.
- The server creates the PayPal Orders v2 order with server-set Philippine peso prices and an authenticated Supabase account ID.
- After PayPal Sandbox approval, the server checks that the order's user ID, plan, amount, and currency match the signed-in learner before capturing it.
- The UI clearly labels the returned result as a **Sandbox test**, without claiming an actual premium subscription was purchased.

## Required private configuration

**Never commit credentials or tokens to GitHub, client code, or the public README.**

For a Cloudflare Pages project built from `prepzap-clean`:

1. Keep the configured Supabase web client settings for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the test must sign in as a real Supabase user.
2. Set `VITE_PAYPAL_SANDBOX_DEMO=true` as a **build-time** variable, then rebuild. No merchant secret belongs in any `VITE_` variable.
3. In Cloudflare Pages **server-side environment variables or encrypted secrets**, set:
   - `PAYPAL_SANDBOX_CLIENT_ID` — from a PayPal Developer **Sandbox** app
   - `PAYPAL_SANDBOX_CLIENT_SECRET` — from that same **Sandbox** app, server only
   - `SUPABASE_URL` — HTTPS project URL
   - `SUPABASE_ANON_KEY` — project public/anon key, for validation through Supabase Auth
4. Make sure the Pages Functions directory `prepzap-clean/functions` is deployed and the route `POST /api/paypal-sandbox` is available. Repository-root Pages builds also contain a shim in `functions/api/paypal-sandbox.ts`.
5. Use distinct PayPal Sandbox *business* (merchant) and *personal* (buyer) test accounts. Do **not** use a real PayPal payment account.

PayPal Developer official guide: https://developer.paypal.com/sandbox-testing/overview/

## Build / local testing

```sh
cd prepzap-clean
npm ci
npx vitest run src/test/paypalSecurity.test.ts src/test/paypalSandbox.test.ts
npm run build
```

The Vite server alone does **not** serve Cloudflare Pages Functions. For local Pages end-to-end testing, use Wrangler's Pages development server with a **private ignored** `.dev.vars` file containing server-only Sandbox variables. Verify the environment variable and Function bindings before promising a working demo.

## Actual Sandbox acceptance test (not yet performed)

1. Sign in to Studenius using a real Supabase test account with a free plan.
2. Go to `/pro` and confirm the screen explicitly says **Sandbox test only**.
3. Select Monthly and begin the Sandbox checkout. Confirm the server returns a Sandbox approval URL and that amount shown at PayPal is **PHP 199.00**.
4. Sign in as a PayPal **personal Sandbox buyer**, approve the simulated payment, then return to Studenius.
5. Confirm the server captures the test order and the screen says it was a test transaction with **no paid entitlement granted**.
6. Also test cancel, invalid/wrong-user order, wrong amount, duplicate capture, expired Supabase session, and missing credentials. Check real Supabase profiles stay unchanged.

If any step fails, present the feature as **in development**, not as a successfully tested checkout.

## Technical limitations and non-goals

- The legacy webhook was deliberately changed to fail closed after an unsafe, unsigned-notification handling path was identified. That old Worker should **not** handle real customer payment fulfillment.
- The demo is not a recurring PayPal subscription API integration; pricing cards describe proposed access tiers, while the demo uses a one-off test transaction.
- There is no durable merchant payment ledger, payout, renewal/revocation logic, signed production webhook, merchant production checkout, or production entitlement grant.
- AI responses may depend on external provider credentials and service availability. Only claim AI behaviors actually verified in the live build.
- CI success proves unit-level constraints and build success, **not** successful authorized PayPal API or hosted-environment testing.

## Submission evidence to prepare

- Working live app or reproducible instructions accessible to reviewers.
- An under-3-minute screen recording of the *actual app*; include PayPal Sandbox only if the complete flow above succeeds.
- Source repository: https://github.com/toruiii203/prepzap
- Specific integration branch and PR: https://github.com/toruiii203/prepzap/pull/3
- Explicit disclosure that Studenius was previously entered in the Nebius x NVIDIA Global AI Hackathon.
- Exact list of features added during October 1–November 12, 2026. Obtain timestamps from Git history and distinguish existing AI work from newly added payment changes.

## Critical review note

No release or user-facing monetization should be activated from this branch without merchant approval, external Sandbox acceptance, signed production webhooks and a durable entitlement design.
