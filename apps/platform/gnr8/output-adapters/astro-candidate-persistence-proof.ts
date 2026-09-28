import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  renderSiteVersionPreview,
  setUnifiedRenderPreviewDependenciesForTest,
} from "../runtime/unified-render-preview";
import {
  ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION,
  LocalFilesystemAstroInternalPreviewCandidateRepository,
} from "./astro-internal-preview-candidate-repository";
import {
  inspectAstroStaticExport,
  runAstroBuildExportProof,
  type AstroBuildExportProofEvidence,
} from "./astro-static-site-build-export-proof";
import { convertAstroExportToInternalPreviewCandidate } from "./astro-static-site-internal-preview-bridge";
import {
  prepareAstroStaticSiteWorkspace,
  type PreparedAstroStaticSiteWorkspace,
} from "./astro-static-site-workspace-preparation";

export const ASTRO_CANDIDATE_PERSISTENCE_PROOF_VERSION =
  "gnr8-astro-candidate-persistence-readback-proof:v1" as const;
export const ASTRO_CANDIDATE_PERSISTENCE_PROOF_SITE_ID = "site-astro-mvp08-local-proof" as const;
export const ASTRO_CANDIDATE_PERSISTENCE_PROOF_SITE_VERSION_ID = "sv-astro-mvp08-local-proof" as const;
export const ASTRO_CANDIDATE_PERSISTENCE_PROOF_CANDIDATE_ID = "candidate-astro-mvp08-local-proof" as const;
export const ASTRO_CANDIDATE_PERSISTENCE_RESULT_MARKER = "GNR8_ASTRO_PERSISTENCE_RESULT=" as const;

const PROOF_HOST = "127.0.0.1" as const;
const CHILD_TIMEOUT_MS = 360_000;

export type AstroCandidatePersistenceWriterEvidence = {
  processRole: "writer";
  processId: number;
  buildExport: AstroBuildExportProofEvidence;
  sourceWorkspacePath: string;
  sourceWorkspaceRemovedBeforeExit: true;
  record: {
    schemaVersion: typeof ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION;
    createStatus: "created" | "idempotent";
    candidateId: string;
    siteId: string;
    siteVersionId: string;
    sourceSnapshotSha256: string;
    exportSha256: string;
    contentSha256: string;
    storageSha256: string;
    storage: "isolated_local_filesystem";
    lifetime: "proof_retained_until_explicit_cleanup";
  };
};

export type AstroCandidatePersistenceReaderEvidence = {
  processRole: "reader";
  processId: number;
  sourceWorkspaceAbsent: true;
  record: AstroCandidatePersistenceWriterEvidence["record"];
  preview: {
    source: "astro_internal_preview_candidate";
    candidateId: string;
    siteId: string;
    siteVersionId: string;
    fallbackUsed: false;
    databaseReads: 0;
    expectedContentVerified: string[];
    inlineCssVerified: string;
    anchorsVerified: string[];
  };
  server: {
    host: typeof PROOF_HOST;
    port: number;
    status: 200;
    contentType: string;
    stopped: true;
  };
};

export type AstroCandidatePersistenceProofEvidence = {
  proofVersion: typeof ASTRO_CANDIDATE_PERSISTENCE_PROOF_VERSION;
  proofOnly: true;
  writer: AstroCandidatePersistenceWriterEvidence;
  reader: AstroCandidatePersistenceReaderEvidence;
  crossProcess: {
    distinctProcesses: true;
    writerExitedBeforeReader: true;
    storageSurvivedWriterExit: true;
    sourceWorkspaceAbsentDuringRead: true;
    hashesMatched: true;
  };
  storage: {
    location: string;
    retention: "proof_retained_until_explicit_cleanup";
    productionDurabilityClaimed: false;
    authenticatedAccessClaimed: false;
  };
  cleanup: {
    ownedProofRootRemoved: true;
    storageRemoved: true;
    workspaceRootRemoved: true;
    readerServerStopped: true;
    writerProcessExited: true;
    readerProcessExited: true;
  };
};

