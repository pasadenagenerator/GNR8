import "server-only";

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  AirshipSidecarBuilderAdapter,
  type BuilderCommandDescriptor,
  type BuilderSession,
  type BuilderSessionCaptureResult,
} from "../adapter/builder-adapter";
import {
  AIRSHIP_CHS_DEMO_ARTIFACT_ID,
  AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
  AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
  buildAirshipChsMvpDemoHtml,
} from "../../single-site/airship-chs-demo-artifact-repair";
import {
  analyzeAirshipArtifactHtmlValidity,
  analyzeAirshipPolishedArtifactHtmlCompleteness,
} from "../../single-site/airship-valid-artifact-html";
import {
  mapAirshipCapturedDiffToDraft,
  type AirshipCapturedDiffToDraftMappingResult,
  type AirshipKnownDraftFieldMapping,
} from "./airship-captured-diff-to-draft-mapper";

export const AIRSHIP_PROOF_SESSION_ENTRY_VERSION = "airship-adapter-06-proof-session-entry:v1" as const;
export const AIRSHIP_PROOF_SESSION_CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63" as const;

export type AirshipProofArtifactKey = "chs-polished-demo";

export type ProofCommandDescriptor = {
  executable: string;
  args: string[];
  cwd: string;
  commandLine: string;
  manualOnly: true;
  launchesProcess: false;
  description: string;
};

export type AirshipProofSessionReadback = {
  proofOnly: true;
  localManualOnly: true;
  selectedArtifact: {
    key: AirshipProofArtifactKey;
    migrationId: string;
    importedSite: "chs.si";
    sourceUrl: "https://www.chs.si/";
    runtimeSiteId: typeof AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID;
    siteVersionId: typeof AIRSHIP_CHS_DEMO_SITE_VERSION_ID;
    artifactId: typeof AIRSHIP_CHS_DEMO_ARTIFACT_ID;
    htmlPath: "/";
  };
  workspacePath: string;
  targetUrl: string;
  targetPort: number;
  sessionPort: number;
  expectedAirshipSessionUrl: string;
  healthReadbackUrl: string | null;
  localRunnerCommand: ProofCommandDescriptor;
  manualAirshipCommand: ProofCommandDescriptor;
  initialHashes: BuilderSession["baselineHashes"];
  adapterSession: BuilderSession;
  warnings: string[];
  safety: {
    proofOnlyGuard: true;
    noAutoLaunch: true;
    noLivePointerMutation: true;
    noPublishMutation: true;
    noDnsMutation: true;
    noProviderMutation: true;
    noSourceCaptureImport: true;
    noDraftPersistence: true;
  };
};

export type PrepareAirshipProofSessionInput = {
  migrationId: string;
  artifactKey?: AirshipProofArtifactKey;
  workspaceRoot?: string;
  sessionId?: string;
  targetPort?: number;
  sessionPort?: number;
};

export type AirshipProofCaptureInput = {
  preparedSession: AirshipProofSessionReadback;
  sampleEditedString?: string | null;
};

export type AirshipProofCaptureReadback = {
  proofOnly: true;
  localManualOnly: true;
  status: BuilderSessionCaptureResult["status"];
  workspacePath: string;
  changedFiles: BuilderSessionCaptureResult["changedFiles"];
  currentHashes: BuilderSessionCaptureResult["currentHashes"];
  indexHtmlChanged: boolean;
  sampleEditedString: string | null;
  sampleEditedStringFound: boolean | null;
  warnings: string[];
  safety: AirshipProofSessionReadback["safety"];
};

export type AirshipProofCapturedDiffDraftMappingInput = {
  preparedSession: AirshipProofSessionReadback;
  knownDraftFieldMappings?: AirshipKnownDraftFieldMapping[] | null;
};

export type AirshipProofCapturedDiffDraftMappingReadback = {
  proofOnly: true;
  localManualOnly: true;
  workspacePath: string;
  indexHtmlChanged: boolean;
  mapping: AirshipCapturedDiffToDraftMappingResult;
  warnings: string[];
  safety: AirshipProofSessionReadback["safety"];
};

