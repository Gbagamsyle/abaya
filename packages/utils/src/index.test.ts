import assert from "node:assert/strict";
import test from "node:test";
import { formatPrice, toSlug } from "./index";

test("toSlug normalizes unicode, punctuation, and whitespace", () => {
  assert.equal(toSlug("  Café Luna — Abaya! "), "cafe-luna-abaya");
});

test("toSlug returns an empty slug for punctuation-only input", () => {
  assert.equal(toSlug("!? --"), "");
});

test("formatPrice formats a Malaysian ringgit amount", () => {
  assert.match(formatPrice(185, "MYR"), /185\.00/);
});