export async function runAstroCandidatePersistenceWriter(input: {
  storageRoot: string;
  workspaceRoot: string;
  signal?: AbortSignal;
}): Promise<AstroCandidatePersistenceWriterEvidence> {
  const repository = new LocalFilesystemAstroInternalPreviewCandidateRepository({ storageRoot: input.storageRoot });
  let prepared: PreparedAstroStaticSiteWorkspace | null = null;
  let persisted: Awaited<ReturnType<typeof repository.create>> | null = null;
  const buildExport = await runAstroBuildExportProof({
    workspaceRoot: input.workspaceRoot,
    signal: input.signal,
    dependencies: {
      prepareWorkspace: async (prepareInput) => {
        prepared = await prepareAstroStaticSiteWorkspace(prepareInput);
        return prepared;
      },
      inspectExport: async (workspacePath, verification) => {
        const inspected = await inspectAstroStaticExport(workspacePath, verification);
        if (!prepared) throw new Error("astro_persistence_prepared_workspace_missing");
        const candidate = await convertAstroExportToInternalPreviewCandidate({
          inspectedExport: inspected,
          candidateId: ASTRO_CANDIDATE_PERSISTENCE_PROOF_CANDIDATE_ID,
          siteId: ASTRO_CANDIDATE_PERSISTENCE_PROOF_SITE_ID,
          siteVersionId: ASTRO_CANDIDATE_PERSISTENCE_PROOF_SITE_VERSION_ID,
          rendererCompatibilityVersion: "gnr8-renderer-v1",
          sourceSnapshotSha256: prepared.sourceSnapshot.aggregateSha256,
        });
        persisted = await repository.create(candidate);
        return inspected;
      },
    },
  });
  const completed = persisted as Awaited<ReturnType<typeof repository.create>> | null;
  if (!completed || !buildExport.workspace.path || !buildExport.workspace.removed) {
    throw new Error("astro_persistence_writer_evidence_incomplete");
  }
  await assertPathMissing(buildExport.workspace.path, "Writer source workspace still exists after cleanup.");
  const record = completed.record;
  if (
    record.candidate.manifest.lifecycle.storage !== "isolated_local_filesystem" ||
    record.candidate.manifest.lifecycle.lifetime !== "proof_retained_until_explicit_cleanup"
  ) {
    throw new Error("astro_persistence_writer_lifecycle_invalid");
  }
  return {
    processRole: "writer",
    processId: process.pid,
    buildExport,
    sourceWorkspacePath: buildExport.workspace.path,
    sourceWorkspaceRemovedBeforeExit: true,
    record: {
      schemaVersion: record.schemaVersion,
      createStatus: completed.status,
      candidateId: record.identity.candidateId,
      siteId: record.identity.siteId,
      siteVersionId: record.identity.siteVersionId,
      sourceSnapshotSha256: record.candidate.manifest.provenance.sourceSnapshotSha256,
      exportSha256: record.candidate.manifest.provenance.exportSha256,
      contentSha256: record.candidate.contentSha256,
      storageSha256: record.storageSha256,
      storage: record.candidate.manifest.lifecycle.storage,
      lifetime: record.candidate.manifest.lifecycle.lifetime,
    },
  };
}

