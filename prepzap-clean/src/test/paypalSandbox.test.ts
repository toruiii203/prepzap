import { describe, expect, it } from "vitest";
import { onRequestPost, sandboxOrderMatches, SANDBOX_PRICES } from "../../functions/api/paypal-sandbox";

const USER = "00000000-0000-4000-8000-000000000001";
const approvedOrder = (custom_id: string, reference_id: string, value = "199.00") => ({
  status: "APPROVED",
  purchase_units: [{
    reference_id,
    custom_id,
    amount: { currency_code: "PHP", value },
  }],
});

describe("PayPal Sandbox Orders v2 safety", () => {
  it("binds server prices to the authenticated user and recognized plan", () => {
    expect(sandboxOrderMatches(approvedOrder(USER, "Monthly"), USER)).toBe("Monthly");
    expect(SANDBOX_PRICES.Weekly).toBe("79.00");
    expect(sandboxOrderMatches(approvedOrder("another-account", "Monthly"), USER)).toBeNull();
    expect(sandboxOrderMatches(approvedOrder(USER, "Monthly", "0.01"), USER)).toBeNull();
    expect(sandboxOrderMatches(approvedOrder(USER, "Unknown"), USER)).toBeNull();
    expect(sandboxOrderMatches({purchase_units: []}, USER)).toBeNull();
    expect(sandboxOrderMatches({
      purchase_units: [{
        ...approvedOrder(USER, "Monthly").purchase_units[0],
        amount: {currency_code: "USD", value: "199.00"},
      }],
    }, USER)).toBeNull();
  });

  it("fails closed when sandbox secrets are missing", async () => {
    const response = await onRequestPost({
      request: new Request("https://studenius.example/api/paypal-sandbox", {
        method: "POST", headers: {"Content-Type": "application/json"}, body: '{"action":"create","plan":"Monthly"}',
      }),
      env: {},
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("not configured");
  });

  it("rejects forged third-party origins before parsing any payment intent", async () => {
    const response = await onRequestPost({
      request: new Request("https://studenius.example/api/paypal-sandbox", {
        method: "POST", headers: {"Origin": "https://attacker.example"}, body: '{"action":"capture","orderId":"ABC123456"}',
      }),
      env: {
        PAYPAL_SANDBOX_CLIENT_ID: "test",
        PAYPAL_SANDBOX_CLIENT_SECRET: "test",
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_ANON_KEY: "test",
      },
    });
    expect(response.status).toBe(403);
  });
});
