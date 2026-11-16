import { readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from 'node:crypto';

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
  const gitPanel = join(studio,'src/features/history/GitPanel.tsx');
  if (createHash('sha256').update(await readFile(gitPanel)).digest('hex') !==
      'ba45c32e6ddc59e249974dd1dcd0bdfe2d52cef66fd8824028dfd0deafafe45d')
    throw new Error('STACKI_PATCH_SOURCE_DRIFT:GitPanel.tsx');
  await copyFile(fileURLToPath(new URL('./stacki-studio-git-panel.tsx.txt',import.meta.url)),gitPanel);
  await replace("src/features/project/EditorHeader.tsx",
    "import type { Peer }", "import { Gnr8Save, Gnr8Publish } from './Gnr8Save';\nimport type { Peer }");
  await replace("src/features/project/EditorHeader.tsx",
    `<span className="save-state" role="status">
          {document?.status ?? 'Connecting'}
        </span>`, "<Gnr8Save />");
  await replace("src/features/project/EditorHeader.tsx",
    "{!direct && <PublishButton report={report} />}", "{!direct && <Gnr8Publish />}");
  // Upstream polls GitHub sync with POST every minute, even for local sessions.
  // That no-op is not an edit and must not invalidate a durable GNR8 receipt.
  await replace("src/app/Editor.tsx",
    "<SyncNotice refresh={props.refresh} report={props.report} />",
    "{props.session?.kind === 'github' && <SyncNotice refresh={props.refresh} report={props.report} />}");
  await replace("src/features/collaboration/useDocument.ts",
    "    this.persistence = new IndexeddbPersistence(",
    "    registerGnr8Document(this);\n    this.persistence = new IndexeddbPersistence(");
  await replace("src/features/collaboration/useDocument.ts",
    "export class SharedDocument {",
    "import { registerGnr8Document, gnr8Dirty, gnr8Request } from '../project/Gnr8Save';\nexport class SharedDocument {");
  await replace("src/features/collaboration/useDocument.ts", "  async action(action: TreeAction) {",
    "  async action(action: TreeAction) {\n    const finishGnr8Action = gnr8Request({method:'POST'});\n    try {");
  await replace("src/features/collaboration/useDocument.ts",
    "    this.send({ type: 'action', epoch: this.epoch, checksum, action });\n  }",
    "    this.send({ type: 'action', epoch: this.epoch, checksum, action });\n    } finally { finishGnr8Action(); }\n  }");
  await replace("src/features/collaboration/useDocument.ts",
    "        const save = this.saves.sent();", "        if (data.type === 'action') gnr8Dirty();\n        const save = this.saves.sent();");
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
  await replace("src/server/integration.ts",
    "  readonly editing?: 'source' | 'draft';",
    "  readonly editing?: 'source' | 'draft';\n  readonly gnr8Checkpoint?: () => Promise<unknown>;\n  readonly gnr8Persistence?: unknown;\n  readonly gnr8SourceState?: () => Promise<{sourceSha256:string;sourceUnchanged:boolean}>;");
  await replace("src/server/integration.ts",
    "  if (url.pathname === '/studio/api/session') {",
    `  if (url.pathname === '/studio/api/gnr8-persistence' && request.method === 'GET') {
    const sourceState = options.gnr8SourceState ? await rooms.coordinator.run(async () => { await rooms.persist(); return options.gnr8SourceState!(); }) : {sourceUnchanged:false};
    json(response, options.gnr8Persistence ? 200 : 404, {...(options.gnr8Persistence as object ?? {}), ...sourceState});
    return;
  }
  if (url.pathname === '/studio/api/gnr8-checkpoint' && request.method === 'POST') {
    if (!options.gnr8Checkpoint) { json(response, 404, {error:'Unavailable'}); return; }
    const capture = options.gnr8Checkpoint;
    json(response, 200, await rooms.coordinator.run(async () => {
      await rooms.persist();
      return capture();
    }));
    return;
  }
  if (url.pathname === '/studio/api/session') {`);
}
