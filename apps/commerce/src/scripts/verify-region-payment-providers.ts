import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const REGION_NAME = "Malaysia";

export default async function verifyRegionPaymentProviders({
  container,
}: {
  container: MedusaContainer;
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "regions",
    fields: ["id", "name", "payment_providers.id", "payment_providers.is_enabled"],
    filters: { name: REGION_NAME },
    pagination: { take: 10 },
  });

  const regions = (Array.isArray(data) ? data : []).filter(
    (region): region is { id: string; name?: string; payment_providers?: Array<{ id?: string; is_enabled?: boolean }> } =>
      !!region && typeof region.id === "string",
  );

  if (!regions.length) {
    console.log(
      JSON.stringify(
        {
          region: REGION_NAME,
          found: false,
          payment_providers: [],
          status: "missing-region",
        },
        null,
        2,
      ),
    );
    return;
  }

  const region = regions[0];
  const paymentProviders = (region.payment_providers ?? [])
    .map((provider) => provider.id)
    .filter((id): id is string => Boolean(id));

  console.log(
    JSON.stringify(
      {
        region: region.name ?? REGION_NAME,
        id: region.id,
        found: true,
        payment_providers: paymentProviders,
        has_system_provider: paymentProviders.includes("pp_system"),
        has_default_system_provider: paymentProviders.includes("pp_system_default"),
        has_stripe_provider: paymentProviders.includes("pp_stripe_stripe"),
      },
      null,
      2,
    ),
  );
}
