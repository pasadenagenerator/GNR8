import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runAstroInternalPreviewBridgeProof } from "./astro-static-site-internal-preview-proof";

export async function main(): Promise<void> {
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error("interrupt_signal_received"));
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const evidence = await runAstroInternalPreviewBridgeProof({ signal: controller.signal });
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error instanceof Error ? error.stack ?? error.message : error)}\n`);
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
