import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getSuperadminPool } from "@/src/superadmin/db";
import { refreshAirshipPublishActivationHandoffWatermark } from "./airship-publish-activation-chain-service";

function readArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!entry) return null;
  const value = entry.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath: string | null): void {
  if (!filePath) return;
  const resolved = path.resolve(process.cwd(), filePath);
  if (!existsSync(resolved)) throw new Error(`env file not found: ${filePath}`);
  for (const line of readFileSync(resolved, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt <= 0) continue;
    const key = trimmed.slice(0, equalsAt).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;
    process.env[key] = unquoteEnvValue(trimmed.slice(equalsAt + 1));
  }
}

async function main(): Promise<void> {
  loadEnvFile(readArg("env-file"));
  const readinessPackageId = readArg("readiness-package-id");
  if (!readinessPackageId) throw new Error("readiness-package-id is required");

  const output = await refreshAirshipPublishActivationHandoffWatermark({ readinessPackageId });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getSuperadminPool().end().catch(() => undefined);
  });
