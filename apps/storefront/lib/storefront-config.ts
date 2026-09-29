import { safeHttpUrl } from "./safe-url";

export function getStorefrontConfig() {
  return {
    siteUrl: safeHttpUrl(process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL),
    whatsappPhone: process.env.WHATSAPP_PHONE_NUMBER,
  };
}
