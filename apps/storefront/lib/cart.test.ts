import assert from "node:assert/strict";
import test from "node:test";
import { cartItemCount, formatMoney } from "./cart-types";
import { transformCart } from "./cart-server";

test("cart count sums quantities rather than distinct line items", () => {
  assert.equal(cartItemCount({ items: [{ quantity: 2 }, { quantity: 3 }] } as never), 5);
});

test("money formatting preserves MYR without arithmetic conversion", () => {
  assert.match(formatMoney({ amount: 259, currency: "MYR" }), /259/);
  assert.match(formatMoney({ amount: 259, currency: "MYR" }), /RM|MYR/);
});

test("Medusa cart transformation preserves authoritative line and cart totals", () => {
  const cart = transformCart({
    id: "cart_1",
    currency_code: "myr",
    subtotal: 51800,
    item_subtotal: 51800,
    shipping_total: 0,
    total: 51800,
    items: [
      {
        id: "li_1",
        variant_id: "variant_1",
        product_title: "Luna",
        title: "Baby Blue / 56",
        quantity: 2,
        unit_price: 25900,
        subtotal: 51800,
        total: 51800,
        variant: {
          title: "Baby Blue / 56",
          options: [{ option: { title: "Colour" }, value: "Baby Blue" }],
        },
      },
    ],
  });
  assert.equal(cart.items[0]?.options.Colour, "Baby Blue");
  assert.equal(cart.items[0]?.total.amount, 518);
  assert.equal(cart.subtotal.amount, 518);
  assert.equal(cart.itemSubtotal.amount, 518);
  assert.equal(cart.shippingTotal.amount, 0);
  assert.equal(cart.itemCount, 2);
});

test("Medusa cart transformation preserves shipping-inclusive totals without recomputing", () => {
  const cart = transformCart({
    id: "cart_with_shipping",
    currency_code: "myr",
    subtotal: 20000,
    item_subtotal: 18500,
    shipping_total: 1500,
    total: 20000,
    items: [],
  });

  assert.equal(cart.itemSubtotal.amount, 185);
  assert.equal(cart.shippingTotal.amount, 15);
  assert.equal(cart.total.amount, 200);
});
