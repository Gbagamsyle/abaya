export function isValidUrl(value: string | undefined): boolean {
  if (!value || !value.trim()) return false;

  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch {
    return false;
  }
}

export function hasCommerceIntegrationKey(value: string | undefined): boolean {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/.test(value.trim())
  );
}

export function getSectionSummary(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Untitled section";
}
