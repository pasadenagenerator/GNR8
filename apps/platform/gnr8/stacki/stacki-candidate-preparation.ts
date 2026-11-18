import "server-only";
import { createStackiRecord, parseStackiScope, type StackiDraftScope } from './stacki-draft-contract';
import { prepareStackiAstro7Baseline } from './stacki-source-project';
import { createGeneratedOutputComposition, readGeneratedOutputReviewModel } from "../output-adapters/generated-output-publication-composition";
import { deterministicUuid } from "../output-adapters/astro-successor-operation-identity";
import { createAstroProductionCandidateId } from "../output-adapters/astro-production-candidate-record";
import { createBuildEvidenceForCandidate, readGeneratedOutputBuildEvidence, readGeneratedOutputContentManifest } from "../output-adapters/generated-output-evidence";
import { createGeneratedOutputContentManifest, evaluateGeneratedOutputTechnicalEligibility } from "../output-adapters/generated-output-eligibility";
import { buildAstroCandidateRuntimeArtifact, prepareGeneratedCandidateGit } from "../output-adapters/astro-candidate-promotion-service";
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from "../output-adapters/astro-production-candidate-object-store";
import { loadSourceBackedAstroGenerationSource } from "../output-adapters/source-backed-astro-input";
import { sha256Hex, stableStringify } from "../runtime/deterministic";
import { computeRuntimeArtifactBundleSha256 } from "../runtime/astro-artifact-materialization";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { resolvedGitHubStackiStore, stackiLazyAssetsEnabled } from './stacki-github-config';
import { loadStackiSource, planStackiRuntimeAssets } from "./stacki-source-loader";
import { createStackiCandidateProducer, STACKI_CANDIDATE_PRODUCER } from "./stacki-candidate-producer";
import { parseStackiCandidateSelection, type StackiCandidateSelection } from "./stacki-candidate-selection";
import { isAstroObjectBackedResolvedRecord, persistedAstroObjectBackedRecordFromResolved, measureAstroObjectBackedCandidateRecordBytes } from "../output-adapters/astro-production-candidate-object-record";
import { measureAstroProductionCandidateRecordBytes } from "../output-adapters/astro-production-candidate-record";

export function stackiCandidateIdentity(selection: StackiCandidateSelection, sourceArtifactSha256: string, preparation?: "astro7") {
  const seed = stableStringify({ producer: `${STACKI_CANDIDATE_PRODUCER}:v1`, selection, sourceArtifactSha256, ...(preparation ? { preparation: "gnr8-stacki-astro5-to-7-baseline:v1" } : {}) });
  return { siteVersionId: deterministicUuid(seed + ":version"), candidateId: createAstroProductionCandidateId(deterministicUuid(seed + ":candidate")),
    artifactId: deterministicUuid(seed + ":artifact"), variantId: deterministicUuid(seed + ":variant") };
}

/** Worker-only. Request authorization precedes dispatch; ownership and exact
 * immutable inputs are checked again here. This never approves or publishes. */
