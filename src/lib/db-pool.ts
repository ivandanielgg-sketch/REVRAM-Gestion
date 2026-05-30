import type { PoolConfig } from "pg";

/**
 * Render Internal URL: postgresql://user:pass@dpg-xxxxx-a/dbname (sin SSL)
 * Render External URL: postgresql://user:pass@dpg-xxxxx-a.region-postgres.render.com/dbname (con SSL)
 */
export function getPgPoolConfig(connectionString: string): PoolConfig {
  const isPostgresUrl =
    connectionString.startsWith("postgresql://") || connectionString.startsWith("postgres://");

  if (!isPostgresUrl) {
    throw new Error(
      "DATABASE_URL inválida. Debe ser la URL completa de PostgreSQL (Internal Database URL en Render)."
    );
  }

  const needsSsl =
    connectionString.includes(".render.com") ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true");

  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    connectionTimeoutMillis: 10000,
  };
}
