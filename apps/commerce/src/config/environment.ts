import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

export type DatabaseTarget = {
  host: string;
  port: number;
  database: string;
};

export function loadCommerceEnvironment(
  options: { cwd?: string; processEnv?: NodeJS.ProcessEnv } = {},
): void {
  loadDotenv({
    path: resolve(options.cwd ?? process.cwd(), "../../.env"),
    override: false,
    processEnv: options.processEnv ?? process.env,
    quiet: true,
  });
}

export function getDatabaseTarget(databaseUrl: string): DatabaseTarget {
  const parsed = new URL(databaseUrl);
  const defaultPort = parsed.protocol === "postgres:" || parsed.protocol === "postgresql:" ? 5432 : 0;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : defaultPort,
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  };
}