import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getDatabaseTarget, loadCommerceEnvironment } from "./environment.ts";

function makeCommerceFixture(envFile: string): { root: string; cwd: string } {
  const root = mkdtempSync(join(tmpdir(), "fenomena-env-test-"));
  const cwd = join(root, "apps", "commerce");
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(root, ".env"), envFile, "utf8");
  return { root, cwd };
}

test("Railway CLI variables win over root .env when NODE_ENV is unset", () => {
  const fixture = makeCommerceFixture(
    "DATABASE_URL=postgresql://local_user:local_password@127.0.0.1:5432/local_db\n",
  );
  const railwayUrl =
    "postgresql://railway_user:railway_password@postgres.railway.internal:5432/railway_db";
  const env: NodeJS.ProcessEnv = { DATABASE_URL: railwayUrl };

  try {
    assert.equal(env.NODE_ENV, undefined);
    loadCommerceEnvironment({ cwd: fixture.cwd, processEnv: env });

    assert.equal(env.DATABASE_URL, railwayUrl);
    assert.deepEqual(getDatabaseTarget(env.DATABASE_URL!), {
      host: "postgres.railway.internal",
      port: 5432,
      database: "railway_db",
    });
    assert.equal(JSON.stringify(getDatabaseTarget(env.DATABASE_URL!)).includes("password"), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("local .env supplies DATABASE_URL when the process environment is missing it", () => {
  const fixture = makeCommerceFixture(
    "DATABASE_URL=postgresql://local_user:local_password@127.0.0.1:5432/fenomena\n",
  );
  const env: NodeJS.ProcessEnv = {};

  try {
    assert.equal(env.NODE_ENV, undefined);
    loadCommerceEnvironment({ cwd: fixture.cwd, processEnv: env });

    assert.deepEqual(getDatabaseTarget(env.DATABASE_URL!), {
      host: "127.0.0.1",
      port: 5432,
      database: "fenomena",
    });
    assert.equal(JSON.stringify(getDatabaseTarget(env.DATABASE_URL!)).includes("password"), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});