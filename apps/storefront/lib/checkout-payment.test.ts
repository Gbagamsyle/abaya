import assert from "node:assert/strict";
import test from "node:test";
import { resolveCheckoutProvider, validatePaymentReadyCart } from "./checkout-server";
import { createIdempotencyGate } from "./idempotency";

test("payment session rejects an empty or stale cart", () => {
  assert.throws(() => validatePaymentReadyCart({ id: "cart_empty", total: 100 }), /bag is empty/);
});

test("payment session requires saved contact and delivery details", () => {
  assert.throws(
    () => validatePaymentReadyCart({ id: "cart_unready", items: [{}], total: 100 }),
    /contact and delivery/,
  );
});

test("payment session rejects zero or invalid Medusa totals", () => {
  const base = {
    id: "cart_ready",
    items: [{}],
    email: "buyer@example.com",
    shipping_methods: [{}],
  };
  assert.throws(() => validatePaymentReadyCart({ ...base, total: 0 }), /total cannot be paid/);
  assert.throws(
    () => validatePaymentReadyCart({ ...base, total: Number.NaN }),
    /total cannot be paid/,
  );
});

test("payment provider selection prefers the Medusa system provider over Stripe when both are available", () => {
  assert.equal(
    resolveCheckoutProvider([
      { id: "pp_system_default" },
      { id: "pp_stripe_stripe" },
    ])?.id,
    "pp_system_default",
  );
  assert.equal(
    resolveCheckoutProvider([{ id: "pp_system" }])?.id,
    "pp_system",
  );
  assert.equal(
    resolveCheckoutProvider([{ id: "pp_stripe_stripe" }])?.id,
    "pp_stripe_stripe",
  );
  assert.equal(resolveCheckoutProvider([]), undefined);
});

test("duplicate order completion shares an in-flight call and caches success", async () => {
  let calls = 0;
  let resolve!: (result: { type: "order" | "cart" }) => void;
  const pendingResult = new Promise<{ type: "order" | "cart" }>((done) => {
    resolve = done;
  });
  const runOnce = createIdempotencyGate<{ type: "order" | "cart" }>(
    (result) => result.type === "order",
  );
  const operation = () => {
    calls += 1;
    return pendingResult;
  };

  const first = runOnce("cart_checkout", operation);
  const duplicate = runOnce("cart_checkout", operation);
  assert.equal(first, duplicate);
  resolve({ type: "order" });
  assert.deepEqual(await first, { type: "order" });
  assert.deepEqual(await runOnce("cart_checkout", operation), { type: "order" });
  assert.equal(calls, 1);
});

test("failed completion is not cached, allowing retry", async () => {
  let calls = 0;
  const runOnce = createIdempotencyGate<{ type: "order" | "cart" }>(
    (result) => result.type === "order",
  );
  const operation = async () => {
    calls += 1;
    return { type: calls === 1 ? ("cart" as const) : ("order" as const) };
  };

  assert.deepEqual(await runOnce("cart_retry", operation), { type: "cart" });
  assert.deepEqual(await runOnce("cart_retry", operation), { type: "order" });
  assert.equal(calls, 2);
});