export async function runAstroCandidatePersistenceReader(input: {
  storageRoot: string;
  sourceWorkspacePath: string;
  signal?: AbortSignal;
}): Promise<AstroCandidatePersistenceReaderEvidence> {
  await assertPathMissing(input.sourceWorkspacePath, "Reader unexpectedly found the deleted source workspace.");
  const repository = new LocalFilesystemAstroInternalPreviewCandidateRepository({ storageRoot: input.storageRoot });
  const identity = {
    candidateId: ASTRO_CANDIDATE_PERSISTENCE_PROOF_CANDIDATE_ID,
    siteId: ASTRO_CANDIDATE_PERSISTENCE_PROOF_SITE_ID,
    siteVersionId: ASTRO_CANDIDATE_PERSISTENCE_PROOF_SITE_VERSION_ID,
  };
  const record = await repository.read(identity);
  let databaseReads = 0;
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    requestScopedDbClientEnabled: false,
    getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    getAstroInternalPreviewCandidate: async (candidateId) => {
      if (candidateId !== identity.candidateId) return null;
      return (await repository.read(identity)).candidate;
    },
    getSiteVersion: async () => {
      databaseReads += 1;
      throw new Error("Astro persistence proof must not read a persisted site version.");
    },
    getSiteVersionArtifactBinding: async () => {
      databaseReads += 1;
      throw new Error("Astro persistence proof must not read a persisted artifact binding.");
    },
    getArtifactById: async () => {
      databaseReads += 1;
      throw new Error("Astro persistence proof must not read a runtime artifact.");
    },
  });
  let server: Server | null = null;
  let serverEvidence: AstroCandidatePersistenceReaderEvidence["server"] | null = null;
  try {
    const preview = await renderSiteVersionPreview({
      siteVersionId: identity.siteVersionId,
      path: "/",
      mode: "transformed",
      astroCandidateSelection: { candidateId: identity.candidateId, siteId: identity.siteId },
      requestCorrelationKey: "req-astro-mvp08-persisted-reader",
    });
    const expectedContent = ["Work that reads clearly", "Practical operating support", "Talk with Northline"];
    const verifiedContent = expectedContent.filter((value) => preview.html.includes(value));
    const inlineCss = "--gnr8-astro-accent: #0f766e;";
    const anchors = ['href="#services"', 'href="#contact"'];
    if (
      preview.source !== "astro_internal_preview_candidate" ||
      preview.artifactId !== identity.candidateId ||
      preview.siteId !== identity.siteId ||
      preview.siteVersionId !== identity.siteVersionId ||
      preview.fallbackUsed ||
      databaseReads !== 0 ||
      verifiedContent.length !== expectedContent.length ||
      !preview.html.includes(inlineCss) ||
      anchors.some((anchor) => !preview.html.includes(anchor)) ||
      /<link\b[^>]*rel=["'][^"']*stylesheet/i.test(preview.html)
    ) {
      throw new Error("astro_persistence_reader_preview_verification_failed");
    }

    server = createServer((request, response) => {
      if ((request.method === "GET" || request.method === "HEAD") && new URL(request.url ?? "/", "http://gnr8.invalid").pathname === "/") {
        const body = Buffer.from(preview.html, "utf8");
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-length": String(body.byteLength),
          "cache-control": "no-store",
        });
        response.end(request.method === "HEAD" ? undefined : body);
        return;
      }
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    });
    await listen(server);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("astro_persistence_reader_server_address_missing");
    const response = await fetch(`http://${PROOF_HOST}:${address.port}/`, { cache: "no-store", signal: input.signal });
    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status !== 200 || !contentType.includes("text/html") || body !== preview.html || !body.includes(inlineCss)) {
      throw new Error("astro_persistence_reader_http_verification_failed");
    }
    await closeServer(server);
    serverEvidence = {
      host: PROOF_HOST,
      port: address.port,
      status: 200,
      contentType,
      stopped: true,
    };
    server = null;
    return {
      processRole: "reader",
      processId: process.pid,
      sourceWorkspaceAbsent: true,
      record: {
        schemaVersion: record.schemaVersion,
        createStatus: "created",
        candidateId: record.identity.candidateId,
        siteId: record.identity.siteId,
        siteVersionId: record.identity.siteVersionId,
        sourceSnapshotSha256: record.candidate.manifest.provenance.sourceSnapshotSha256,
        exportSha256: record.candidate.manifest.provenance.exportSha256,
        contentSha256: record.candidate.contentSha256,
        storageSha256: record.storageSha256,
        storage: "isolated_local_filesystem",
        lifetime: "proof_retained_until_explicit_cleanup",
      },
      preview: {
        source: "astro_internal_preview_candidate",
        candidateId: preview.artifactId,
        siteId: preview.siteId,
        siteVersionId: preview.siteVersionId,
        fallbackUsed: false,
        databaseReads: 0,
        expectedContentVerified: verifiedContent,
        inlineCssVerified: inlineCss,
        anchorsVerified: anchors,
      },
      server: serverEvidence,
    };
  } finally {
    restore();
    if (server?.listening) await closeServer(server);
  }
}

