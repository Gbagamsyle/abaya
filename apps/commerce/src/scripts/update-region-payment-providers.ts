import { updateRegionsWorkflow } from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const REGION_NAME = "Malaysia";
const DESIRED_PAYMENT_PROVIDERS = ["pp_system"];

function normalizeProviders(value: Array<string | undefined | null>) {
  return [...new Set(value.filter((item): item is string => Boolean(item)))];
}

export default async function updateRegionPaymentProviders({
  container,
}: {
  container: MedusaContainer;
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "regions",
    fields: ["id", "name", "payment_providers.id"],
    filters: { name: REGION_NAME },
    pagination: { take: 10 },
  });

  const regions = (Array.isArray(data) ? data : []).filter(
    (region): region is { id: string; name?: string; payment_providers?: Array<{ id?: string }> } =>
      !!region && typeof region.id === "string",
  );

  if (!regions.length) {
    throw new Error(`No region named ${REGION_NAME} was found.`);
  }

  const region = regions[0];
  const currentProviders = normalizeProviders(
    (region.payment_providers ?? []).map((provider) => provider.id),
  );
  const hasDesiredProviders = DESIRED_PAYMENT_PROVIDERS.every((provider) =>
    currentProviders.includes(provider),
  );
  const hasStaleStripeProvider = currentProviders.includes("pp_stripe_stripe");
  const needsUpdate = !hasDesiredProviders || hasStaleStripeProvider;
  const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

  console.log(
    JSON.stringify(
      {
        region: region.name ?? REGION_NAME,
        region_id: region.id,
        current_payment_providers: currentProviders,
        desired_payment_providers: DESIRED_PAYMENT_PROVIDERS,
        has_desired_providers: hasDesiredProviders,
        has_stale_stripe_provider: hasStaleStripeProvider,
        needs_update: needsUpdate,
        dry_run: dryRun,
      },
      null,
      2,
    ),
  );

  if (!needsUpdate) {
    console.log("No region payment-provider update required.");
    return;
  }

  if (dryRun) {
    console.log("Dry run only: no database write performed.");
    return;
  }

  if (process.env.ALLOW_REGION_PAYMENT_PROVIDER_UPDATE !== "true") {
    throw new Error(
      "Set ALLOW_REGION_PAYMENT_PROVIDER_UPDATE=true to update the Malaysia region payment providers.",
    );
  }

  const result = await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: { payment_providers: DESIRED_PAYMENT_PROVIDERS },
    },
  });

  console.log(
    JSON.stringify(
      {
        updated: true,
        region_id: region.id,
        result,
      },
      null,
      2,
    ),
  );
}
