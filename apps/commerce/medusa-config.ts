import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "@medusajs/framework/utils";

loadEnv({ path: resolve(process.cwd(), "../../.env"), override: false });

const configured = (name: string, localFallback: string): string => {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return localFallback;
};

const stripeApiKey = process.env.STRIPE_API_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (stripeApiKey && !stripeApiKey.startsWith("sk_test_")) {
  throw new Error("M7 accepts Stripe test-mode API keys only.");
}
if (stripeApiKey && !stripeWebhookSecret?.startsWith("whsec_")) {
  throw new Error("Set STRIPE_WEBHOOK_SECRET from the local Stripe CLI listener.");
}

const stripeProvider = stripeApiKey
  ? {
      resolve: "@medusajs/medusa/payment-stripe",
      id: "stripe",
      options: {
        apiKey: stripeApiKey,
        webhookSecret: stripeWebhookSecret,
        capture: false,
      },
    }
  : undefined;

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: { providers: stripeProvider ? [stripeProvider] : [] },
    },
  ],
  projectConfig: {
    databaseUrl: configured(
      "DATABASE_URL",
      "postgresql://postgres:replace-for-local-development@localhost:5432/fenomena",
    ),
    http: {
      storeCors: process.env.STORE_CORS ?? "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS ?? "http://localhost:9000",
      authCors: process.env.AUTH_CORS ?? "http://localhost:3000,http://localhost:9000",
      jwtSecret: configured("JWT_SECRET", "local-only-jwt-secret-change-before-use"),
      cookieSecret: configured("COOKIE_SECRET", "local-only-cookie-secret-change-before-use"),
    },
  },
});
