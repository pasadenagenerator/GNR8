import "server-only";

import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { buildCanonicalMigrationInput } from "@/gnr8/runtime/migration-factory";
import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getActivePointerForSite,
  getArtifactById,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  getSiteVersion,
  linkRuntimeSiteVersionOwnershipIfAllowed,
} from "@/gnr8/runtime/runtime-store";
import { RENDERER_COMPATIBILITY_VERSION, type RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import { runScopedImportPipeline } from "@/gnr8/site/scoped-import-pipeline";
import { importPublicSinglePageUrlToSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";
import { getSuperadminPool } from "@/src/superadmin/db";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import { createAstroCandidatePromotionService } from "./astro-candidate-promotion-service";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import {
  createAstroProductionCandidateId,
} from "./astro-production-candidate-record";
import type { AstroResolvedCandidateRecord } from "./astro-production-candidate-object-record";
import {
  AstroProductionCandidateRepositoryError,
  GatewayBackedAstroProductionCandidateRepository,
} from "./astro-production-candidate-repository";
import {
  InMemoryAstroCandidateRegistrationRetryContextStore,
} from "./astro-production-candidate-registration-contract";
import { createAstroProductionCandidateRegistrationService } from "./astro-production-candidate-registration-service";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import { createAstroStaticSiteProjectManifest } from "./astro-static-site-adapter";
import { createAstroSuccessorPublicationOperation } from "./astro-successor-publication-composition";
import { AstroSuccessorPublicationError } from "./astro-successor-publication-service";
import {
  createChsSourceBackedAstroCandidateProducer,
  CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
  CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
  type ChsAstroBuildReceipt,
} from "./chs-astro-candidate-producer";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import { chsAstroSourceContent } from "./chs-astro-source-content";
import { createChsGeneratedOutputContentManifest } from "./chs-generated-output-policy";
import { createBuildEvidenceForCandidate, readGeneratedOutputBuildEvidence } from "./generated-output-evidence";

const STAGING_REF = "dpkdxllcxnlytgjbnmvp";
const SOURCE_URL = "https://www.chs.si/";
const REQUIRED_CAPTURE_TEXT = [
  "The team that helps you change your IT to fit into every season and technology wave.",
  "VMware pricing change just became your opportunity",
  "Vendor-Neutral yet vendor supported advice",
  "sales@chs.si",
  "Parmova ulica 51, Ljubljana, Slovenia",
  "© 2026 CHS d.o.o. - All rights reserved",
] as const;
const OPERATION_ID = process.env.GNR8_MVP28_OPERATION_ID?.trim() ?? "";
const ACTOR = process.env.GNR8_MVP28_GENERATION_ACTOR?.trim() || "system:gnr8-mvp28-fresh-capture-generation";

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(OPERATION_ID)) {
  throw new Error("GNR8_MVP28_OPERATION_ID_REQUIRED");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!supabaseUrl || !serviceRoleKey || !databaseUrl) throw new Error("GNR8_MVP28_STAGING_ENV_MISSING");
const supabaseRef = new URL(supabaseUrl).hostname.split(".")[0];
const databaseIdentity = decodeURIComponent(new URL(databaseUrl).username);
if (supabaseRef !== STAGING_REF || !databaseIdentity.includes(STAGING_REF)) {
  throw new Error(`GNR8_MVP28_WRONG_TARGET:${supabaseRef}:${databaseIdentity.split(".").at(-1) ?? "unknown"}`);
}

const operation = deriveOperation(OPERATION_ID);
const pool = getSuperadminPool();
const databaseCheck = await pool.query<{ database_name: string; database_user: string }>(
  "select current_database()::text as database_name, current_user::text as database_user",
);
const databaseRow = databaseCheck.rows[0];
if (databaseRow?.database_name !== "postgres" || !databaseRow.database_user.includes(STAGING_REF)) {
  throw new Error("GNR8_MVP28_DATABASE_IDENTITY_MISMATCH");
}

const baselinePointer = await getActivePointerForSite(CHS_ASTRO_EVALUATION.runtimeSiteId);
if (!baselinePointer) throw new Error("GNR8_MVP28_EVALUATION_POINTER_MISSING");

const capture = await ensureFreshCapture();
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const candidateClient = serviceClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver(() => candidateClient);
const candidateRepository = new GatewayBackedAstroProductionCandidateRepository({
  gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
});
const runtimeStore = new SupabaseAstroCandidateRuntimeArtifactStore(serviceClient);

await ensureGenerationVersion(capture);
const ownership = await ownershipResolver.resolve({
  siteVersionId: operation.generationSiteVersionId,
  expectedRuntimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
});

let candidateRecord = await candidateRepository.read({
  candidateId: operation.generationCandidateId,
  trustedScope: ownership,
}).catch((error) => {
  if (error instanceof AstroProductionCandidateRepositoryError && error.code === "missing") return null;
  throw error;
});
let buildReceipt: ChsAstroBuildReceipt | null = null;
if (!candidateRecord) {
  const producer = createChsSourceBackedAstroCandidateProducer({
    content: chsAstroSourceContent(),
    inputId: operation.producerInputId,
  });
  const register = createAstroProductionCandidateRegistrationService({
    authenticateSuperadmin: async () => ACTOR,
    resolveOwnership: (input) => ownershipResolver.resolve(input),
    producer,
    repository: candidateRepository,
    retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
    now: () => new Date(capture.capturedAt),
  });
  await register({
    operationId: operation.registrationOperationId,
    siteVersionId: operation.generationSiteVersionId,
    producer: {
      kind: CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
      version: CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
    },
    syntheticInput: { fixtureId: operation.producerInputId },
  });
  buildReceipt = producer.readBuildReceipt(operation.generationCandidateId);
  if (!buildReceipt) throw new Error("GNR8_MVP28_BUILD_RECEIPT_MISSING");
  candidateRecord = await candidateRepository.read({
    candidateId: operation.generationCandidateId,
    trustedScope: ownership,
  });
}

const existingGenerationVersion = await getSiteVersion(operation.generationSiteVersionId);
let generationArtifact = existingGenerationVersion?.artifactId
  ? await getArtifactById(existingGenerationVersion.artifactId)
  : null;
if (generationArtifact && readGeneratedOutputBuildEvidence(generationArtifact.manifest)) {
  assertPointerUnchanged(await getActivePointerForSite(CHS_ASTRO_EVALUATION.runtimeSiteId), baselinePointer);
} else {
  if (!buildReceipt) {
    throw new Error("GNR8_MVP28_INCOMPLETE_RETRY_REQUIRES_EXPLICIT_BUILD_RECONCILIATION");
  }
  generationArtifact = await ensureGenerationPreallocation(candidateRecord);
  const contentManifest = createChsGeneratedOutputContentManifest({
    sourceRef: `${capture.snapshotId}:${capture.snapshotRunId}:${capture.artifactId}:${capture.artifactBundleSha256}`,
  });
  const buildEvidence = createBuildEvidenceForCandidate({
    record: candidateRecord,
    receipt: buildReceipt,
    sourceCapture: {
      sourceUrl: SOURCE_URL,
      snapshotId: capture.snapshotId,
      snapshotRunId: capture.snapshotRunId,
      capturedAt: capture.capturedAt,
      runtimeSiteId: capture.runtimeSiteId,
      siteVersionId: capture.siteVersionId,
      artifactId: capture.artifactId,
      artifactBundleSha256: capture.artifactBundleSha256,
      htmlSha256: capture.htmlSha256,
    },
    contentManifest,
    submissionAttestation: {
      mode: "direct_server_execution",
      operationId: OPERATION_ID,
      packageSha256: sha256Hex(stableStringify(buildReceipt)),
      submittedByActorId: ACTOR,
      receivedAt: buildReceipt.buildCompletedAt,
    },
  });
  const promote = createAstroCandidatePromotionService({
    resolveOwnership: (input) => ownershipResolver.resolve(input),
    readCandidate: (input) => candidateRepository.read(input),
    runtimeStore,
  });
  await promote({
    actorUserId: ACTOR,
    siteVersionId: operation.generationSiteVersionId,
    candidateId: candidateRecord.identity.candidateId,
    expectedContentSha256: candidateRecord.candidate.contentSha256,
    expectedStorageSha256: candidateRecord.storageSha256,
    idempotencyKey: `mvp28:${OPERATION_ID}:source-promotion`,
    generatedOutputEvidence: { buildEvidence, contentManifest },
  });
  assertPointerUnchanged(await getActivePointerForSite(CHS_ASTRO_EVALUATION.runtimeSiteId), baselinePointer);
}

generationArtifact = (await runtimeStore.readContext(operation.generationSiteVersionId))?.artifact ?? null;
if (!generationArtifact) throw new Error("GNR8_MVP28_GENERATION_ARTIFACT_MISSING");

const publishOperation = createAstroSuccessorPublicationOperation();
let reviewRequired = false;
try {
  await publishOperation({
    actorUserId: ACTOR,
    runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    sourceSiteVersionId: operation.generationSiteVersionId,
    sourceCandidateId: candidateRecord.identity.candidateId,
    sourceArtifactId: generationArtifact.id,
    expectedSourceContentSha256: candidateRecord.candidate.contentSha256,
    expectedSourceStorageSha256: candidateRecord.storageSha256,
    expectedActivePointer: baselinePointer,
    expectedInternalHost: CHS_ASTRO_EVALUATION.internalHost,
    stage: "shadow",
  });
} catch (error) {
  if (error instanceof AstroSuccessorPublicationError && error.code === "generated_output_review_required") {
    reviewRequired = true;
  } else {
    throw error;
  }
}
if (!reviewRequired) throw new Error("GNR8_MVP28_REVIEW_GATE_NOT_REACHED");
assertPointerUnchanged(await getActivePointerForSite(CHS_ASTRO_EVALUATION.runtimeSiteId), baselinePointer);

const successor = await getSiteVersion(operation.successorSiteVersionId);
const successorArtifact = successor?.artifactId ? await getArtifactById(successor.artifactId) : null;
if (!successor || successor.state !== "READY_FOR_REVIEW" || !successorArtifact) {
  throw new Error("GNR8_MVP28_SUCCESSOR_REVIEW_READBACK_FAILED");
}

process.stdout.write(`${JSON.stringify({
  target: { supabaseRef, database: databaseRow.database_name, runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId },
  operation,
  baselinePointer,
  capture,
  build: {
    evidenceSha256: readGeneratedOutputBuildEvidence(generationArtifact.manifest)?.evidenceSha256 ?? null,
    candidateId: candidateRecord.identity.candidateId,
    candidateContentSha256: candidateRecord.candidate.contentSha256,
    candidateStorageSha256: candidateRecord.storageSha256,
    generationArtifactId: generationArtifact.id,
    generationArtifactBundleSha256: generationArtifact.bundleSha256,
  },
  review: {
    siteVersionId: successor.id,
    artifactId: successorArtifact.id,
    artifactBundleSha256: successorArtifact.bundleSha256,
    candidateId: operation.successorCandidateId,
    state: successor.state,
    relativeUrl: `/gnr8/admin/generated-output-review/${successor.id}`,
  },
  activePointerUnchanged: true,
}, null, 2)}\n`);

async function ensureFreshCapture(): Promise<{
  runtimeSiteId: string;
  siteVersionId: string;
  artifactId: string;
  artifactBundleSha256: string;
  htmlSha256: string;
  rawArtifactId: string;
  rawHtmlSha256: string;
  snapshotId: string;
  snapshotRunId: string;
  capturedAt: string;
}> {
  let version = await getSiteVersion(operation.captureSiteVersionId);
  if (!version) {
    const snapshot = await importPublicSinglePageUrlToSnapshot({
      sourceUrl: SOURCE_URL,
      requestId: operation.captureRequestId,
      siteId: operation.captureRuntimeSiteId,
      siteVersionId: operation.captureSiteVersionId,
    });
    const intake = snapshot.importIntake;
    if (!intake?.ok || !(intake.rawHtmlAvailable && intake.htmlByteLength > 0)) {
      throw new Error(`GNR8_MVP28_CAPTURE_FAILED:${intake?.reasonCode ?? "unknown"}`);
    }
    const imported = await runScopedImportPipeline({
      snapshot,
      sourceUrl: SOURCE_URL,
      actor: ACTOR,
      fallbackToLegacyOnPipelineFailure: false,
      runtimeIdentity: {
        siteId: operation.captureRuntimeSiteId,
        siteVersionId: operation.captureSiteVersionId,
      },
      deps: {
        createSiteVersionFromMigration: (input) => createSiteVersionFromMigration({
          ...input,
          createSourceHostBinding: false,
        }),
      },
    });
    if (imported.mode !== "pipeline" || imported.artifactId.length === 0) {
      throw new Error("GNR8_MVP28_CAPTURE_PIPELINE_DID_NOT_MATERIALIZE");
    }
    await linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: imported.siteVersionId,
      ownershipSiteId: CHS_ASTRO_EVALUATION.ownership.siteId,
    });
    version = await getSiteVersion(operation.captureSiteVersionId);
  }
  if (!version?.artifactId) throw new Error("GNR8_MVP28_CAPTURE_VERSION_INCOMPLETE");
  const [artifact, raw] = await Promise.all([
    getArtifactById(version.artifactId),
    getRawImportedSiteArtifact(version.id),
  ]);
  if (!artifact || !raw) throw new Error("GNR8_MVP28_CAPTURE_ARTIFACTS_MISSING");
  const rawEntry = await getRawTemplateSiteAsset({
    siteVersionId: version.id,
    artifactId: raw.id,
    filePath: raw.entryHtmlPath,
  });
  if (!rawEntry) throw new Error("GNR8_MVP28_CAPTURE_RAW_HTML_MISSING");
  const rawHtml = rawEntry.bytes.toString("utf8");
  for (const expected of REQUIRED_CAPTURE_TEXT) {
    if (!normalizeText(rawHtml).includes(normalizeText(expected))) {
      throw new Error(`GNR8_MVP28_CAPTURE_REQUIRED_CONTENT_MISSING:${sha256Hex(expected).slice(0, 12)}`);
    }
  }
  const provenance = version.importProvenanceSummary;
  const snapshotId = provenance?.executionIdentity?.snapshotId ?? "";
  const snapshotRunId = provenance?.executionIdentity?.snapshotRunId ?? "";
  if (!snapshotId || !snapshotRunId) throw new Error("GNR8_MVP28_CAPTURE_IDENTITY_MISSING");
  const recomputed = computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  });
  if (recomputed !== artifact.bundleSha256) throw new Error("GNR8_MVP28_CAPTURE_ARTIFACT_HASH_MISMATCH");
  return {
    runtimeSiteId: version.siteId,
    siteVersionId: version.id,
    artifactId: artifact.id,
    artifactBundleSha256: artifact.bundleSha256,
    htmlSha256: sha256Hex(artifact.htmlByPath["/"] ?? ""),
    rawArtifactId: raw.id,
    rawHtmlSha256: rawEntry.sha256,
    snapshotId,
    snapshotRunId,
    capturedAt: new Date(raw.createdAt).toISOString(),
  };
}