export async function runAstroCandidatePersistenceProof(input: {
  signal?: AbortSignal;
} = {}): Promise<AstroCandidatePersistenceProofEvidence> {
  const proofRoot = await realpath(await mkdtemp(join(tmpdir(), "gnr8-astro-persistence-proof-")));
  const storageRoot = join(proofRoot, "storage");
  const workspaceRoot = join(proofRoot, "workspaces");
  await mkdir(storageRoot, { mode: 0o700 });
  await mkdir(workspaceRoot, { mode: 0o700 });
  let writer: AstroCandidatePersistenceWriterEvidence | null = null;
  let reader: AstroCandidatePersistenceReaderEvidence | null = null;
  let completed = false;
  try {
    writer = await runProofChild<AstroCandidatePersistenceWriterEvidence>(
      ["writer", storageRoot, workspaceRoot],
      input.signal,
    );
    reader = await runProofChild<AstroCandidatePersistenceReaderEvidence>(
      ["reader", storageRoot, writer.sourceWorkspacePath],
      input.signal,
    );
    if (writer.processId === reader.processId) throw new Error("astro_persistence_process_isolation_failed");
    if (!sameRecordEvidence(writer.record, reader.record)) throw new Error("astro_persistence_cross_process_hash_mismatch");
    completed = true;
  } finally {
    await rm(proofRoot, { recursive: true, force: false });
  }
  await assertPathMissing(proofRoot, "Owned proof root still exists after cleanup.");
  if (!completed || !writer || !reader) throw new Error("astro_persistence_cross_process_evidence_incomplete");
  return {
    proofVersion: ASTRO_CANDIDATE_PERSISTENCE_PROOF_VERSION,
    proofOnly: true,
    writer,
    reader,
    crossProcess: {
      distinctProcesses: true,
      writerExitedBeforeReader: true,
      storageSurvivedWriterExit: true,
      sourceWorkspaceAbsentDuringRead: true,
      hashesMatched: true,
    },
    storage: {
      location: storageRoot,
      retention: "proof_retained_until_explicit_cleanup",
      productionDurabilityClaimed: false,
      authenticatedAccessClaimed: false,
    },
    cleanup: {
      ownedProofRootRemoved: true,
      storageRemoved: true,
      workspaceRootRemoved: true,
      readerServerStopped: reader.server.stopped,
      writerProcessExited: true,
      readerProcessExited: true,
    },
  };
}

function sameRecordEvidence(
  writer: AstroCandidatePersistenceWriterEvidence["record"],
  reader: AstroCandidatePersistenceReaderEvidence["record"],
): boolean {
  return (
    writer.schemaVersion === reader.schemaVersion &&
    writer.candidateId === reader.candidateId &&
    writer.siteId === reader.siteId &&
    writer.siteVersionId === reader.siteVersionId &&
    writer.sourceSnapshotSha256 === reader.sourceSnapshotSha256 &&
    writer.exportSha256 === reader.exportSha256 &&
    writer.contentSha256 === reader.contentSha256 &&
    writer.storageSha256 === reader.storageSha256 &&
    writer.storage === reader.storage &&
    writer.lifetime === reader.lifetime
  );
}

async function runProofChild<T>(args: string[], signal?: AbortSignal): Promise<T> {
  const execFileAsync = promisify(execFile);
  const scriptPath = fileURLToPath(new URL("./run-astro-candidate-persistence-proof.ts", import.meta.url));
  const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const result = await execFileAsync("pnpm", ["exec", "tsx", scriptPath, ...args], {
    cwd: platformRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: CHILD_TIMEOUT_MS,
    signal,
    env: {
      ...process.env,
      CI: "1",
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      npm_config_update_notifier: "false",
    },
  });
  const markerLine = result.stdout
    .split("\n")
    .findLast((line) => line.startsWith(ASTRO_CANDIDATE_PERSISTENCE_RESULT_MARKER));
  if (!markerLine) {
    throw new Error(`Astro persistence child produced no result marker: ${result.stderr.slice(-2_000)}`);
  }
  return JSON.parse(
    Buffer.from(markerLine.slice(ASTRO_CANDIDATE_PERSISTENCE_RESULT_MARKER.length), "base64url").toString("utf8"),
  ) as T;
}

async function assertPathMissing(path: string, message: string): Promise<void> {
  await lstat(path).then(
    () => { throw new Error(message); },
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    },
  );
}

function listen(server: Server): Promise<void> {
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen({ host: PROOF_HOST, port: 0, exclusive: true }, resolveListen);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
