import {
  createApiKeysWorkflow,
  createInventoryItemsWorkflow,
  createInventoryLevelsWorkflow,
  createProductVariantsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductOptionValuesWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const REGION_NAME = "Malaysia";
const SALES_CHANNEL_NAME = "Fenomena Storefront";
const STOCK_LOCATION_NAME = "Fenomena Main Stock";
const PRODUCT_HANDLE = "luna-abaya";
const PUBLISHABLE_KEY_TITLE = "Fenomena Storefront";

const colours = ["Baby Blue", "Rich Brown", "Silver Grey"];
const sizes = ["52", "54", "56", "58", "60"];
const variantStock = colours.flatMap((colour, colourIndex) =>
  sizes.map((size, sizeIndex) => ({
    colour,
    size,
    stock: colourIndex === 0 && sizeIndex === 0 ? 4 : colourIndex + sizeIndex + 1,
  })),
);
variantStock[1].stock = 0;

type SeedContext = { container: MedusaContainer };

async function firstOrCreate<T>(
  existing: () => Promise<T | undefined>,
  create: () => Promise<T>,
): Promise<T> {
  return (await existing()) ?? create();
}

export default async function seed({ container }: SeedContext) {
  const regionModule = container.resolve(Modules.REGION);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const productModule = container.resolve(Modules.PRODUCT);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const inventoryModule = container.resolve(Modules.INVENTORY);
  const apiKeyModule = container.resolve(Modules.API_KEY);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  const region = await firstOrCreate(
    async () => (await regionModule.listRegions({ name: REGION_NAME }))[0],
    async () =>
      (
        await createRegionsWorkflow(container).run({
          input: { regions: [{ name: REGION_NAME, currency_code: "myr", countries: ["my"] }] },
        })
      ).result[0],
  );
  const salesChannel = await firstOrCreate(
    async () => (await salesChannelModule.listSalesChannels({ name: SALES_CHANNEL_NAME }))[0],
    async () =>
      (
        await createSalesChannelsWorkflow(container).run({
          input: {
            salesChannelsData: [
              { name: SALES_CHANNEL_NAME, description: "Development storefront" },
            ],
          },
        })
      ).result[0],
  );
  const stockLocation = await firstOrCreate(
    async () => (await stockLocationModule.listStockLocations({ name: STOCK_LOCATION_NAME }))[0],
    async () =>
      (
        await createStockLocationsWorkflow(container).run({
          input: {
            locations: [
              {
                name: STOCK_LOCATION_NAME,
                address: {
                  address_1: "Development only",
                  city: "Kuala Lumpur",
                  country_code: "my",
                },
              },
            ],
          },
        })
      ).result[0],
  );
  const shippingProfile = await firstOrCreate(
    async () => (await fulfillmentModule.listShippingProfiles({ type: "default" }))[0],
    async () => fulfillmentModule.createShippingProfiles({ name: "Default", type: "default" }),
  );

  let product = (
    await productModule.listProducts(
      { handle: PRODUCT_HANDLE },
      { relations: ["options", "options.values", "variants", "variants.inventory_items"] },
    )
  )[0];
  if (!product) {
    product = (
      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Luna Abaya",
              handle: PRODUCT_HANDLE,
              description: "Development catalogue product for storefront integration.",
              status: "published",
              options: [
                { title: "Colour", values: colours },
                { title: "Size", values: sizes },
              ],
              variants: variantStock.map((variant) => ({
                title: `Luna Abaya - ${variant.colour} / ${variant.size}`,
                sku: `LUNA-${variant.colour.replace(" ", "-").toUpperCase()}-${variant.size}`,
                options: { Colour: variant.colour, Size: variant.size },
                prices: [{ amount: 18500, currency_code: "myr" }],
                manage_inventory: true,
                allow_backorder: false,
              })),
              shipping_profile_id: shippingProfile.id,
            },
          ],
        },
      })
    ).result[0];
  }

  const currentVariants = product.variants ?? [];
  const colourOption = product.options?.find((option) => option.title === "Colour");
  const sizeOption = product.options?.find((option) => option.title === "Size");
  if (!colourOption || !sizeOption) throw new Error("Luna product options are incomplete.");

  const expectedSkus = new Set(
    variantStock.map(
      (item) => `LUNA-${item.colour.replaceAll(" ", "-").toUpperCase()}-${item.size}`,
    ),
  );
  const currentSkus = currentVariants.map((variant) => variant.sku);
  const hasRequestedMatrix =
    currentVariants.length === expectedSkus.size &&
    currentSkus.every((sku): sku is string => Boolean(sku)) &&
    new Set(currentSkus).size === expectedSkus.size &&
    currentSkus.every((sku) => expectedSkus.has(sku));

  const legacyOat = colourOption.values?.find((value) => value.value === "Oat");
  if (legacyOat) {
    if (colourOption.values?.some((value) => value.value === "Rich Brown")) {
      throw new Error("Cannot safely replace Luna Oat because Rich Brown already exists.");
    }
    await updateProductOptionValuesWorkflow(container).run({
      input: { id: legacyOat.id, update: { value: "Rich Brown" } },
    });
    console.info(
      "Renamed the legacy Luna Oat option. Re-run the development seed to add variants.",
    );
    return;
  }

  const currentColours = new Set((colourOption.values ?? []).map((value) => value.value));
  const currentSizes = new Set((sizeOption.values ?? []).map((value) => value.value));
  const hasOnlyAllowedOptionValues =
    [...currentColours].every((colour) => colours.includes(colour)) &&
    [...currentSizes].every((size) => sizes.includes(size));
  const hasExactOptionValues =
    currentColours.size === colours.length &&
    colours.every((colour) => currentColours.has(colour)) &&
    currentSizes.size === sizes.length &&
    sizes.every((size) => currentSizes.has(size));

  if (!hasOnlyAllowedOptionValues) {
    throw new Error("Luna has an unsupported option value; refusing to delete associated values.");
  }

  if (hasRequestedMatrix && !hasExactOptionValues) {
    throw new Error("Luna has the expected SKUs but its product option values do not match.");
  }

  if (!hasRequestedMatrix) {
    await productModule.deleteProductVariants(currentVariants.map((variant) => variant.id));
    if (!hasExactOptionValues) {
      await productModule.updateProductOptionValuesOnProduct([
        {
          product_id: product.id,
          product_option_id: colourOption.id,
          add: colours.filter((colour) => !currentColours.has(colour)).map((value) => ({ value })),
        },
        {
          product_id: product.id,
          product_option_id: sizeOption.id,
          add: sizes.filter((size) => !currentSizes.has(size)).map((value) => ({ value })),
        },
      ]);
      console.info("Added Luna option values. Re-run the development seed to create variants.");
      return;
    }
    const variantsToCreate = await Promise.all(
      variantStock.map(async (variant) => {
        const sku = `LUNA-${variant.colour.replaceAll(" ", "-").toUpperCase()}-${variant.size}`;
        const existingInventoryItem = (await inventoryModule.listInventoryItems({ sku }))[0];
        return {
          title: `Luna Abaya - ${variant.colour} / ${variant.size}`,
          sku,
          options: { Colour: variant.colour, Size: variant.size },
          prices: [{ amount: 18500, currency_code: "myr" }],
          manage_inventory: true,
          allow_backorder: false,
          inventory_items: existingInventoryItem
            ? [{ inventory_item_id: existingInventoryItem.id, required_quantity: 1 }]
            : [],
        };
      }),
    );
    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantsToCreate.map((variant) => ({
          product_id: product.id,
          ...variant,
        })),
      },
    });
  }

  await linkProductsToSalesChannelWorkflow(container).run({
    input: { id: salesChannel.id, add: [product.id], remove: [] },
  });
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id], remove: [] },
  });

  const productWithVariants = (
    await productModule.listProducts(
      { id: product.id },
      { relations: ["options", "options.values", "variants", "variants.inventory_items"] },
    )
  )[0];
  const inventoryLevels = [];
  for (const variant of productWithVariants.variants ?? []) {
    let inventoryItem = (
      variant as unknown as {
        inventory_items?: Array<{ inventory_item_id: string }>;
      }
    ).inventory_items?.[0];
    const stock =
      variantStock.find(
        (item) =>
          variant.sku?.endsWith(`-${item.size}`) &&
          variant.sku?.includes(item.colour.replace(" ", "-").toUpperCase()),
      )?.stock ?? 0;
    if (!inventoryItem && variant.sku) {
      const existing = (await inventoryModule.listInventoryItems({ sku: variant.sku }))[0];
      if (existing) {
        inventoryItem = { inventory_item_id: existing.id };
        await remoteLink.create([
          {
            [Modules.PRODUCT]: { variant_id: variant.id },
            [Modules.INVENTORY]: { inventory_item_id: existing.id },
            data: { required_quantity: 1 },
          },
        ]);
      }
    }
    if (!inventoryItem) {
      const created = (
        await createInventoryItemsWorkflow(container).run({
          input: {
            items: [
              {
                sku: variant.sku ?? undefined,
                title: variant.title,
                location_levels: [{ location_id: stockLocation.id }],
              },
            ],
          },
        })
      ).result[0];
      await remoteLink.create([
        {
          [Modules.PRODUCT]: { variant_id: variant.id },
          [Modules.INVENTORY]: { inventory_item_id: created.id },
          data: { required_quantity: 1 },
        },
      ]);
      inventoryLevels.push({
        inventory_item_id: created.id,
        location_id: stockLocation.id,
        stocked_quantity: stock,
      });
      continue;
    }
    const current = (
      await inventoryModule.listInventoryLevels({
        inventory_item_id: inventoryItem.inventory_item_id,
        location_id: stockLocation.id,
      })
    )[0];
    if (current) {
      await inventoryModule.updateInventoryLevels({
        id: current.id,
        inventory_item_id: inventoryItem.inventory_item_id,
        location_id: stockLocation.id,
        stocked_quantity: stock,
      });
    } else {
      inventoryLevels.push({
        inventory_item_id: inventoryItem.inventory_item_id,
        location_id: stockLocation.id,
        stocked_quantity: stock,
      });
    }
  }
  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    });
  }

  let publishableKey = (
    await apiKeyModule.listApiKeys({ title: PUBLISHABLE_KEY_TITLE, type: "publishable" })
  )[0];
  if (!publishableKey) {
    publishableKey = (
      await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [{ type: "publishable", title: PUBLISHABLE_KEY_TITLE, created_by: "seed" }],
        },
      })
    ).result[0];
  }
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableKey.id, add: [salesChannel.id], remove: [] },
  });

  console.log(
    JSON.stringify(
      {
        regionId: region.id,
        salesChannelId: salesChannel.id,
        stockLocationId: stockLocation.id,
        productId: product.id,
        publishableKey: publishableKey.token,
        storefrontEnv: {
          MEDUSA_REGION_ID: region.id,
          MEDUSA_PUBLISHABLE_KEY: publishableKey.token,
        },
      },
      null,
      2,
    ),
  );
}
