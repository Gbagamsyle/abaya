export const LUNA_COMMERCE_INTEGRATION_KEY = "fenomena:luna-abaya";

type IdentifiedProduct = { id: string; external_id?: string | null };

type ResolveProductIdentityDependencies<T extends IdentifiedProduct> = {
  findByExternalId: () => Promise<T[]>;
  findLegacyByHandle: () => Promise<T[]>;
  adoptExternalId: (productId: string, externalId: string) => Promise<void>;
  create: (externalId: string) => Promise<T>;
};

export async function resolveProductIdByExternalId<T extends IdentifiedProduct>(
  dependencies: ResolveProductIdentityDependencies<T>,
  externalId = LUNA_COMMERCE_INTEGRATION_KEY,
): Promise<string> {
  const matches = await dependencies.findByExternalId();
  if (matches.length > 1) {
    throw new Error("Multiple Medusa products use the Luna commerce integration key.");
  }
  if (matches[0]) return matches[0].id;

  const legacyMatches = await dependencies.findLegacyByHandle();
  if (legacyMatches.length > 1) {
    throw new Error("Multiple Medusa products use the legacy Luna handle.");
  }

  const legacyProduct = legacyMatches[0];
  if (legacyProduct) {
    if (legacyProduct.external_id && legacyProduct.external_id !== externalId) {
      throw new Error("The legacy Luna product already has a different external identity.");
    }
    if (!legacyProduct.external_id) {
      await dependencies.adoptExternalId(legacyProduct.id, externalId);
    }
    return legacyProduct.id;
  }

  const createdProduct = await dependencies.create(externalId);
  return createdProduct.id;
}