export async function prepareAirshipProofSessionEntry(input: PrepareAirshipProofSessionInput): Promise<AirshipProofSessionReadback> {
  const selectedArtifact = selectProofArtifact(input.migrationId, input.artifactKey);
  const targetPort = input.targetPort ?? 4178;
  const sessionPort = input.sessionPort ?? targetPort + 1;
  const workspacePath = await createProofWorkspace({
    workspaceRoot: input.workspaceRoot,
    sessionId: input.sessionId,
    migrationId: selectedArtifact.migrationId,
    html: selectedArtifact.html,
    targetPort,
    metadata: {
      serviceVersion: AIRSHIP_PROOF_SESSION_ENTRY_VERSION,
      proofOnly: true,
      selectedArtifact: selectedArtifact.readback,
      boundaries: proofBoundaries(),
    },
  });

  const adapter = new AirshipSidecarBuilderAdapter();
  const startResult = await adapter.prepareSession({
    sessionId: input.sessionId ?? `airship-proof-${selectedArtifact.migrationId}-${randomUUID()}`,
    workspaceDir: workspacePath,
    target: {
      type: "static-html-localhost",
      host: "127.0.0.1",
      targetPort,
      sessionPort,
      mode: "canvas",
    },
    baselinePaths: ["index.html", "package.json", "gnr8-airship-proof-session.json"],
  });

  return {
    proofOnly: true,
    localManualOnly: true,
    selectedArtifact: selectedArtifact.readback,
    workspacePath,
    targetUrl: `http://127.0.0.1:${targetPort}/`,
    targetPort,
    sessionPort,
    expectedAirshipSessionUrl: startResult.command.expectedSessionUrl,
    healthReadbackUrl: null,
    localRunnerCommand: buildRunnerCommand({ workspacePath, targetPort }),
    manualAirshipCommand: toProofCommandDescriptor(startResult.command),
    initialHashes: startResult.session.baselineHashes,
    adapterSession: startResult.session,
    warnings: proofWarnings(),
    safety: proofBoundaries(),
  };
}

export async function captureAirshipProofSessionChanges(input: AirshipProofCaptureInput): Promise<AirshipProofCaptureReadback> {
  const adapter = new AirshipSidecarBuilderAdapter();
  const capture = await adapter.captureSession(input.preparedSession.adapterSession);
  const sampleEditedString = normalizedOptionalText(input.sampleEditedString);
  const indexHtml = await readFile(join(input.preparedSession.workspacePath, "index.html"), "utf8").catch(() => null);

  return {
    proofOnly: true,
    localManualOnly: true,
    status: capture.status,
    workspacePath: input.preparedSession.workspacePath,
    changedFiles: capture.changedFiles,
    currentHashes: capture.currentHashes,
    indexHtmlChanged: capture.indexHtmlChanged,
    sampleEditedString,
    sampleEditedStringFound: sampleEditedString ? indexHtml?.includes(sampleEditedString) ?? false : null,
    warnings: [
      "Captured local workspace diffs only.",
      "Captured HTML is not mapped into GNR8 drafts, candidates, live pointers, or publish state.",
    ],
    safety: input.preparedSession.safety,
  };
}

export async function mapAirshipProofSessionCapturedDiffToDraft(
  input: AirshipProofCapturedDiffDraftMappingInput,
): Promise<AirshipProofCapturedDiffDraftMappingReadback> {
  const baselineHtml = input.preparedSession.initialHashes.find((hash) => hash.path === "index.html")?.snapshot ?? null;
  if (baselineHtml === null) {
    throw new Error("airship_proof_session_index_html_baseline_missing");
  }

  const currentHtml = await readFile(join(input.preparedSession.workspacePath, "index.html"), "utf8");
  const mapping = mapAirshipCapturedDiffToDraft({
    beforeHtml: baselineHtml,
    afterHtml: currentHtml,
    context: {
      migrationId: input.preparedSession.selectedArtifact.migrationId,
      siteKey: input.preparedSession.selectedArtifact.importedSite,
      route: input.preparedSession.selectedArtifact.htmlPath,
    },
    knownDraftFieldMappings: input.knownDraftFieldMappings,
  });

  return {
    proofOnly: true,
    localManualOnly: true,
    workspacePath: input.preparedSession.workspacePath,
    indexHtmlChanged: baselineHtml !== currentHtml,
    mapping,
    warnings: [
      "Mapped captured HTML changes as dry-run draft candidates only.",
      "No GNR8 draft storage, artifacts, live pointers, or publish state were mutated.",
    ],
    safety: input.preparedSession.safety,
  };
}

