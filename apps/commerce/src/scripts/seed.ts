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
  updateProductOptionsWorkflow,
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
  const pricingModule = container.resolve(Modules.PRICING);
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
      { relations: ["options", "variants", "variants.inventory_items"] },
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
  const hasRequestedMatrix =
    currentVariants.length === variantStock.length &&
    currentVariants.every((variant) =>
      variantStock.some(
        (item) =>
          variant.sku === `LUNA-${item.colour.replaceAll(" ", "-").toUpperCase()}-${item.size}`,
      ),
    );
  if (!hasRequestedMatrix) {
    await productModule.deleteProductVariants(currentVariants.map((variant) => variant.id));
    const colourOption = product.options?.find((option) => option.title === "Colour");
    const sizeOption = product.options?.find((option) => option.title === "Size");
    if (!colourOption || !sizeOption) throw new Error("Luna product options are incomplete.");
    const colourValues = colourOption.values ?? [];
    const legacyOat = colourValues.find((value) => value.value === "Oat");
    if (legacyOat) {
      await updateProductOptionValuesWorkflow(container).run({
        input: { id: legacyOat.id, update: { value: "Rich Brown" } },
      });
    }
    await updateProductOptionsWorkflow(container).run({
      input: {
        selector: { id: colourOption.id },
        update: { values: colours },
      },
    });
    await updateProductOptionsWorkflow(container).run({
      input: {
        selector: { id: sizeOption.id },
        update: { values: sizes },
      },
    });
    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantStock.map((variant) => ({
          product_id: product.id,
          title: `Luna Abaya - ${variant.colour} / ${variant.size}`,
          sku: `LUNA-${variant.colour.replaceAll(" ", "-").toUpperCase()}-${variant.size}`,
          options: { Colour: variant.colour, Size: variant.size },
          prices: [{ amount: 18500, currency_code: "myr" }],
          manage_inventory: true,
          allow_backorder: false,
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
      { relations: ["options", "variants", "variants.inventory_items"] },
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

  for (const priceSet of await pricingModule.listPriceSets({}, { relations: ["prices"] })) {
    const prices =
      (
        priceSet as unknown as {
          prices?: Array<{ id: string; amount?: number; currency_code?: string }>;
        }
      ).prices ?? [];
    const developmentPrices = prices.filter(
      (price) => price.currency_code === "myr" && Number(price.amount) === 26000,
    );
    if (developmentPrices.length) {
      await pricingModule.updatePriceSets(priceSet.id, {
        prices: developmentPrices.map((price) => ({
          id: price.id,
          amount: 18500,
          currency_code: "myr",
        })),
      });
    }
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
