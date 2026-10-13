import "server-only";

import { createClient } from "@supabase/supabase-js";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex } from "@/gnr8/runtime/deterministic";
import { buildCanonicalMigrationInput } from "@/gnr8/runtime/migration-factory";
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
  persistRawImportedSiteArtifact,
} from "@/gnr8/runtime/runtime-store";
import { RENDERER_COMPATIBILITY_VERSION, type RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import { getSuperadminPool } from "@/src/superadmin/db";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import { createAstroCandidatePromotionService } from "./astro-candidate-promotion-service";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import type { AstroResolvedCandidateRecord } from "./astro-production-candidate-object-record";
import {
  AstroProductionCandidateRepositoryError,
  GatewayBackedAstroProductionCandidateRepository,
} from "./astro-production-candidate-repository";
import { InMemoryAstroCandidateRegistrationRetryContextStore } from "./astro-production-candidate-registration-contract";
import { createAstroProductionCandidateRegistrationService } from "./astro-production-candidate-registration-service";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import { createAstroStaticSiteProjectManifest } from "./astro-static-site-adapter";
import { createAstroSuccessorPublicationOperation } from "./astro-successor-publication-composition";
import { AstroSuccessorPublicationError } from "./astro-successor-publication-service";
import {
  CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
  CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
} from "./chs-astro-candidate-producer";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import { chsAstroSourceContent } from "./chs-astro-source-content";
import { createChsGeneratedOutputContentManifest } from "./chs-generated-output-policy";
import { createBuildEvidenceForCandidate, readGeneratedOutputBuildEvidence } from "./generated-output-evidence";
import {
  deriveMvp28OperationIdentity,
  MVP28_EXPECTED_BASELINE_POINTER,
  MVP28_OPERATION_ID,
  MVP28_SOURCE_URL,
  validateMvp28ChsPackage,
  type Mvp28ChsPackage,
} from "./mvp28-chs-package-contract";
import {
  assertMvp28EffectiveDatabaseIdentity,
  assertMvp28StagingConnectionConfiguration,
} from "./mvp28-staging-database-identity";

const GENERATION_ACTOR = "system:gnr8-mvp28-fresh-capture-generation";

export type Mvp28ChsPackageIngestionResult = {
  status: "ready_for_review" | "idempotent";
  operationId: typeof MVP28_OPERATION_ID;
  packageSha256: string;
  capture: {
    snapshotId: string;
    snapshotRunId: string;
    capturedAt: string;
    siteVersionId: string;
    artifactId: string;
    artifactBundleSha256: string;
  };
  build: {
    candidateId: string;
    candidateContentSha256: string;
    candidateStorageSha256: string;
    evidenceSha256: string;
  };
  review: {
    siteVersionId: string;
    artifactId: string;
    artifactBundleSha256: string;
    candidateId: string;
    relativeUrl: string;
  };
  activePointerUnchanged: true;
};

export async function ingestMvp28ChsPackage(input: {
  actorUserId: string;
  packageValue: unknown;
  now?: () => Date;
}): Promise<Mvp28ChsPackageIngestionResult> {
  const packageValue = validateMvp28ChsPackage(input.packageValue);
  const operation = deriveMvp28OperationIdentity(packageValue.operationId);
  const now = input.now ?? (() => new Date());
  await assertStagingDatabaseIdentity();
  await assertExpectedPointer();

  const capture = await ensureCapture(packageValue);
  await assertExpectedPointer();
  await ensureGenerationVersion(packageValue);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const candidateClient = serviceClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
  const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver(() => candidateClient);
  const candidateRepository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
  });
  const ownership = await ownershipResolver.resolve({
    siteVersionId: operation.generationSiteVersionId,
    expectedRuntimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
  });
  const packageProducer = {
    kind: CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
    version: CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
    supports: (producerInput: { fixtureId: string }) => producerInput.fixtureId === operation.producerInputId,
    produce: async () => structuredClone(packageValue.build.candidate),
  };
  const register = createAstroProductionCandidateRegistrationService({
    authenticateSuperadmin: async () => input.actorUserId,
    resolveOwnership: (selection) => ownershipResolver.resolve(selection),
    producer: packageProducer,
    repository: candidateRepository,
    retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
    now: () => new Date(packageValue.build.candidate.createdAt),
  });
  await register({
    operationId: operation.registrationOperationId,
    siteVersionId: operation.generationSiteVersionId,
    producer: { kind: packageProducer.kind, version: packageProducer.version },
    syntheticInput: { fixtureId: operation.producerInputId },
  });
  const record = await candidateRepository.read({
    candidateId: operation.generationCandidateId,
    trustedScope: ownership,
  });
  assertPackageCandidateMatchesRecord(packageValue, record);

  const runtimeStore = new SupabaseAstroCandidateRuntimeArtifactStore(serviceClient);
  let context = await runtimeStore.readContext(operation.generationSiteVersionId);
  if (!context?.artifact) {
    await ensureGenerationPreallocation(record);
    context = await runtimeStore.readContext(operation.generationSiteVersionId);
  }
  if (!context?.artifact) throw new Error("mvp28_generation_artifact_missing");
  let buildEvidence = readGeneratedOutputBuildEvidence(context.artifact.manifest);
  let ingestionStatus: Mvp28ChsPackageIngestionResult["status"] = "idempotent";
  if (!buildEvidence) {
    const contentManifest = createChsGeneratedOutputContentManifest({
      sourceRef: `${capture.snapshotId}:${capture.snapshotRunId}:${capture.artifactId}:${capture.artifactBundleSha256}`,
    });
    buildEvidence = createBuildEvidenceForCandidate({
      record,
      receipt: packageValue.build.receipt,
      sourceCapture: {
        sourceUrl: MVP28_SOURCE_URL,
        snapshotId: capture.snapshotId,
        snapshotRunId: capture.snapshotRunId,
        capturedAt: capture.capturedAt,
        runtimeSiteId: operation.captureRuntimeSiteId,
        siteVersionId: operation.captureSiteVersionId,
        artifactId: capture.artifactId,
        artifactBundleSha256: capture.artifactBundleSha256,
        htmlSha256: capture.htmlSha256,
      },
      contentManifest,
      submissionAttestation: {
        mode: "authenticated_preview_package",
        operationId: MVP28_OPERATION_ID,
        packageSha256: packageValue.packageSha256,
        submittedByActorId: input.actorUserId,
        receivedAt: now().toISOString(),
      },
    });
    const promote = createAstroCandidatePromotionService({
      resolveOwnership: (selection) => ownershipResolver.resolve(selection),
      readCandidate: (selection) => candidateRepository.read(selection),
      runtimeStore,
    });
    await promote({
      actorUserId: input.actorUserId,
      siteVersionId: operation.generationSiteVersionId,
      candidateId: record.identity.candidateId,
      expectedContentSha256: record.candidate.contentSha256,
      expectedStorageSha256: record.storageSha256,
      idempotencyKey: `mvp28:${MVP28_OPERATION_ID}:source-promotion`,
      generatedOutputEvidence: { buildEvidence, contentManifest },
    });
    ingestionStatus = "ready_for_review";
  } else if (
    buildEvidence.submissionAttestation.operationId !== MVP28_OPERATION_ID ||
    buildEvidence.submissionAttestation.packageSha256 !== packageValue.packageSha256 ||
    buildEvidence.submissionAttestation.mode !== "authenticated_preview_package"
  ) {
    throw new Error("mvp28_persisted_package_conflict");
  }
  await assertExpectedPointer();

  const generationContext = await runtimeStore.readContext(operation.generationSiteVersionId);
  if (!generationContext?.artifact) throw new Error("mvp28_generation_artifact_missing");
  let reviewRequired = false;
  try {
    await createAstroSuccessorPublicationOperation()({
      actorUserId: input.actorUserId,
      runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
      sourceSiteVersionId: operation.generationSiteVersionId,
      sourceCandidateId: record.identity.candidateId,
      sourceArtifactId: generationContext.artifact.id,
      expectedSourceContentSha256: record.candidate.contentSha256,
      expectedSourceStorageSha256: record.storageSha256,
      expectedActivePointer: MVP28_EXPECTED_BASELINE_POINTER,
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
  if (!reviewRequired) throw new Error("mvp28_review_gate_not_reached");
  await assertExpectedPointer();
  const successor = await getSiteVersion(operation.successorSiteVersionId);
  const successorArtifact = successor?.artifactId ? await getArtifactById(successor.artifactId) : null;
  if (!successor || successor.state !== "READY_FOR_REVIEW" || !successorArtifact) {
    throw new Error("mvp28_successor_review_readback_failed");
  }
  return {
    status: ingestionStatus,
    operationId: MVP28_OPERATION_ID,
    packageSha256: packageValue.packageSha256,
    capture: {
      snapshotId: capture.snapshotId,
      snapshotRunId: capture.snapshotRunId,
      capturedAt: capture.capturedAt,
      siteVersionId: operation.captureSiteVersionId,
      artifactId: capture.artifactId,
      artifactBundleSha256: capture.artifactBundleSha256,
    },
    build: {
      candidateId: record.identity.candidateId,
      candidateContentSha256: record.candidate.contentSha256,
      candidateStorageSha256: record.storageSha256,
      evidenceSha256: buildEvidence.evidenceSha256,
    },
    review: {
      siteVersionId: successor.id,
      artifactId: successorArtifact.id,
      artifactBundleSha256: successorArtifact.bundleSha256,
      candidateId: operation.successorCandidateId,
      relativeUrl: `/gnr8/admin/generated-output-review/${successor.id}`,
    },
    activePointerUnchanged: true,
  };
}

async function assertStagingDatabaseIdentity(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) throw new Error("mvp28_staging_configuration_missing");
  assertMvp28StagingConnectionConfiguration({ supabaseUrl, databaseUrl });
  const result = await getSuperadminPool().query<{ database_name: string; database_user: string }>(
    "select current_database()::text as database_name, current_user::text as database_user",
  );
  assertMvp28EffectiveDatabaseIdentity({
    databaseName: result.rows[0]?.database_name,
    databaseUser: result.rows[0]?.database_user,
  });
}

async function assertExpectedPointer(): Promise<void> {
  const pointer = await getActivePointerForSite(CHS_ASTRO_EVALUATION.runtimeSiteId);
  if (
    pointer?.siteVersionId !== MVP28_EXPECTED_BASELINE_POINTER.siteVersionId ||
    pointer.artifactId !== MVP28_EXPECTED_BASELINE_POINTER.artifactId
  ) throw new Error("mvp28_active_pointer_concurrent_change");
}

async function ensureCapture(packageValue: Mvp28ChsPackage) {
  const operation = deriveMvp28OperationIdentity();
  let version = await getSiteVersion(operation.captureSiteVersionId);
  if (!version) {
    const page = importHtmlToPage({ slug: "/", title: "CHS source capture", html: packageValue.capture.rawHtml });
    const canonical = buildCanonicalMigrationInput({ sourceUrl: MVP28_SOURCE_URL, page, actor: GENERATION_ACTOR });
    await createSiteVersionFromMigration({
      ...canonical,
      siteId: operation.captureRuntimeSiteId,
      siteVersionId: operation.captureSiteVersionId,
      sourceUrl: MVP28_SOURCE_URL,
      actor: GENERATION_ACTOR,
      createSourceHostBinding: false,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
      importProvenanceSummary: captureProvenance(packageValue),
    });
    await linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: operation.captureSiteVersionId,
      ownershipSiteId: CHS_ASTRO_EVALUATION.ownership.siteId,
    });
    version = await getSiteVersion(operation.captureSiteVersionId);
  }
  if (!version || version.siteId !== operation.captureRuntimeSiteId) throw new Error("mvp28_capture_version_conflict");
  const execution = version.importProvenanceSummary?.executionIdentity;
  if (
    execution?.snapshotId !== packageValue.capture.snapshotId ||
    execution.snapshotRunId !== packageValue.capture.snapshotRunId
  ) throw new Error("mvp28_capture_identity_conflict");

  let artifact = version.artifactId ? await getArtifactById(version.artifactId) : null;
  if (!artifact) {
    const enforcement = evaluatePublishEnforcement({ siteVersion: version, stage: "shadow" });
    const manifest = {
      siteId: operation.captureRuntimeSiteId,
      siteVersionId: operation.captureSiteVersionId,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
      renderMode: "PUBLISH",
      generatedAt: packageValue.capture.capturedAt,
      paths: ["/"],
      artifactSource: "mvp28_authenticated_source_capture_package",
      sourceUrl: MVP28_SOURCE_URL,
      snapshotId: packageValue.capture.snapshotId,
      snapshotRunId: packageValue.capture.snapshotRunId,
      rawHtmlSha256: packageValue.capture.rawHtmlSha256,
      publishStage: "shadow",
      shadowRestricted: true,
      enforcementDecision: enforcement.adapter.decision,
    };
    const bundleSha256 = computeRuntimeArtifactBundleSha256({
      htmlByPath: { "/": packageValue.capture.rawHtml },
      compiledTokenStyles: "",
      assetFingerprintMap: {},
      manifest,
    });
    const created = await createArtifact({
      siteId: operation.captureRuntimeSiteId,
      siteVersionId: operation.captureSiteVersionId,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
      bundleSha256,
      htmlByPath: { "/": packageValue.capture.rawHtml },
      compiledTokenStyles: "",
      assetFingerprintMap: {},
      manifest,
      publishStage: "shadow",
      shadowRestricted: true,
      artifactGovernance: enforcement.artifactGovernance,
    });
    await bindArtifactToVersion({
      siteVersionId: operation.captureSiteVersionId,
      artifactId: created.artifactId,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
    });
    artifact = await getArtifactById(created.artifactId);
  }
  if (!artifact || sha256Hex(artifact.htmlByPath["/"] ?? "") !== packageValue.capture.rawHtmlSha256) {
    throw new Error("mvp28_capture_artifact_conflict");
  }
  let raw = await getRawImportedSiteArtifact(operation.captureSiteVersionId);
  if (!raw) {
    await persistRawImportedSiteArtifact({
      siteId: operation.captureRuntimeSiteId,
      siteVersionId: operation.captureSiteVersionId,
      entryHtmlPath: "index.html",
      assetBasePath: ".",
      fileRows: [{
        path: "index.html",
        mediaType: "text/html; charset=utf-8",
        sizeBytes: Buffer.byteLength(packageValue.capture.rawHtml, "utf8"),
        sha256: packageValue.capture.rawHtmlSha256,
        bytes: Buffer.from(packageValue.capture.rawHtml, "utf8"),
      }],
      metadata: {
        sourceUrl: MVP28_SOURCE_URL,
        finalUrl: MVP28_SOURCE_URL,
        htmlByteLength: Buffer.byteLength(packageValue.capture.rawHtml, "utf8"),
        diagnostics: { codes: ["MVP28_AUTHENTICATED_CAPTURE_PACKAGE_PERSISTED"] },
        assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
      },
    });
    raw = await getRawImportedSiteArtifact(operation.captureSiteVersionId);
  }
  if (!raw) throw new Error("mvp28_raw_capture_missing");
  const rawEntry = await getRawTemplateSiteAsset({
    siteVersionId: operation.captureSiteVersionId,
    artifactId: raw.id,
    filePath: raw.entryHtmlPath,
  });
  if (!rawEntry || rawEntry.sha256 !== packageValue.capture.rawHtmlSha256) throw new Error("mvp28_raw_capture_conflict");
  return {
    snapshotId: packageValue.capture.snapshotId,
    snapshotRunId: packageValue.capture.snapshotRunId,
    capturedAt: packageValue.capture.capturedAt,
    artifactId: artifact.id,
    artifactBundleSha256: artifact.bundleSha256,
    htmlSha256: packageValue.capture.rawHtmlSha256,
  };
}

