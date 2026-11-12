import { describe, expect, it } from "vitest";
import worker from "../../backend-worker/src/index";

describe("Legacy PayPal webhook safety", () => {
  it("rejects unsigned claims of completed payments instead of granting entitlements", async () => {
    const request = new Request("https://study.example/webhooks/paypal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "PAYMENT.SALE.COMPLETED",
        resource: { custom_id: "another-users-uuid" },
      }),
    });
    const response = await worker.fetch(request, {} as never, {} as never);
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("verification");
  });

  it("does not mistake a GET request for a verified payment event", async () => {
    const response = await worker.fetch(
      new Request("https://study.example/webhooks/paypal"),
      {} as never,
      {} as never,
    );
    expect(response.status).toBe(404);
  });
});
