export function formatPrice(amount: number, currencyCode: string, locale = "en"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount);
}

export function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clampQuantity(value: number, minimum: number, maximum: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum > maximum
  ) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function selectSize<T extends string>(
  requestedSize: T,
  availableSizes: readonly T[],
): T | undefined {
  return availableSizes.includes(requestedSize) ? requestedSize : undefined;
}

export function safeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