async function ensureGenerationVersion(capture: Awaited<ReturnType<typeof ensureFreshCapture>>): Promise<void> {
  let version = await getSiteVersion(operation.generationSiteVersionId);
  if (!version) {
    const content = chsAstroSourceContent();
    const project = createAstroStaticSiteProjectManifest(content);
    const sourceHtml = project.files.find((file) => file.path === "src/pages/index.astro")?.contents;
    if (!sourceHtml) throw new Error("GNR8_MVP28_GENERATED_SOURCE_MISSING");
    const page = importHtmlToPage({ slug: "/", title: content.siteName, html: sourceHtml });
    const canonical = buildCanonicalMigrationInput({
      sourceUrl: CHS_ASTRO_EVALUATION.sourceUrl,
      page,
      actor: ACTOR,
    });
    const provenance = {
      kind: "runtime_import_provenance_summary_v1",
      executionIdentity: {
        snapshotId: capture.snapshotId,
        snapshotRunId: capture.snapshotRunId,
        snapshotStableRootDirAbs: "",
        snapshotRunRootDirAbs: "",
        requestId: operation.captureRequestId,
      },
      sourceMode: "raw_html_fallback",
      importFidelityStatus: "degraded_import",
      renderedCaptureStatus: "failed",
      renderedDomQuality: "unusable",
      screenshotCount: 0,
      computedStyleSampleCount: 0,
      importDiagnosticCodes: ["mvp28_fresh_capture_bound_astro_generation"],
      captureEvidence: {
        selectedSourceHtmlPath: null,
        responseHtmlPath: null,
        entryHtmlPath: null,
        renderedCaptureManifestPath: null,
        acquisitionEvidencePath: null,
        renderedDomPath: null,
        computedStylesPath: null,
        layoutGeometryPath: null,
        renderedViewportScreenshotPath: null,
        renderedFullpageScreenshotPath: null,
        screenshotPaths: [],
      },
      styleSignals: null,
      semanticImport: null,
      multipageImport: null,
      multiPageDiscovery: null,
      siteTree: null,
      templateFamilies: null,
    } as unknown as RuntimeImportProvenanceSummary;
    await createSiteVersionFromMigration({
      ...canonical,
      siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
      siteVersionId: operation.generationSiteVersionId,
      sourceUrl: CHS_ASTRO_EVALUATION.sourceUrl,
      actor: ACTOR,
      createSourceHostBinding: false,
      importProvenanceSummary: provenance,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
    });
    await linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: operation.generationSiteVersionId,
      ownershipSiteId: CHS_ASTRO_EVALUATION.ownership.siteId,
    });
    version = await getSiteVersion(operation.generationSiteVersionId);
  }
  if (!version || version.siteId !== CHS_ASTRO_EVALUATION.runtimeSiteId) {
    throw new Error("GNR8_MVP28_GENERATION_VERSION_CONFLICT");
  }
}

