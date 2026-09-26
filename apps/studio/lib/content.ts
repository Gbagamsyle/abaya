export function isValidUrl(value: string | undefined): boolean {
  if (!value || !value.trim()) return false;

  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch {
    return false;
  }
}

export function hasCommerceReference(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getSectionSummary(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Untitled section";
}
