import assert from "node:assert/strict";
import test from "node:test";
import { validateCheckoutPayload } from "./checkout-server";

test("valid checkout payload accepts contact, address and shipping selection", () => {
  const result = validateCheckoutPayload({
    email: "hello@example.com",
    shippingAddress: {
      first_name: "Aina",
      last_name: "Aziz",
      phone: "+60123456789",
      address_1: "No 18 Jalan Seri",
      city: "Kuala Lumpur",
      country_code: "my",
      province: "WP Kuala Lumpur",
      postal_code: "50000",
    },
    shippingOptionId: "so_123",
  });

  assert.equal(result.valid, true);
  assert.ok(result.clean);
  if (!result.clean) throw new Error("checkout payload should be clean");
  assert.equal(result.clean.email, "hello@example.com");
  assert.equal(result.clean.shippingAddress.country_code, "my");
});

test("invalid checkout payload rejects missing address details and malformed email", () => {
  const result = validateCheckoutPayload({
    email: "not-an-email",
    shippingAddress: {
      first_name: "Aina",
      city: "Kuala Lumpur",
      country_code: "my",
    },
    shippingOptionId: "",
  });

  assert.equal(result.valid, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.some((error) => error.includes("email")));
  assert.ok(result.errors.some((error) => error.includes("shipping option")));
});
