import { execSync } from "node:child_process";

const FAILED_MIGRATION = "20260531120000_equipment_units_tds_plants_logo_multicompany";

function run(command: string) {
  execSync(command, { stdio: "inherit" });
}

function tryRun(command: string): boolean {
  try {
    run(command);
    return true;
  } catch {
    return false;
  }
}

if (tryRun("npx prisma migrate deploy")) {
  process.exit(0);
}

console.warn(
  `[migrate-deploy] migrate deploy failed; attempting recovery for ${FAILED_MIGRATION}`
);

tryRun(`npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}`);

try {
  run("npx prisma migrate deploy");
} catch (error) {
  console.error("[migrate-deploy] Migration deploy failed after recovery attempt.");
  throw error;
}
