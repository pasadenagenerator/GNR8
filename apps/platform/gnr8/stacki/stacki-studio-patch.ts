import { readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Apply ONLY to a disposable copy of the verified upstream revision, before
 * building Studio. Fails on source drift. This hook adds no credentials or I/O
 * provider: it serializes capture with the existing project writer queue.
 */
export async function patchStackiCheckpoint(studio: string) {
  async function replace(path: string, before: string, after: string) {
    const file = join(studio, path);
    const source = await readFile(file, "utf8");
    if (source.split(before).length !== 2) throw new Error(`STACKI_PATCH_SOURCE_DRIFT:${path}`);
    await writeFile(file, source.replace(before, after));
  }
  await copyFile(fileURLToPath(new URL("./stacki-studio-save.tsx", import.meta.url)),
    join(studio, "src/features/project/Gnr8Save.tsx"));
  await replace("src/features/project/EditorHeader.tsx",
    "import type { Peer }", "import { Gnr8Save } from './Gnr8Save';\nimport type { Peer }");
  await replace("src/features/project/EditorHeader.tsx",
    `<span className="save-state">{document?.status ?? 'Connecting'}</span>`, "<Gnr8Save />");
  // Upstream polls GitHub sync with POST every minute, even for local sessions.
  // That no-op is not an edit and must not invalidate a durable GNR8 receipt.
  await replace("src/app/Editor.tsx",
    "<SyncNotice refresh={props.refresh} report={props.report} />",
    "{props.session?.kind === 'github' && <SyncNotice refresh={props.refresh} report={props.report} />}");
  await replace("src/features/collaboration/useDocument.ts",
    "  constructor(readonly file: string) {",
    "  constructor(readonly file: string) {\n    registerGnr8Document(this);");
  await replace("src/features/collaboration/useDocument.ts",
    "export class SharedDocument {",
    "import { registerGnr8Document, gnr8Dirty, gnr8Request } from '../project/Gnr8Save';\nexport class SharedDocument {");
  await replace("src/features/collaboration/useDocument.ts", "  async action(action: TreeAction) {",
    "  async action(action: TreeAction) {\n    const finishGnr8Action = gnr8Request({method:'POST'});\n    try {");
  await replace("src/features/collaboration/useDocument.ts",
    "    this.send({ type: 'action', epoch: this.epoch, checksum, action });\n  }",
    "    this.send({ type: 'action', epoch: this.epoch, checksum, action });\n    } finally { finishGnr8Action(); }\n  }");
  await replace("src/features/collaboration/useDocument.ts",
    "        this.pending++;", "        if (data.type === 'action') gnr8Dirty();\n        this.pending++;");
  await replace("src/features/collaboration/useDocument.ts",
    "      if (origin === LOCAL || origin === this.undo) {",
    "      if (origin === LOCAL || origin === this.undo) {\n        gnr8Dirty();");
  await replace("src/features/project/projectClient.ts",
    "export async function request(",
    "import { gnr8Request } from './Gnr8Save';\nexport async function request(");
  await replace("src/features/project/projectClient.ts", "  const finish = beginOperation();",
    "  const finish = beginOperation();\n  const gnr8Finish = gnr8Request(options);");
  await replace("src/features/project/projectClient.ts", "    finish();",
    "    gnr8Finish();\n    finish();");
  await replace("src/features/collaboration/rooms.ts",
    "    coordinator,\n    sockets,",
    `    checkpoint: <T>(capture: () => Promise<T>) => coordinator.run(async () => {
      for (const pending of rooms.values()) await (await pending).persist();
      return capture();
    }),
    coordinator,
    sockets,`);
  await replace("src/server/integration.ts",
    "  readonly editing?: 'source' | 'draft';",
    "  readonly editing?: 'source' | 'draft';\n  readonly gnr8Checkpoint?: () => Promise<unknown>;\n  readonly gnr8Persistence?: unknown;");
  await replace("src/server/integration.ts",
    "  if (url.pathname === '/studio/api/session') {",
    `  if (url.pathname === '/studio/api/gnr8-persistence' && request.method === 'GET') {
    json(response, options.gnr8Persistence ? 200 : 404, options.gnr8Persistence ?? {});
    return;
  }
  if (url.pathname === '/studio/api/gnr8-checkpoint' && request.method === 'POST') {
    if (!options.gnr8Checkpoint) { json(response, 404, {error:'Unavailable'}); return; }
    json(response, 200, await rooms.checkpoint(options.gnr8Checkpoint));
    return;
  }
  if (url.pathname === '/studio/api/session') {`);
}