async function ensureGenerationPreallocation(record: AstroResolvedCandidateRecord) {
  const version = await getSiteVersion(operation.generationSiteVersionId);
  if (!version) throw new Error("GNR8_MVP28_GENERATION_VERSION_MISSING");
  if (version.artifactId) {
    const existing = await getArtifactById(version.artifactId);
    if (!existing) throw new Error("GNR8_MVP28_GENERATION_ARTIFACT_BINDING_BROKEN");
    return existing;
  }
  const enforcement = evaluatePublishEnforcement({ siteVersion: version, stage: "shadow" });
  const manifest = {
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: version.id,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    renderMode: "PUBLISH",
    generatedAt: "deterministic",
    paths: ["/"],
    artifactSource: "astro_candidate_preallocation",
    candidateId: record.identity.candidateId,
    publishStage: "shadow",
    shadowRestricted: enforcement.shadowRestricted,
    enforcementDecision: enforcement.adapter.decision,
  };
  const bundleSha256 = computeRuntimeArtifactBundleSha256({
    htmlByPath: record.candidate.htmlByPath,
    compiledTokenStyles: record.candidate.compiledTokenStyles,
    assetFingerprintMap: record.candidate.assetFingerprintMap,
    manifest,
  });
  const created = await createArtifact({
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: version.id,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    bundleSha256,
    htmlByPath: record.candidate.htmlByPath,
    compiledTokenStyles: record.candidate.compiledTokenStyles,
    assetFingerprintMap: record.candidate.assetFingerprintMap,
    manifest,
    publishStage: "shadow",
    shadowRestricted: enforcement.shadowRestricted,
    artifactGovernance: enforcement.artifactGovernance,
  });
  await bindArtifactToVersion({
    siteVersionId: version.id,
    artifactId: created.artifactId,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
  });
  const artifact = await getArtifactById(created.artifactId);
  if (!artifact) throw new Error("GNR8_MVP28_GENERATION_PREALLOCATION_FAILED");
  return artifact;
}