function selectProofArtifact(migrationId: string, artifactKey: AirshipProofArtifactKey = "chs-polished-demo") {
  if (artifactKey !== "chs-polished-demo" || migrationId !== AIRSHIP_PROOF_SESSION_CHS_MIGRATION_ID) {
    throw new Error("airship_proof_session_known_good_artifact_missing");
  }

  const html = buildAirshipChsMvpDemoHtml();
  const validity = analyzeAirshipArtifactHtmlValidity({ html, migrationId });
  const completeness = analyzeAirshipPolishedArtifactHtmlCompleteness({ html, migrationId });
  if (!validity.valid || !completeness.complete) {
    throw new Error(`airship_proof_session_polished_artifact_invalid:${[...validity.reasons, ...completeness.reasons].join(",")}`);
  }

  return {
    html,
    migrationId,
    readback: {
      key: artifactKey,
      migrationId,
      importedSite: "chs.si" as const,
      sourceUrl: "https://www.chs.si/" as const,
      runtimeSiteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
      siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
      artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
      htmlPath: "/" as const,
    },
  };
}

async function createProofWorkspace(input: {
  workspaceRoot?: string;
  sessionId?: string;
  migrationId: string;
  html: string;
  targetPort: number;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const root = resolve(input.workspaceRoot ?? join(tmpdir(), "gnr8-airship-proof-sessions"));
  await mkdir(root, { recursive: true });
  const workspacePath = input.sessionId
    ? join(root, sanitizeWorkspaceSegment(input.sessionId))
    : await mkdtemp(join(root, `${input.migrationId.slice(0, 8)}-`));

  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(workspacePath, "index.html"), input.html, "utf8");
  await writeFile(
    join(workspacePath, "package.json"),
    `${JSON.stringify(
      {
        private: true,
        scripts: {
          serve: `python3 -m http.server ${input.targetPort} --bind 127.0.0.1 --directory .`,
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(join(workspacePath, "gnr8-airship-proof-session.json"), `${JSON.stringify(input.metadata, null, 2)}\n`, "utf8");
  return workspacePath;
}

function buildRunnerCommand(input: { workspacePath: string; targetPort: number }): ProofCommandDescriptor {
  const args = ["-m", "http.server", String(input.targetPort), "--bind", "127.0.0.1", "--directory", input.workspacePath];
  return {
    executable: "python3",
    args,
    cwd: input.workspacePath,
    commandLine: quoteCommand("python3", args),
    manualOnly: true,
    launchesProcess: false,
    description: "Manual local static server command for the disposable Airship proof workspace.",
  };
}

function toProofCommandDescriptor(command: BuilderCommandDescriptor): ProofCommandDescriptor {
  return {
    executable: command.executable,
    args: command.args,
    cwd: command.cwd,
    commandLine: quoteCommand(command.executable, command.args),
    manualOnly: command.manualOnly,
    launchesProcess: command.launchesProcess,
    description: command.description,
  };
}

function quoteCommand(executable: string, args: string[]): string {
  return [executable, ...args].map((part) => (part.length > 0 && /^[A-Za-z0-9_./:@=-]+$/.test(part) ? part : JSON.stringify(part))).join(" ");
}

function proofWarnings(): string[] {
  return [
    "Proof-only and local/manual. GNR8 does not launch Airship from this session entry.",
    "Start the local static runner yourself before running the Airship CLI command.",
    "Captured file changes are read back for review only and are not persisted into GNR8 drafts or artifacts.",
  ];
}

function proofBoundaries(): AirshipProofSessionReadback["safety"] {
  return {
    proofOnlyGuard: true,
    noAutoLaunch: true,
    noLivePointerMutation: true,
    noPublishMutation: true,
    noDnsMutation: true,
    noProviderMutation: true,
    noSourceCaptureImport: true,
    noDraftPersistence: true,
  };
}

function normalizedOptionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function sanitizeWorkspaceSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, "-").slice(0, 96) || "airship-proof-session";
}
