import assert from "node:assert/strict";
import test from "node:test";
import { clampQuantity, formatPrice, safeExternalUrl, selectSize, toSlug } from "./index";

test("toSlug normalizes unicode, punctuation, and whitespace", () => {
  assert.equal(toSlug("  Café Luna — Abaya! "), "cafe-luna-abaya");
});

test("toSlug returns an empty slug for punctuation-only input", () => {
  assert.equal(toSlug("!? --"), "");
});

test("formatPrice formats a Malaysian ringgit amount", () => {
  assert.match(formatPrice(185, "MYR"), /185\.00/);
});

test("clampQuantity enforces both quantity bounds", () => {
  assert.equal(clampQuantity(0, 1, 5), 1);
  assert.equal(clampQuantity(8, 1, 5), 5);
  assert.equal(clampQuantity(3, 1, 5), 3);
});

test("clampQuantity handles invalid values and invalid bounds safely", () => {
  assert.equal(clampQuantity(Number.NaN, 1, 5), 1);
  assert.equal(clampQuantity(4, 5, 2), 5);
});

test("selectSize only returns a size present in the available options", () => {
  const sizes = ["S", "M", "L"] as const;
  assert.equal(selectSize("M", sizes), "M");
  assert.equal(selectSize("XL", sizes), undefined);
});

test("safeExternalUrl accepts only credential-free HTTP(S) URLs", () => {
  assert.equal(safeExternalUrl("https://example.test/post"), "https://example.test/post");
  assert.equal(safeExternalUrl("javascript:alert(1)"), undefined);
  assert.equal(safeExternalUrl("https://user:secret@example.test"), undefined);
  assert.equal(safeExternalUrl("not a URL"), undefined);
});
