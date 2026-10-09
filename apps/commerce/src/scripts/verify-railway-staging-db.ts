import { pathToFileURL } from "node:url";
import { Pool, type PoolClient, type PoolConfig } from "pg";

const LUNA_EXTERNAL_ID = "fenomena:luna-abaya";
const REGION_NAME = "Malaysia";
const SALES_CHANNEL_NAME = "Fenomena Storefront";
const DEFAULT_PORT = 5432;

export function createReadOnlyPoolConfig(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol.");
  }

  return {
    host: env.PGHOST || parsed.hostname,
    port: Number(env.PGPORT || parsed.port || DEFAULT_PORT),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
    query_timeout: 7_000,
    statement_timeout: 5_000,
    application_name: "fenomena-railway-read-only-verifier",
  };
}

async function tableColumns(client: Pick<PoolClient, "query">, tableName: string) {
  const result = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName],
  );
  return new Set(result.rows.map((row: { column_name: string }) => String(row.column_name)));
}

async function inspectRailwayDatabase(pool: Pick<Pool, "connect" | "end">): Promise<Record<string, unknown>> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN READ ONLY");
    transactionStarted = true;

    const regionResult = await client.query(
      `SELECT id, name
       FROM region
       WHERE name = $1
       LIMIT 1`,
      [REGION_NAME],
    );

    const productResult = await client.query(
      `SELECT id, title, status, external_id
       FROM product
       WHERE external_id = $1 OR title = $2
       ORDER BY id
       LIMIT 10`,
      [LUNA_EXTERNAL_ID, "Luna Abaya"],
    );

    const variantCountResult = await client.query(
      `SELECT COUNT(*)::int AS variant_count
       FROM product_variant pv
       JOIN product p ON p.id = pv.product_id
       WHERE p.external_id = $1`,
      [LUNA_EXTERNAL_ID],
    );

    const salesChannelResult = await client.query(
      `SELECT id, name, is_disabled
       FROM sales_channel
       WHERE name = $1
       LIMIT 20`,
      [SALES_CHANNEL_NAME],
    );

    const productSalesChannelExists = await client.query(
      `SELECT to_regclass('public.product_sales_channel') IS NOT NULL AS exists`,
    );
    let salesChannelAssociations: Record<string, unknown>[] = [];
    if (productSalesChannelExists.rows[0]?.exists) {
      salesChannelAssociations = (
        await client.query(
          `SELECT sc.id AS sales_channel_id, sc.name AS sales_channel_name, sc.is_disabled, p.id AS product_id, p.external_id
           FROM product_sales_channel psc
           JOIN sales_channel sc ON sc.id = psc.sales_channel_id
           JOIN product p ON p.id = psc.product_id
           WHERE p.external_id = $1
           ORDER BY sc.name, sc.id`,
          [LUNA_EXTERNAL_ID],
        )
      ).rows;
    }

    const productId = productResult.rows[0]?.id as string | undefined;
    let inventoryRows: Record<string, unknown>[] = [];
    if (productId) {
      inventoryRows = (
        await client.query(
          `SELECT pv.id AS variant_id, pv.sku, pv.title, ii.id AS inventory_item_id, il.stocked_quantity, sl.name AS stock_location
           FROM product_variant pv
           LEFT JOIN inventory_item ii ON ii.sku = pv.sku
           LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
           LEFT JOIN stock_location sl ON sl.id = il.location_id
           WHERE pv.product_id = $1
           ORDER BY pv.sku
           LIMIT 50`,
          [productId],
        )
      ).rows;
    }

    const productVariantColumns = await tableColumns(client, "product_variant");
    const moneyAmountColumns = await tableColumns(client, "money_amount");
    let priceRows: Record<string, unknown>[] = [];
    if (productId && moneyAmountColumns.size > 0) {
      if (moneyAmountColumns.has("entity_id") && moneyAmountColumns.has("amount")) {
        priceRows = (
          await client.query(
            `SELECT ma.id AS money_amount_id, ma.entity_id AS variant_id, ma.amount, ma.currency_code, pv.sku
             FROM money_amount ma
             JOIN product_variant pv ON pv.id = ma.entity_id
             WHERE pv.product_id = $1
             ORDER BY pv.sku
             LIMIT 50`,
            [productId],
          )
        ).rows;
      } else if (productVariantColumns.has("price_set_id")) {
        priceRows = (
          await client.query(
            `SELECT pv.id AS variant_id, pv.sku, pv.price_set_id
             FROM product_variant pv
             WHERE pv.product_id = $1
             ORDER BY pv.sku
             LIMIT 50`,
            [productId],
          )
        ).rows;
      }
    }

    return {
      region: regionResult.rows[0] ?? null,
      product: productResult.rows[0] ?? null,
      matches: productResult.rows,
      variant_count: Number(variantCountResult.rows[0]?.variant_count ?? 0),
      sales_channel: salesChannelResult.rows,
      linked_sales_channels: salesChannelAssociations,
      inventory: inventoryRows,
      prices: priceRows,
      summary: {
        region_found: Boolean(regionResult.rows[0]),
        product_found: Boolean(productResult.rows[0]),
        sales_channel_found: salesChannelResult.rows.length > 0,
      },
    };
  } finally {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    client.release();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const pool = new Pool(createReadOnlyPoolConfig(databaseUrl));
  try {
    const report = await inspectRailwayDatabase(pool);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        error: "Read-only Railway verification failed.",
        code: typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : undefined,
      }),
    );
    process.exitCode = 1;
  });
}
