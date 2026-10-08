import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDirectInitializationPoolConfig,
  executeDirectInitialization,
  inspectDirectInitializationPlan,
  resolveVercelTransferConfig,
  transferKeyToVercel,
} from "./direct-publishable-key-initializer.ts";

function makePoolForPlan({
  channelRows = [],
  keyRows = [],
  associationRows = [],
  sqlLog = [],
}: {
  channelRows?: Array<{ id: string; name: string; is_disabled: boolean; deleted_at?: Date | null }>;
  keyRows?: Array<{ id: string; title: string; revoked_at: Date | string | null; deleted_at: Date | string | null }>;
  associationRows?: Array<{ publishable_key_id: string; sales_channel_id: string }>;
  sqlLog?: string[];
}) {
  const client = {
    query: async (sql: string) => {
      sqlLog.push(sql);
      if (sql.includes("FROM sales_channel")) {
        return { rows: channelRows };
      }
      if (sql.includes("FROM api_key")) {
        return { rows: keyRows };
      }
      if (sql.includes("FROM publishable_api_key_sales_channel")) {
        return { rows: associationRows };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    connect: async () => client,
    end: async () => {},
  } as never;
}

test("dry run reports intended changes without writing to the database", async () => {
  const result = await executeDirectInitialization({
    pool: makePoolForPlan({}),
    dryRun: true,
    allowWrite: false,
    write: async () => {
      throw new Error("write should not run in dry-run mode");
    },
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.salesChannelCreated, false);
  assert.equal(result.keyCreated, false);
  assert.equal(result.wouldCreateSalesChannel, true);
  assert.equal(result.wouldCreateKey, true);
  assert.equal(result.wouldLinkKey, false);
  assert.equal(result.linkPrerequisitesMet, false);
  assert.equal(result.writeAttempted, false);
});

test("dry run never starts a transaction or executes write SQL", async () => {
  const sqlLog: string[] = [];

  const result = await executeDirectInitialization({
    pool: makePoolForPlan({ sqlLog }),
    dryRun: true,
    allowWrite: false,
    write: async () => {
      throw new Error("write should not run in dry-run mode");
    },
  });

  assert.equal(result.status, "dry-run");
  assert.equal(sqlLog.some((sql) => /BEGIN|COMMIT|ROLLBACK/.test(sql)), false);
  assert.equal(sqlLog.some((sql) => /FOR UPDATE/.test(sql)), false);
  assert.equal(sqlLog.some((sql) => /INSERT INTO (sales_channel|api_key|publishable_api_key_sales_channel)/.test(sql)), false);
  assert.equal(sqlLog.some((sql) => /pg_advisory/.test(sql)), false);
});

test("missing authorization stops a write before any database mutation", async () => {
  await assert.rejects(
    executeDirectInitialization({
      pool: makePoolForPlan({}),
      dryRun: false,
      allowWrite: false,
      write: async () => ({ salesChannelId: "sc_test", salesChannelCreated: true, keyCreated: true, linkedToStorefrontChannel: true }),
    }),
    /ALLOW_PUBLISHABLE_KEY_INITIALIZATION=true/,
  );
});

test("existing records are treated as already present and no writes are attempted", async () => {
  const result = await executeDirectInitialization({
    pool: makePoolForPlan({
      channelRows: [{ id: "sc_storefront", name: "Fenomena Storefront", is_disabled: false }],
      keyRows: [{ id: "apk_storefront", title: "Fenomena Storefront", revoked_at: null, deleted_at: null }],
      associationRows: [{ publishable_key_id: "apk_storefront", sales_channel_id: "sc_storefront" }],
    }),
    dryRun: false,
    allowWrite: true,
    write: async () => {
      throw new Error("write should not run when the records already exist");
    },
  });

  assert.equal(result.status, "already-present");
  assert.equal(result.writeAttempted, false);
  assert.equal(result.keyCreated, false);
  assert.equal(result.salesChannelCreated, false);
});

test("duplicate records are rejected before any write", async () => {
  await assert.rejects(
    inspectDirectInitializationPlan(
      makePoolForPlan({
        channelRows: [
          { id: "sc_one", name: "Fenomena Storefront", is_disabled: false },
          { id: "sc_two", name: "Fenomena Storefront", is_disabled: false },
        ],
      }),
    ),
    /Multiple Fenomena Storefront sales channels exist/,
  );
});

test("successful initialization creates the missing storefront channel and key once and links them", async () => {
  const result = await executeDirectInitialization({
    pool: makePoolForPlan({}),
    dryRun: false,
    allowWrite: true,
    write: async () => ({
      salesChannelId: "sc_new",
      salesChannelCreated: true,
      keyCreated: true,
      linkedToStorefrontChannel: true,
      newKeyToken: "pk_success_token_123",
    }),
  });

  assert.equal(result.status, "initialized");
  assert.equal(result.writeAttempted, true);
  assert.equal(result.keyCreated, true);
  assert.equal(result.salesChannelCreated, true);
  assert.equal(result.newKeyToken, "pk_success_token_123");
});

test("pool config overrides only the host and port for the SSH tunnel while preserving Railway credentials", () => {
  const config = createDirectInitializationPoolConfig(
    "postgresql://user:password@postgres.railway.internal:5432/railway",
    { PGHOST: "127.0.0.1", PGPORT: "55432" },
  );

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 55432);
  assert.equal(config.database, "railway");
  assert.equal(config.user, "user");
  assert.equal(config.password, "password");
});

test("powerShell workflow avoids a pwsh dependency in the direct initializer chain", async () => {
  const root = path.resolve(__dirname, "../..");
  const wrapper = await readFile(path.join(root, "scripts", "initialize-publishable-key-direct.ps1"), "utf8");
  const runner = await readFile(path.join(root, "scripts", "run-direct-publishable-key-initializer.ps1"), "utf8");

  assert.equal(wrapper.includes("pwsh"), false);
  assert.equal(runner.includes("pwsh"), false);
  assert.equal(wrapper.includes("powershell.exe"), true);
});

test("vercel transfer refuses to run without explicit confirmation and project target", () => {
  assert.throws(
    () => resolveVercelTransferConfig({ VERCEL_TRANSFER_TO_VERCEL: "true", VERCEL_ENVIRONMENT: "production" }),
    /VERCEL_PROJECT|VERCEL_TRANSFER_CONFIRM/,
  );
});

test("vercel transfer sends the generated key over stdin without printing it", async () => {
  const calls: Array<{ command: string; args: string[]; stdin: string }> = [];
  const spawnImpl = (_command: string, args: string[], options: { stdio?: unknown[] }) => ({
    stdin: {
      write: (value: string) => {
        calls.push({ command: _command, args, stdin: value });
      },
      end: () => {},
    },
    on: (event: string, callback: (code?: number | null) => void) => {
      if (event === "close") {
        callback(0);
      }
      return this;
    },
    stdio: options.stdio,
  });

  await transferKeyToVercel({
    key: "pk_secret_value",
    config: {
      enabled: true,
      project: "fenomena-commerce",
      environment: "production",
      confirm: true,
      token: "vercel-token",
    },
    env: { VERCEL_TOKEN: "vercel-token" },
    spawnImpl: spawnImpl as unknown as typeof import("node:child_process").spawn,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].stdin, "pk_secret_value\n");
  assert.equal(calls[0].args.includes("MEDUSA_PUBLISHABLE_KEY"), true);
  assert.equal(calls[0].args.includes("--yes"), true);
});
