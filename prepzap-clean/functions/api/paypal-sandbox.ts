/**
 * Studenius PayPal Orders v2 SANDBOX demonstration, never real payments.
 * No production entitlements are granted here. A real paid-membership release
 * requires durable transaction records, a verified webhook and owner review.
 *
 * Secrets are server-side Cloudflare Pages bindings only, NEVER VITE_ variables.
 */
type Env = {
  PAYPAL_SANDBOX_CLIENT_ID?: string;
  PAYPAL_SANDBOX_CLIENT_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};
type Context = { request: Request; env: Env };
type Plan = "Weekly" | "Monthly" | "Yearly";
type SandboxOrder = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: Array<{ id?: string; status?: string; amount?: {currency_code?: string;value?: string} }> };
  }>;
  links?: Array<{ rel?: string; href?: string }>;
};
export const SANDBOX_PRICES: Record<Plan, string> = {
  Weekly: "79.00", Monthly: "199.00", Yearly: "1499.00",
};
const API = "https://api-m.sandbox.paypal.com";
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  } });
const isPlan = (value: unknown): value is Plan =>
  typeof value === "string" && Object.hasOwn(SANDBOX_PRICES, value);

export function sandboxOrderMatches(order: SandboxOrder, userId: string): Plan | null {
  const units = order.purchase_units;
  if (!units || units.length !== 1 || !userId) return null;
  const unit = units[0];
  if (!isPlan(unit.reference_id) || unit.custom_id !== userId) return null;
  const amount = unit.amount;
  if (amount?.currency_code !== "PHP" || amount.value !== SANDBOX_PRICES[unit.reference_id]) return null;
  return unit.reference_id;
}

async function signedInUser(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer ([^\s]{20,4096})$/.exec(authorization);
  if (!match || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  let url: URL;
  try { url = new URL(env.SUPABASE_URL); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const response = await fetch(new URL("/auth/v1/user", url), {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: unknown };
  return typeof user.id === "string" && /^[0-9a-f-]{30,40}$/i.test(user.id) ? user.id : null;
}

async function paypalToken(env: Env): Promise<string> {
  const client = env.PAYPAL_SANDBOX_CLIENT_ID;
  const secret = env.PAYPAL_SANDBOX_CLIENT_SECRET;
  if (!client || !secret) throw new Error("sandbox_not_configured");
  const response = await fetch(API + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(client + ":" + secret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("sandbox_auth_failed");
  const data = await response.json() as { access_token?: unknown };
  if (typeof data.access_token !== "string" || !data.access_token) throw new Error("sandbox_auth_failed");
  return data.access_token;
}

async function paypalOrder(endpoint: string, accessToken: string, method: "GET" | "POST", body?: unknown, idempotency?: string): Promise<SandboxOrder> {
  const response = await fetch(API + endpoint, {
    method,
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      ...(idempotency ? { "PayPal-Request-Id": idempotency } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("sandbox_order_failed");
  return await response.json() as SandboxOrder;
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  // A demo must not accidentally become a live merchant checkout.
  if (!env.PAYPAL_SANDBOX_CLIENT_ID || !env.PAYPAL_SANDBOX_CLIENT_SECRET ||
      !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY)
    return json({ error: "PayPal Sandbox demo is not configured." }, 503);

  const origin = new URL(request.url).origin;
  const from = request.headers.get("Origin");
  if (from && from !== origin) return json({ error: "Cross-origin request rejected." }, 403);

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: "Invalid request." }, 400);
    data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("invalid_json");
  } catch { return json({ error: "Invalid request." }, 400); }

  try {
    const userId = await signedInUser(request, env);
    if (!userId) return json({ error: "Sign in to use the payment demo." }, 401);
    const access = await paypalToken(env);
    if (data.action === "create" && isPlan(data.plan)) {
      const returnUrl = new URL("/pro?paypal_demo=approved", origin).toString();
      const cancelUrl = new URL("/pro?paypal_demo=cancelled", origin).toString();
      const order = await paypalOrder("/v2/checkout/orders", access, "POST", {
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: data.plan,
          custom_id: userId,
          description: "Studenius VIP " + data.plan + " - SANDBOX TEST ONLY",
          amount: { currency_code: "PHP", value: SANDBOX_PRICES[data.plan] },
        }],
        application_context: { brand_name: "Studenius Sandbox Demo", return_url: returnUrl, cancel_url: cancelUrl, user_action: "PAY_NOW" },
      });
      const approve = order.links?.find(link => link.rel === "approve")?.href;
      let parsed: URL;
      try { parsed = new URL(approve || ""); } catch { return json({ error: "Sandbox approval link missing." }, 502); }
      if (!order.id || parsed.protocol !== "https:" ||
          !/(^|\.)sandbox\.paypal\.com$/.test(parsed.hostname))
        return json({ error: "Unexpected PayPal response." }, 502);
      return json({ orderId: order.id, approvalUrl: parsed.toString(), sandbox: true });
    }
    if (data.action === "capture" && typeof data.orderId === "string" &&
        /^[A-Z0-9]{8,32}$/i.test(data.orderId)) {
      // Check PayPal's server-side order, not any client-supplied user or amount.
      const endpoint = "/v2/checkout/orders/" + encodeURIComponent(data.orderId);
      const original = await paypalOrder(endpoint, access, "GET");
      const plan = sandboxOrderMatches(original, userId);
      if (!plan || original.status !== "APPROVED")
        return json({ error: "The order does not belong to this signed-in user or is not approved." }, 403);
      const result = await paypalOrder(endpoint + "/capture", access, "POST", {}, "studenius-sandbox-" + data.orderId);
      const unit = result.purchase_units?.[0];
      const captures = unit?.payments?.captures;
      const completed = result.status === "COMPLETED" && captures?.length === 1 &&
        captures[0].status === "COMPLETED" &&
        captures[0].amount?.currency_code === "PHP" &&
        captures[0].amount?.value === SANDBOX_PRICES[plan];
      if (!completed) return json({ error: "Sandbox capture was not confirmed." }, 502);
      // NEVER grant a paid account entitlement for no-money sandbox transactions.
      return json({ sandbox: true, captured: true, plan, premiumGranted: false, orderId: result.id, captureId: captures![0].id });
    }
    return json({ error: "Unknown sandbox action." }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "sandbox_not_configured") return json({ error: "PayPal Sandbox demo is unavailable." }, 503);
    return json({ error: "PayPal Sandbox request failed. No premium status was changed." }, 502);
  }
}