function deriveOperation(operationId: string) {
  const seed = stableStringify({ version: "gnr8-platform-mvp28:v1", operationId, sourceUrl: SOURCE_URL });
  const generationSiteVersionId = deterministicUuid(`${seed}:generation-version`);
  const registrationOperationId = deterministicUuid(`${seed}:registration`);
  const successorSeed = stableStringify({
    version: "gnr8-astro-successor-publication:v1",
    runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    sourceSiteVersionId: generationSiteVersionId,
    sourceCandidateId: createAstroProductionCandidateId(registrationOperationId),
  });
  return {
    operationId,
    captureRuntimeSiteId: `test_runtime_e2e_capture_chs_${sha256Hex(seed).slice(0, 16)}`,
    captureSiteVersionId: deterministicUuid(`${seed}:capture-version`),
    captureRequestId: `mvp28-chs-${operationId}`,
    generationSiteVersionId,
    registrationOperationId,
    generationCandidateId: createAstroProductionCandidateId(registrationOperationId),
    producerInputId: `chs:fresh-capture:${operationId}`,
    successorSiteVersionId: deterministicUuid(`${successorSeed}:site-version`),
    successorCandidateId: createAstroProductionCandidateId(deterministicUuid(`${successorSeed}:candidate-operation`)),
  };
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(createHash("sha256").update(seed).digest().subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function assertPointerUnchanged(
  actual: { siteVersionId: string; artifactId: string } | null,
  expected: { siteVersionId: string; artifactId: string },
): void {
  if (!actual || actual.siteVersionId !== expected.siteVersionId || actual.artifactId !== expected.artifactId) {
    throw new Error("GNR8_MVP28_ACTIVE_POINTER_CONCURRENT_CHANGE");
  }
}

function normalizeText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}
