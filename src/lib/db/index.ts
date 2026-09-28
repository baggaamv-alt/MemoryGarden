import "server-only";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { SHOP_ITEMS } from "../content/shop";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A transaction handle. Inside a transaction, always use the handle — never the root DB. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

type Holder = { promise?: Promise<DB>; kind?: "pglite" | "postgres" };

// Survives hot reloads in development so we never open the embedded database twice.
const globalForDb = globalThis as unknown as { __memoryGardenDb?: Holder };
const holder: Holder = globalForDb.__memoryGardenDb ?? (globalForDb.__memoryGardenDb = {});

export function getDb(): Promise<DB> {
  if (!holder.promise) {
    holder.promise = init().catch((err) => {
      holder.promise = undefined;
      throw err;
    });
  }
  return holder.promise;
}

export function dbKind() {
  return holder.kind ?? (process.env.DATABASE_URL?.trim() ? "postgres" : "pglite");
}

async function init(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const [{ Pool }, { drizzle }, { migrate }] = await Promise.all([
      import("pg"),
      import("drizzle-orm/node-postgres"),
      import("drizzle-orm/node-postgres/migrator"),
    ]);
    const pool = new Pool({ connectionString: url, max: 10 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    holder.kind = "postgres";
    await syncCatalog(db as unknown as DB);
    return db as unknown as DB;
  }

  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dir = path.resolve(process.cwd(), process.env.PGLITE_DIR || "./data/pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  await client.waitReady;
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  holder.kind = "pglite";
  await syncCatalog(db as unknown as DB);
  return db as unknown as DB;
}

/** Keeps the shop_items table in step with the catalog in code. */
async function syncCatalog(db: DB) {
  if (SHOP_ITEMS.length === 0) return;
  await db
    .insert(schema.shopItems)
    .values(
      SHOP_ITEMS.map((item, i) => ({
        id: item.id,
        name: item.name.en,
        nameTe: item.name.te,
        category: item.category,
        price: item.price,
        assetKey: item.id,
        unlockRequirement: (item.unlock as Record<string, unknown> | undefined) ?? null,
        seasonal: item.seasonal ?? null,
        sort: i,
        active: true,
      })),
    )
    .onConflictDoUpdate({
      target: schema.shopItems.id,
      set: {
        name: sql`excluded.name`,
        nameTe: sql`excluded.name_te`,
        category: sql`excluded.category`,
        price: sql`excluded.price`,
        unlockRequirement: sql`excluded.unlock_requirement`,
        seasonal: sql`excluded.seasonal`,
        sort: sql`excluded.sort`,
        active: sql`true`,
      },
    });
}

export { schema };