async function ensureGenerationVersion(packageValue: Mvp28ChsPackage): Promise<void> {
  const operation = deriveMvp28OperationIdentity();
  let version = await getSiteVersion(operation.generationSiteVersionId);
  if (!version) {
    const content = chsAstroSourceContent();
    const sourceHtml = createAstroStaticSiteProjectManifest(content).files
      .find((file) => file.path === "src/pages/index.astro")?.contents;
    if (!sourceHtml) throw new Error("mvp28_generated_source_missing");
    const page = importHtmlToPage({ slug: "/", title: content.siteName, html: sourceHtml });
    const canonical = buildCanonicalMigrationInput({
      sourceUrl: CHS_ASTRO_EVALUATION.sourceUrl,
      page,
      actor: GENERATION_ACTOR,
    });
    await createSiteVersionFromMigration({
      ...canonical,
      siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
      siteVersionId: operation.generationSiteVersionId,
      sourceUrl: CHS_ASTRO_EVALUATION.sourceUrl,
      actor: GENERATION_ACTOR,
      createSourceHostBinding: false,
      importProvenanceSummary: captureProvenance(packageValue),
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
    });
    await linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: operation.generationSiteVersionId,
      ownershipSiteId: CHS_ASTRO_EVALUATION.ownership.siteId,
    });
    version = await getSiteVersion(operation.generationSiteVersionId);
  }
  if (!version || version.siteId !== CHS_ASTRO_EVALUATION.runtimeSiteId) throw new Error("mvp28_generation_version_conflict");
}

