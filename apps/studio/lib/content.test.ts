import test from "node:test";
import assert from "node:assert/strict";

import { getSectionSummary, hasCommerceIntegrationKey, isValidUrl } from "./content";

test("isValidUrl accepts HTTPS URLs and rejects malformed ones", () => {
  assert.equal(isValidUrl("https://example.com/collection"), true);
  assert.equal(isValidUrl("not-a-url"), false);
  assert.equal(isValidUrl("ftp://example.com"), false);
});

test("hasCommerceIntegrationKey requires a stable namespaced identity", () => {
  assert.equal(hasCommerceIntegrationKey("fenomena:luna-abaya"), true);
  assert.equal(hasCommerceIntegrationKey("prod_01ABC"), false);
  assert.equal(hasCommerceIntegrationKey(""), false);
  assert.equal(hasCommerceIntegrationKey("   "), false);
});

test("getSectionSummary trims and normalizes the section title", () => {
  assert.equal(getSectionSummary("  Featured collection  "), "Featured collection");
  assert.equal(getSectionSummary(""), "Untitled section");
});