export async function prepareStackiCandidate(input: {
  selection: StackiCandidateSelection; sourceArtifactId: string; sourceArtifactSha256: string; actor: string;
  /** Trusted server operation only; never inferred from Open/Save. */
  prepareBaseline?: "astro7";
}, dependencies: {
  composition?: typeof createGeneratedOutputComposition;
  store?: Pick<typeof import('../runtime/runtime-store'), 'getArtifactById' | 'createSiteVersionFromMigration' | 'linkRuntimeSiteVersionOwnershipIfAllowed' | 'getRawImportedSiteArtifact' | 'getRawTemplateSiteAsset' | 'createArtifact' | 'bindArtifactToVersion'>;
  lifecycle?: Pick<typeof import('../runtime/version-lifecycle-enforcer'), 'transitionSiteVersionState'>;
  readModel?: typeof readGeneratedOutputReviewModel;
  loadSource?: typeof loadStackiSource;
  readDraft?: SupabaseStackiDraftStore['revision'];
  authorizePreparation?: (scope: StackiDraftScope) => Promise<{userId:string;agencyId:string}>;
  draftStore?: Pick<SupabaseStackiDraftStore, 'latest' | 'revision' | 'save'>;
  loadCaptureSource?: typeof loadSourceBackedAstroGenerationSource;
  createProducer?: typeof createStackiCandidateProducer;
} = {}) {
  const selection = parseStackiCandidateSelection(input.selection);
  const c = (dependencies.composition ?? createGeneratedOutputComposition)();
  const store = dependencies.store ?? await import("../runtime/runtime-store");
  const lifecycle = dependencies.lifecycle ?? await import("../runtime/version-lifecycle-enforcer");
  const readModel = dependencies.readModel ?? readGeneratedOutputReviewModel;
  const source = await c.runtimeStore.readContext(selection.scope.siteVersionId);
  if (!source?.artifact || source.artifact.id !== input.sourceArtifactId || source.artifact.bundleSha256 !== input.sourceArtifactSha256)
    throw new Error("stacki_candidate_source_stale");
  const sourceArtifact = source.artifact;
  const authorize = async (_scope: unknown, siteVersionId: string) => {
    if (input.prepareBaseline) {
      // The Platform caller must supply its existing pilot authorization; never
      // import request/session dependencies into the Worker bundle. Fail closed.
      if (!dependencies.authorizePreparation) throw new Error('stacki_baseline_authorization_required');
      const actor = await dependencies.authorizePreparation({ ...selection.scope, siteVersionId });
      if (actor.userId !== input.actor || actor.agencyId !== selection.scope.agencyId) throw new Error('stacki_baseline_access_denied');
    }
    const owner = await c.ownershipResolver.resolve({ siteVersionId, expectedRuntimeSiteId: source.siteVersion.siteId });
    if (owner.ownershipSiteId !== selection.scope.siteId || owner.agencyId !== selection.scope.agencyId || owner.organizationId !== selection.scope.clientId)
      throw new Error("stacki_candidate_ownership_mismatch");
    return owner;
  };
  await authorize(selection.scope, selection.scope.siteVersionId);
  const sourceReview = await readModel(source.siteVersion.id, c, source);
  if (sourceReview.decision.technical.status !== "PASS") {
    const reasons = [...new Set(sourceReview.decision.technical.blockerReasons.map(reason => reason.code.split(":")[0]!
      .replace(/[^a-z0-9_]/g, "")))];
    throw new Error(`stacki_candidate_source_not_supported:${reasons.join(",") || "technical_review"}`);
  }
  const build = readGeneratedOutputBuildEvidence(source.artifact.manifest);
  const content = readGeneratedOutputContentManifest(source.artifact.manifest);
  if (!build || !content) throw new Error("stacki_candidate_source_evidence_missing");
  const identity = stackiCandidateIdentity(selection, input.sourceArtifactSha256, input.prepareBaseline);
  const editLineage = { ...selection, sourceArtifactId: input.sourceArtifactId, sourceArtifactSha256: input.sourceArtifactSha256,
    canonicalRelation: "source-edited-canonical-not-synchronized:v1" };
  const lineageKey = input.prepareBaseline ? 'sourcePreparation' : 'stackiRevision';
  const lineage = input.prepareBaseline ? { format: 'gnr8-stacki-astro5-to-7-baseline:v1', sourceScope: selection.scope,
    sourceArtifactId: input.sourceArtifactId, sourceArtifactSha256: input.sourceArtifactSha256,
    sourceSnapshotSha256: build.sourceSnapshotSha256 } : editLineage;
  let existing = await c.runtimeStore.readContext(identity.siteVersionId);
  // createArtifact is append-only per version, but its binding is a separate
  // write. Reconcile that exact retained row before spending another build.
  if (existing && !existing.artifact) {
    const pending = await c.client.from('gnr8_runtime_artifacts').select('id').eq('site_version_id', identity.siteVersionId).maybeSingle();
    if (pending.error) throw new Error('stacki_candidate_recovery_unavailable');
    if (pending.data) {
      const artifact = await store.getArtifactById(pending.data.id);
      if (!artifact || artifact.siteId !== source.siteVersion.siteId ||
        stableStringify((artifact.manifest.generatedOutputSourceWorkspace as Record<string, unknown>)?.[lineageKey]) !== stableStringify(lineage) ||
        artifactHash(artifact) !== artifact.bundleSha256)
        throw new Error('stacki_candidate_lineage_conflict');
      await authorize(selection.scope, identity.siteVersionId);
      await store.bindArtifactToVersion({ siteVersionId: identity.siteVersionId, artifactId: artifact.id, rendererCompatibilityVersion: artifact.rendererCompatibilityVersion });
      existing = await c.runtimeStore.readContext(identity.siteVersionId);
    }
  }
  const result = async (model: Awaited<ReturnType<typeof readGeneratedOutputReviewModel>>) => {
    const owner = await authorize(selection.scope, identity.siteVersionId);
    const record = await c.candidateRepository.read({ candidateId: identity.candidateId, trustedScope: owner });
    const objectPayloadUtf8Bytes = isAstroObjectBackedResolvedRecord(record)
      ? Object.values(record.objectManifest).reduce((sum, ref) => sum + ref.sizeBytes, 0) + (record.stylesObjectRef?.sizeBytes ?? 0) : 0;
    return { ...identity, artifactId: model.artifactId, model,
      candidateSizes: { registryRecordUtf8Bytes: isAstroObjectBackedResolvedRecord(record)
        ? measureAstroObjectBackedCandidateRecordBytes(persistedAstroObjectBackedRecordFromResolved(record))
        : measureAstroProductionCandidateRecordBytes(record),
        resolvedCandidateUtf8Bytes: isAstroObjectBackedResolvedRecord(record)
          ? Buffer.byteLength(stableStringify(record.candidate), "utf8")
          : measureAstroProductionCandidateRecordBytes(record), objectPayloadUtf8Bytes } };
  };
  if (existing?.artifact) {
    await authorize(selection.scope, identity.siteVersionId);
    if (stableStringify((existing.artifact.manifest.generatedOutputSourceWorkspace as Record<string, unknown>)?.[lineageKey]) !== stableStringify(lineage))
      throw new Error("stacki_candidate_lineage_conflict");
    if (existing.siteVersion.state === "DRAFT") await lifecycle.transitionSiteVersionState({ siteVersionId: identity.siteVersionId, nextState: "READY_FOR_REVIEW", actor: input.actor, source: "manual" });
    const model = await readModel(identity.siteVersionId, c);
    if (model.decision.technical.status !== "PASS") throw new Error("stacki_candidate_existing_invalid");
    return result(model);
  }
  const drafts = dependencies.draftStore ?? await resolvedGitHubStackiStore(selection.scope) ??
    new SupabaseStackiDraftStore(c.client, process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? "");
  let checkpoint = input.prepareBaseline ? null : await (dependencies.readDraft ?? drafts.revision.bind(drafts))(selection.scope, selection.revision);
  let baseline = await (dependencies.loadSource ?? loadStackiSource)(selection.scope, c.client, authorize, Boolean(input.prepareBaseline));
  const workspace = source.artifact.manifest.generatedOutputSourceWorkspace as {
    files: Array<{ path: string; contents: string; bytes: number; sha256: string; role: string }>;
    assetEvidence: Array<{ path: string; mediaType: string }>;
    [key: string]: unknown;
  };
  await authorize(selection.scope, build.sourceCapture.siteVersionId);
  const capture = await c.runtimeStore.readContext(build.sourceCapture.siteVersionId);
  const raw = await store.getRawImportedSiteArtifact(build.sourceCapture.siteVersionId);
  if (!capture?.artifact || !raw) throw new Error("stacki_candidate_capture_missing");
  const captureSource = await (dependencies.loadCaptureSource ?? loadSourceBackedAstroGenerationSource)({ siteVersion: capture.siteVersion, rawArtifact: raw, getRawAsset: store.getRawTemplateSiteAsset });
  const upgraded = input.prepareBaseline ? prepareStackiAstro7Baseline({ files: baseline,
    expectedSourceSnapshotSha256: build.sourceSnapshotSha256 }) : null;
  // Ordinary edits are still validated against the original baseline BEFORE writes.
  const makeProducer = (saved: NonNullable<typeof checkpoint>, base: typeof baseline) =>
    (dependencies.createProducer ?? createStackiCandidateProducer)({ checkpoint: saved, scope: input.prepareBaseline ? saved.scope : selection.scope,
      expectedRevision: input.prepareBaseline ? saved.revision : selection.revision, expectedSha256: input.prepareBaseline ? saved.sha256 : selection.sha256,
      baseline: base, sourcePaths: workspace.files.map(f => f.path),
      ownedImagePaths: workspace.assetEvidence.filter(a => a.mediaType.startsWith("image/")).map(a => a.path),
    }, { ownedAssetFingerprints: sourceArtifact.assetFingerprintMap, ownedStylesheetEvidence: captureSource.ownedStylesheetEvidence });
  let preparedProducer = checkpoint ? makeProducer(checkpoint, baseline) : null;
  if (!existing) await store.createSiteVersionFromMigration({ siteId: source.siteVersion.siteId, siteVersionId: identity.siteVersionId,
    sourceUrl: build.sourceCapture.sourceUrl, actor: input.actor, pages: source.siteVersion.pages,
    importProvenanceSummary: source.siteVersion.importProvenanceSummary,
    rendererCompatibilityVersion: source.siteVersion.rendererCompatibilityVersion, createSourceHostBinding: false });
  await store.linkRuntimeSiteVersionOwnershipIfAllowed({ siteVersionId: identity.siteVersionId, ownershipSiteId: selection.scope.siteId });
  const ownership = await authorize(selection.scope, identity.siteVersionId);
  const target = await c.runtimeStore.readContext(identity.siteVersionId);
  if (!target || target.siteVersion.state !== "DRAFT") throw new Error("stacki_candidate_state_conflict");
  if (upgraded) {
    const newScope = { ...selection.scope, siteVersionId: identity.siteVersionId };
    const access = async () => { await authorize(newScope, newScope.siteVersionId); };
    await access();
    const githubDrafts = await resolvedGitHubStackiStore(newScope);
    const baselineDrafts = githubDrafts ?? drafts;
    const head = await baselineDrafts.latest(newScope);
    if (head) {
      checkpoint = await baselineDrafts.revision(newScope, 1);
    } else {
      try {
        if (githubDrafts) {
          const plan = await planStackiRuntimeAssets(selection.scope, c.client, authorize);
          // A previously migrated source branch already owns verified retained
          // blobs. Reuse only exact byte-for-byte matches to the capture plan.
          const prior = workspace.stackiRevision as Record<string, unknown> | undefined;
          const sourceScope = prior ? parseStackiCandidateSelection({ scope: prior.scope, revision: prior.revision,
            sha256: prior.sha256 }).scope : selection.scope;
          await authorize(sourceScope, sourceScope.siteVersionId);
          const sourceGitHubStore=await resolvedGitHubStackiStore(sourceScope);
          const sourceAssets = sourceGitHubStore
            ? (await sourceGitHubStore.prepared())?.assets : null;
          const byName = new Map(sourceAssets?.map(asset => [asset.name, asset]));
          const matches = sourceAssets && plan.entries.every(entry => {
            const asset = byName.get(entry.name);
            return asset?.body.length === entry.bytes && sha256Hex(asset.body) === entry.sha256;
          });
          const assets = matches ? plan.entries.map(entry => byName.get(entry.name)!) : await plan.read(plan.entries, failure => {
            console.error('[stacki-preparation] RETAINED_ASSET_READ_FAILED', failure);
          });
          checkpoint = await githubDrafts.migrate(createStackiRecord(newScope, input.actor,
            { expectedRevision: 0, files: upgraded.files }), assets, access);
        } else {
          checkpoint = await baselineDrafts.save(newScope, input.actor,
            { expectedRevision: 0, files: upgraded.files }, access);
        }
      }
      catch (error) {
        // Resolve an initialization race/lost acknowledgement only from the
        // immutable first revision; never overwrite a later user's draft.
        const retained = await baselineDrafts.latest(newScope);
        if (!retained) throw error;
        checkpoint = await baselineDrafts.revision(newScope, 1);
      }
    }
    if (stableStringify(checkpoint.files) !== stableStringify(upgraded.files)) throw new Error('stacki_baseline_checkpoint_conflict');
    // A reconciled Git write alone must not hide a failed delivery preparation.
    if (githubDrafts && stackiLazyAssetsEnabled()) await githubDrafts.preparedForOpen();
    await access();
    baseline = upgraded.files;
    preparedProducer = makeProducer(checkpoint, baseline);
  }
  if (!checkpoint || !preparedProducer) throw new Error('stacki_candidate_checkpoint_missing');
  const { selected, producer, inputId } = preparedProducer;
  const persistedLineage = input.prepareBaseline ? { scope: checkpoint.scope, revision: checkpoint.revision, sha256: checkpoint.sha256,
    sourceArtifactId: input.sourceArtifactId, sourceArtifactSha256: input.sourceArtifactSha256,
    canonicalRelation: 'source-edited-canonical-not-synchronized:v1' } : editLineage;
  // Database timestamps may include microseconds/offsets; the candidate contract uses canonical UTC milliseconds.
  const candidateCreatedAt = new Date(target.siteVersion.createdAt).toISOString();
  const candidate = await producer.produce({ candidateId: identity.candidateId, candidateCreatedAt,
    ownership, syntheticInput: { fixtureId: inputId } });
  const receipt = producer.readBuildReceipt(identity.candidateId);
  if (!receipt || receipt.generatedSourceSha256 !== selected.sourceSnapshot.aggregateSha256)
    throw new Error("stacki_candidate_build_source_mismatch");
  const record = (await c.candidateRepository.create({ candidate, trustedScope: ownership, registration: {
    registeredByActorId: input.actor, producerKind: STACKI_CANDIDATE_PRODUCER, producerVersion: "v1", producerRef: inputId,
    idempotencyKey: `stacki:${identity.siteVersionId}`, correlationId: `stacki:${identity.siteVersionId}`,
  } })).record;
  const contentManifest = createGeneratedOutputContentManifest({ scope: { ...content.scope, allowedPublishStages: ["shadow"] }, requiredNavigation: content.requiredNavigation,
    sourceRef: `${content.sourceRef}:stacki:${checkpoint.revision}:${checkpoint.sha256}`,
    requiredContent: content.requiredContent.map(requirement => {
      const replacement = selected.changes.find(change => change.kind === "text" && change.before === requirement.value);
      return replacement ? { ...requirement, value: replacement.after } : requirement;
    }),
    requiredAssets: [...content.requiredAssets.filter(asset => !Object.hasOwn(selected.uploadedImages, asset.path.slice(1))),
      ...Object.entries(selected.uploadedImages).map(([path, image]) => ({ path: '/' + path, sha256: image.sha256 }))],
  });
  const buildEvidence = createBuildEvidenceForCandidate({ record, receipt, sourceCapture: build.sourceCapture, contentManifest,
    submissionAttestation: { mode: "direct_server_execution", operationId: identity.siteVersionId,
      packageSha256: checkpoint.sha256, submittedByActorId: input.actor, receivedAt: receipt.buildCompletedAt } });
  const sourceWorkspace = { ...workspace, stackiRevision: persistedLineage, stackiStyleWarnings: selected.styleWarnings, ...(upgraded ? { sourcePreparation: lineage } : {}), stackiImageProjection: "src-image-public-mirror:v1", files: selected.files.map(file => ({
    path: file.path, role: workspace.files.find(f => f.path === file.path)?.role ?? 'asset',
    ...(selected.uploadedImages[file.path.startsWith('public/') ? file.path.slice(7) : file.path] ? { base64: file.body.toString('base64') } : { contents: file.body.toString("utf8") }),
    bytes: file.body.length, sha256: sha256Hex(file.body),
  })) };
  const artifact = buildAstroCandidateRuntimeArtifact({ siteVersion: target.siteVersion,
    artifact: { ...source.artifact, id: identity.artifactId, siteVersionId: identity.siteVersionId, createdAt: target.siteVersion.createdAt },
    record, ownership, input: { actorUserId: input.actor, siteVersionId: identity.siteVersionId, candidateId: identity.candidateId,
      expectedContentSha256: record.candidate.contentSha256, expectedStorageSha256: record.storageSha256,
      idempotencyKey: `stacki:${identity.siteVersionId}`, generatedOutputEvidence: { buildEvidence, contentManifest, sourceWorkspace } } });
  artifact.bundleSha256 = artifactHash(artifact);
  const technical = evaluateGeneratedOutputTechnicalEligibility({ siteVersion: target.siteVersion, artifact, authoritativeOwnership: ownership,
    candidateRecord: record, buildEvidence, contentManifest, sourceCaptureSiteVersion: capture.siteVersion, sourceCaptureArtifact: capture.artifact });
  if (technical.status !== "PASS") throw new Error(`stacki_candidate_blocked:${technical.blockerReasons.map(b => b.code).join(",")}`);
  await authorize(selection.scope, identity.siteVersionId);
  const generatedGitArchive = await prepareGeneratedCandidateGit({
    ...artifact,...('exportedFiles' in record.candidate?{exportedFiles:record.candidate.exportedFiles}:{})
  },ownership);
  if (generatedGitArchive) {
    artifact.manifest = {...artifact.manifest,generatedGitArchive};
    artifact.bundleSha256 = artifactHash(artifact);
  }
  const persisted = await store.createArtifact(artifact);
  await store.bindArtifactToVersion({ siteVersionId: identity.siteVersionId, artifactId: persisted.artifactId, rendererCompatibilityVersion: artifact.rendererCompatibilityVersion });
  await lifecycle.transitionSiteVersionState({ siteVersionId: identity.siteVersionId, nextState: "READY_FOR_REVIEW", actor: input.actor,
    source: "manual", details: { workflow: STACKI_CANDIDATE_PRODUCER, stackiRevision: persistedLineage, ...(upgraded ? { sourcePreparation: lineage } : {}) } });
  const model = await readModel(identity.siteVersionId, c);
  if (model.candidateId !== identity.candidateId || model.candidateContentSha256 !== record.candidate.contentSha256 ||
    model.decision.technical.status !== "PASS" || model.decision.review.status !== "MISSING")
    throw new Error("stacki_candidate_readback_mismatch");
  return result(model);
}

function artifactHash(artifact: import('../runtime/types').RuntimeArtifact) {
  return computeRuntimeArtifactBundleSha256({ htmlByPath: artifact.htmlByPath, compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap, manifest: artifact.manifest });
}

/** Explicit server-side preparation from an immutable saved artifact. No source
 * code/hash supplied by the browser is accepted as a new baseline. The synthetic
 * selection below is only an operation identity; the writer stores a REAL first
 * checkpoint in the successor scope before candidate creation. */
export async function prepareStackiAstro7Version(input: {
  scope: StackiDraftScope; sourceArtifactId: string; sourceArtifactSha256: string; actor: string;
}, dependencies: Parameters<typeof prepareStackiCandidate>[1] = {}) {
  return prepareStackiCandidate({ ...input, selection: { scope: parseStackiScope(input.scope), revision: 1,
    sha256: input.sourceArtifactSha256 }, prepareBaseline: 'astro7' }, dependencies);
}
