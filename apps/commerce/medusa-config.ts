import { defineConfig } from "@medusajs/framework/utils";
import { loadCommerceEnvironment } from "./src/config/environment.ts";

loadCommerceEnvironment();

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

const workerModes = ["shared", "server", "worker"] as const;
type WorkerMode = (typeof workerModes)[number];
const configuredWorkerMode = process.env.MEDUSA_WORKER_MODE ?? "shared";
if (!workerModes.includes(configuredWorkerMode as WorkerMode)) {
  throw new Error("MEDUSA_WORKER_MODE must be one of: shared, server, worker.");
}
const workerMode = configuredWorkerMode as WorkerMode;

const redisUrl = configured("REDIS_URL", "redis://localhost:6379");

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { redisUrl },
    },
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: { redisUrl },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: { redis: { redisUrl } },
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            id: "locking-redis",
            resolve: "@medusajs/medusa/locking-redis",
            is_default: true,
            options: { redisUrl },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: { providers: stripeProvider ? [stripeProvider] : [] },
    },
  ],
  projectConfig: {
    workerMode,
    databaseUrl: configured(
      "DATABASE_URL",
      "postgresql://postgres:replace-for-local-development@localhost:5432/fenomena",
    ),
    redisUrl,
    redisPrefix: process.env.REDIS_PREFIX ?? "medusa:",
    http: {
      storeCors: process.env.STORE_CORS ?? "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS ?? "http://localhost:9000",
      authCors: process.env.AUTH_CORS ?? "http://localhost:3000,http://localhost:9000",
      jwtSecret: configured("JWT_SECRET", "local-only-jwt-secret-change-before-use"),
      cookieSecret: configured("COOKIE_SECRET", "local-only-cookie-secret-change-before-use"),
    },
  },
});
