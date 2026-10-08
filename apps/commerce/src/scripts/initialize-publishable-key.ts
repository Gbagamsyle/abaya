import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { ensurePublishableKey } from "./publishable-key-initializer.ts";

const SALES_CHANNEL_NAME = "Fenomena Storefront";
const PUBLISHABLE_KEY_TITLE = "Fenomena Storefront";

export default async function initializePublishableKey({
  container,
}: {
  container: MedusaContainer;
}) {
  if (process.env.ALLOW_PUBLISHABLE_KEY_INITIALIZATION !== "true") {
    throw new Error(
      "Set ALLOW_PUBLISHABLE_KEY_INITIALIZATION=true to explicitly allow storefront key/channel initialization.",
    );
  }

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const apiKeyModule = container.resolve(Modules.API_KEY);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const salesChannels = await salesChannelModule.listSalesChannels({ name: SALES_CHANNEL_NAME });
  if (salesChannels.length > 1) {
    throw new Error("Multiple Fenomena Storefront sales channels exist; refusing to choose one.");
  }
  let salesChannel = salesChannels[0];
  if (!salesChannel) {
    salesChannel = (
      await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [
            { name: SALES_CHANNEL_NAME, description: "Development storefront" },
          ],
        },
      })
    ).result[0];
  }
  if (!salesChannel) throw new Error("Fenomena Storefront sales channel was not created.");

  const result = await ensurePublishableKey({
    listKeys: async () =>
      apiKeyModule.listApiKeys({ title: PUBLISHABLE_KEY_TITLE, type: "publishable" }),
    createKey: async () =>
      (
        await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              { type: "publishable", title: PUBLISHABLE_KEY_TITLE, created_by: "initializer" },
            ],
          },
        })
      ).result[0],
    isLinkedToSalesChannel: async (keyId) => {
      const { data } = await query.graph({
        entity: "sales_channels",
        fields: ["id", "publishable_api_keys.id"],
        filters: { id: salesChannel.id },
      });
      const linkedKeys = (
        data[0] as { publishable_api_keys?: Array<{ id: string }> } | undefined
      )?.publishable_api_keys;
      return linkedKeys?.some((key) => key.id === keyId) ?? false;
    },
    linkToSalesChannel: async (keyId) => {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: keyId, add: [salesChannel.id], remove: [] },
      });
    },
  });

  console.log(
    JSON.stringify(
      {
        salesChannelId: salesChannel.id,
        publishableKeyId: result.key.id,
        keyCreated: result.created,
        linkedToSalesChannel: result.linked,
      },
      null,
      2,
    ),
  );
}