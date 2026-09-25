import { defineConfig } from "@medusajs/framework/utils";

const configured = (name: string, localFallback: string): string => {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return localFallback;
};

export default defineConfig({
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
