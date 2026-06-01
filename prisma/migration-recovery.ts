import { execSync } from "node:child_process";

export const FAILED_MIGRATION =
  "20260531120000_equipment_units_tds_plants_logo_multicompany";

function run(command: string) {
  execSync(command, { stdio: "inherit" });
}

export function tryRun(command: string): boolean {
  try {
    run(command);
    return true;
  } catch {
    return false;
  }
}

/** Clear P3009/P3018 failed state so migrate deploy can retry. Safe no-op if not failed. */
export function resolveFailedMigration(): void {
  const ok = tryRun(`npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}`);
  if (ok) {
    console.log(`[migration] Resolved rolled-back: ${FAILED_MIGRATION}`);
  }
}

export function deployMigrations(): void {
  resolveFailedMigration();
  run("npx prisma migrate deploy");
}