async function ensureGenerationPreallocation(record: AstroResolvedCandidateRecord): Promise<void> {
  const version = await getSiteVersion(record.identity.siteVersionId);
  if (!version) throw new Error("mvp28_generation_version_missing");
  if (version.artifactId) return;
  const enforcement = evaluatePublishEnforcement({ siteVersion: version, stage: "shadow" });
  const manifest = {
    siteId: record.identity.runtimeSiteId,
    siteVersionId: record.identity.siteVersionId,
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
    siteId: record.identity.runtimeSiteId,
    siteVersionId: record.identity.siteVersionId,
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
    siteVersionId: record.identity.siteVersionId,
    artifactId: created.artifactId,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
  });
}

function captureProvenance(packageValue: Mvp28ChsPackage): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    executionIdentity: {
      snapshotId: packageValue.capture.snapshotId,
      snapshotRunId: packageValue.capture.snapshotRunId,
      snapshotStableRootDirAbs: "",
      snapshotRunRootDirAbs: "",
      requestId: packageValue.capture.requestId,
    },
    sourceMode: packageValue.capture.sourceMode,
    importFidelityStatus: packageValue.capture.fidelityStatus as RuntimeImportProvenanceSummary["importFidelityStatus"],
    renderedCaptureStatus: packageValue.capture.renderedCaptureStatus as RuntimeImportProvenanceSummary["renderedCaptureStatus"],
    renderedDomQuality: packageValue.capture.renderedDomQuality,
    screenshotCount: Number(packageValue.capture.viewportScreenshotCaptured) + Number(packageValue.capture.fullPageScreenshotCaptured),
    computedStyleSampleCount: packageValue.capture.computedStyleSampleCount,
    renderedCapture: {
      used: packageValue.capture.sourceMode === "rendered_dom",
      status: packageValue.capture.renderedCaptureStatus as RuntimeImportProvenanceSummary["renderedCaptureStatus"],
      quality: packageValue.capture.renderedDomQuality,
      domLength: packageValue.capture.renderedDomLength,
      nodeCount: packageValue.capture.renderedNodeCount,
      styleSampleCount: packageValue.capture.computedStyleSampleCount,
      styleCoverage: packageValue.capture.renderedNodeCount > 0
        ? Math.min(1, packageValue.capture.computedStyleSampleCount / packageValue.capture.renderedNodeCount)
        : 0,
      screenshots: {
        viewport: packageValue.capture.viewportScreenshotCaptured,
        fullPage: packageValue.capture.fullPageScreenshotCaptured,
      },
      execution: {
        runtimeKind: "unknown",
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: "unknown",
        failureCategory: packageValue.capture.renderedCaptureStatus === "failed" ? "environment" : "none",
        failureCode: null,
        browserLaunch: "not_attempted",
        navigation: "not_attempted",
        dom: packageValue.capture.renderedDomLength > 0 ? "captured" : "not_attempted",
        screenshot: packageValue.capture.viewportScreenshotCaptured || packageValue.capture.fullPageScreenshotCaptured
          ? "captured"
          : "none",
        styleSampling: packageValue.capture.computedStyleSampleCount > 0 ? "captured" : "not_attempted",
      },
    },
    importDiagnosticCodes: [...packageValue.capture.diagnosticCodes, "mvp28_authenticated_capture_package"],
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
  };
}

function assertPackageCandidateMatchesRecord(packageValue: Mvp28ChsPackage, record: AstroResolvedCandidateRecord): void {
  if (
    record.identity.candidateId !== packageValue.build.candidate.id ||
    record.candidate.contentSha256 !== packageValue.build.candidate.contentSha256 ||
    record.candidate.manifest.provenance.exportSha256 !== packageValue.build.receipt.exportSha256
  ) throw new Error("mvp28_candidate_record_conflict");
}
