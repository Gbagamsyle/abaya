import assert from "node:assert/strict";
import test from "node:test";

import { buildSeedVariantPlan } from "./seed.ts";

test("seed preserves existing variants and inventory by reusing stable SKUs instead of deleting the matrix", () => {
  const currentVariants = [
    {
      id: "existing-blue-52",
      sku: "LUNA-BABY-BLUE-52",
      title: "Luna Abaya - Baby Blue / 52",
      inventory_items: [{ inventory_item_id: "inv-blue-52" }],
    },
    {
      id: "existing-brown-52",
      sku: "LUNA-RICH-BROWN-52",
      title: "Luna Abaya - Rich Brown / 52",
      inventory_items: [{ inventory_item_id: "inv-brown-52" }],
    },
  ];

  const result = buildSeedVariantPlan(currentVariants, [
    { colour: "Baby Blue", size: "52", stock: 4 },
    { colour: "Rich Brown", size: "52", stock: 0 },
    { colour: "Silver Grey", size: "52", stock: 1 },
  ]);

  assert.deepEqual(result.missingVariantSkus, ["LUNA-SILVER-GREY-52"]);
  assert.equal(result.deleteExistingVariants, false);
  assert.deepEqual(result.existingVariantSkus, ["LUNA-BABY-BLUE-52", "LUNA-RICH-BROWN-52"]);
  assert.equal(result.inventoryOnlyForNewVariants, false);
});
