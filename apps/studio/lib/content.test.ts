import test from "node:test";
import assert from "node:assert/strict";

import { getSectionSummary, hasCommerceReference, isValidUrl } from "./content";

test("isValidUrl accepts HTTPS URLs and rejects malformed ones", () => {
  assert.equal(isValidUrl("https://example.com/collection"), true);
  assert.equal(isValidUrl("not-a-url"), false);
  assert.equal(isValidUrl("ftp://example.com"), false);
});

test("hasCommerceReference requires a stable Medusa identifier", () => {
  assert.equal(hasCommerceReference("prod_123"), true);
  assert.equal(hasCommerceReference(""), false);
  assert.equal(hasCommerceReference("   "), false);
});

test("getSectionSummary trims and normalizes the section title", () => {
  assert.equal(getSectionSummary("  Featured collection  "), "Featured collection");
  assert.equal(getSectionSummary(""), "Untitled section");
});
