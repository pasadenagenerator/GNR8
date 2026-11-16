import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { parseStackiSave, STACKI_DRAFT_MAX_REVISIONS } from "./stacki-draft-contract";
import { validateId, type StackiSaveOperation } from "./stacki-session-store";

export function checkpointName(operation: StackiSaveOperation) {
  validateId(operation.operationId);
  if (!Number.isInteger(operation.expectedRevision) || operation.expectedRevision < 1 ||
      operation.expectedRevision >= STACKI_DRAFT_MAX_REVISIONS) throw new Error("STACKI_SAVE_REVISION_INVALID");
  return `checkpoint-${operation.expectedRevision}-${operation.operationId}.json`;
}

/** Immutable per-click capture, outside the editable workspace. Retry never
 * captures later edits under an earlier operation, even after a lost response. */
export function createStackiRuntimeCheckpoint(root: string, astroPort: number) {
  const pending = new Map<string, Promise<void>>();
  return async (operation: StackiSaveOperation) => {
    const name = checkpointName(operation);
    if (!pending.has(name)) {
      const work = (async () => {
        const path = join(root, name);
        try { await readFile(path); return; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        const response = await fetch(`http://127.0.0.1:${astroPort}/studio/api/gnr8-checkpoint`, {
          method: "POST", signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error("STACKI_RUNTIME_CAPTURE_FAILED");
        const files = parseStackiSave({ expectedRevision: operation.expectedRevision, files: await response.json() }).files;
        await writeFile(`${path}.pending`, JSON.stringify(files));
        await rename(`${path}.pending`, path);
      })();
      pending.set(name, work);
      void work.catch(() => pending.delete(name));
    }
    await pending.get(name);
    return name;
  };
}
