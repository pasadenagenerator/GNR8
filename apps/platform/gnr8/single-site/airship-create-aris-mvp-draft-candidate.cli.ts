import "server-only";

import { getSuperadminPool } from "@/src/superadmin/db";
import { getActivePointerForSite } from "../runtime/runtime-store";
import { createAirshipSingleSiteDraftCandidate } from "./airship-single-site-draft-candidate-service";
import { AirshipSingleSiteDraftService, type AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";
import {
  AIRSHIP_ARIS_CAPTURE_RUN_ID,
  AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
  AIRSHIP_ARIS_MIGRATION_ID,
  AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
  AIRSHIP_ARIS_RUNTIME_SITE_ID,
  AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID,
  AIRSHIP_ARIS_SOURCE_PACKAGE_REF,
  AIRSHIP_ARIS_SOURCE_URL,
  arisAirshipDraftContainsForbiddenCopy,
  arisAirshipMvpDraftFieldsForReadback,
  buildArisAirshipMvpDraftSeed,
} from "./airship-aris-mvp-draft";

type CountSnapshot = {
  activePointer: { siteVersionId: string; artifactId: string } | null;
  hostBindingsForRuntimeSite: number;
  arisAirshipHostBindings: number;
  sourceEvidenceReviewCount: number;
  sourceEvidenceRefCount: number;
  sourceEvidenceItemCount: number;
  sourceEvidenceEventCount: number;
  draftCount: number;
  draftEventCount: number;
  draftCandidateCount: number;
  candidateReviewCount: number;
  publishReadinessCount: number;
  migrationStateEventCount: number;
};

function assertArisOutputSafe(value: unknown) {
  if (arisAirshipDraftContainsForbiddenCopy(value)) {
    throw new Error("airship_aris_mvp_output_contains_forbidden_copy_or_diagnostics");
  }
}

async function countRows(sql: string, params: unknown[]): Promise<number> {
  const result = await getSuperadminPool().query<{ count: string }>(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

async function countSnapshot(): Promise<CountSnapshot> {
  const [
    activePointer,
    hostBindingsForRuntimeSite,
    arisAirshipHostBindings,
    sourceEvidenceReviewCount,
    sourceEvidenceRefCount,
    sourceEvidenceItemCount,
    sourceEvidenceEventCount,
    draftCount,
    draftEventCount,
    draftCandidateCount,
    candidateReviewCount,
    publishReadinessCount,
    migrationStateEventCount,
  ] = await Promise.all([
    getActivePointerForSite(AIRSHIP_ARIS_RUNTIME_SITE_ID),
    countRows(
      "select count(*) from public.gnr8_runtime_host_bindings where site_id = $1::text",
      [AIRSHIP_ARIS_RUNTIME_SITE_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_runtime_host_bindings where lower(host) = lower($1::text)",
      ["aris-airship.app.pasadenagenerator.com"],
    ),
    countRows(
      "select count(*) from public.gnr8_single_site_source_evidence_reviews where migration_id = $1::uuid",
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_single_site_source_evidence_review_refs where review_id = $1::uuid",
      [AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_single_site_source_evidence_review_items where review_id = $1::uuid",
      [AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_single_site_source_evidence_review_events where review_id = $1::uuid",
      [AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_airship_single_site_editor_drafts where migration_id = $1::uuid",
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_airship_single_site_editor_draft_events where migration_id = $1::uuid",
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
    countRows(
      `
      select count(*)
      from public.gnr8_runtime_site_versions
      where import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'migrationId' = $1::text
      `,
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_airship_internal_preview_candidate_reviews where migration_id = $1::uuid",
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
    countRows(
      "select count(*) from public.gnr8_airship_publish_readiness_packages where migration_id = $1::uuid",
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
    countRows(
      `
      select count(*)
      from public.gnr8_single_site_migration_state_events
      where migration_id = $1::uuid
        and transition_key in ('capture-started', 'capture-completed', 'operator_dry_run', 'shadow_publish', 'publish', 'rollback')
      `,
      [AIRSHIP_ARIS_MIGRATION_ID],
    ),
  ]);

  return {
    activePointer,
    hostBindingsForRuntimeSite,
    arisAirshipHostBindings,
    sourceEvidenceReviewCount,
    sourceEvidenceRefCount,
    sourceEvidenceItemCount,
    sourceEvidenceEventCount,
    draftCount,
    draftEventCount,
    draftCandidateCount,
    candidateReviewCount,
    publishReadinessCount,
    migrationStateEventCount,
  };
}

async function readSourceEvidenceReview() {
  const result = await getSuperadminPool().query(
    `
    select
      r.id::text,
      r.tenant_id::text,
      r.review_status::text,
      r.review_decision::text,
      r.completeness_status::text,
      r.clone_generation_allowed,
      r.accepted_degraded_capture,
      r.retry_required,
      r.warnings_json,
      r.blockers_json,
      r.review_limitations_json,
      m.id::text as migration_id,
      m.source_url::text,
      m.client_id::text,
      m.ownership_site_id::text,
      m.runtime_site_id::text,
      m.runtime_site_version_id::text,
      m.current_state::text,
      m.current_stage::text
    from public.gnr8_single_site_source_evidence_reviews r
    join public.gnr8_single_site_migrations m on m.id = r.migration_id
    where r.id = $1::uuid
      and r.migration_id = $2::uuid
    limit 1
    `,
    [AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID, AIRSHIP_ARIS_MIGRATION_ID],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("airship_aris_source_evidence_review_missing");
  if (row.source_url !== AIRSHIP_ARIS_SOURCE_URL) throw new Error("airship_aris_source_url_mismatch");
  return row;
}

function draftWithEditedRows(draft: AirshipSingleSiteDraftRecord): AirshipSingleSiteDraftRecord {
  return {
    ...draft,
    draftEdits: draft.draftEdits.map((edit) =>
      edit.status === "accepted" || edit.status === "edited"
        ? edit
        : { ...edit, status: "edited" as const },
    ),
  };
}

async function main() {
  const before = await countSnapshot();
  const sourceEvidenceReview = await readSourceEvidenceReview();
  const seed = buildArisAirshipMvpDraftSeed({
    tenantId: typeof sourceEvidenceReview.tenant_id === "string" ? sourceEvidenceReview.tenant_id : null,
  });
  const service = new AirshipSingleSiteDraftService();
  const draft = await service.createOrReuseDraft({
    ...seed,
    actor: {
      actorId: "codex:mvp-recovery-15-aris-airship",
      actorType: "system",
      actorRole: "internal_operator",
    },
    correlationId: `mvp-recovery-15:${AIRSHIP_ARIS_MIGRATION_ID}`,
    idempotencyKey: `mvp-recovery-15:aris-airship-draft:${AIRSHIP_ARIS_SOURCE_PACKAGE_REF}`,
  });
  const draftForCandidate = draftWithEditedRows(draft);
  assertArisOutputSafe(draftForCandidate);

  const candidate = await createAirshipSingleSiteDraftCandidate({
    draft: draftForCandidate,
    actor: "codex:mvp-recovery-15-aris-airship",
    sourceLiveSiteVersionId: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
    sourceLiveRuntimeArtifactId: AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
  });
  assertArisOutputSafe(candidate);

  const after = await countSnapshot();
  const artifact = await getSuperadminPool().query<{ html_by_path: Record<string, string>; manifest: Record<string, unknown>; publish_stage: string }>(
    `
    select html_by_path, manifest, publish_stage::text
    from public.gnr8_runtime_artifacts
    where id = $1::uuid
    limit 1
    `,
    [candidate.candidateRuntimeArtifactId],
  );
  assertArisOutputSafe(artifact.rows[0]);

  process.stdout.write(`${JSON.stringify({
    status: "mvp_recovery_aris_airship_draft_candidate_ready_no_pointer_mutation",
    source: {
      sourceUrl: AIRSHIP_ARIS_SOURCE_URL,
      migrationId: AIRSHIP_ARIS_MIGRATION_ID,
      sourceEvidenceReviewId: AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID,
      sourcePackageRef: AIRSHIP_ARIS_SOURCE_PACKAGE_REF,
      captureRunId: AIRSHIP_ARIS_CAPTURE_RUN_ID,
      runtimeArtifactUsedAsTruth: false,
    },
    sourceEvidenceReview,
    draft: {
      id: draft.id,
      version: draft.version,
      status: draft.draftStatus,
      fields: arisAirshipMvpDraftFieldsForReadback(),
      metadata: draft.metadata,
    },
    candidate,
    preview: {
      internalRoute: candidate.previewRoute,
      internalUrl: `https://app.pasadenagenerator.com${candidate.previewRoute}`,
      publicHostCreated: false,
    },
    readback: {
      before,
      after,
      activePointerUnchanged: JSON.stringify(before.activePointer) === JSON.stringify(after.activePointer),
      noActivePointerExists: after.activePointer === null,
      noHostBindingCreated: before.hostBindingsForRuntimeSite === after.hostBindingsForRuntimeSite && before.arisAirshipHostBindings === after.arisAirshipHostBindings,
      noArisAirshipHostBindingExists: after.arisAirshipHostBindings === 0,
      noCandidateReviewCreated: before.candidateReviewCount === after.candidateReviewCount,
      noPublishReadinessCreated: before.publishReadinessCount === after.publishReadinessCount,
      noSourceEvidenceSecondRun: before.sourceEvidenceReviewCount === after.sourceEvidenceReviewCount,
      noSourceEvidenceRefsOrItemsMutated:
        before.sourceEvidenceRefCount === after.sourceEvidenceRefCount &&
        before.sourceEvidenceItemCount === after.sourceEvidenceItemCount &&
        before.sourceEvidenceEventCount === after.sourceEvidenceEventCount,
    },
    forbiddenOperations: {
      activePointerMutation: false,
      hostBindingCreation: false,
      promote: false,
      rollback: false,
      dryRun: false,
      shadowPublish: false,
      sourceCaptureSecondRun: false,
      aiProviderCall: false,
    },
    sourceLimitationsCarriedForward: [
      "runtime artifact preview mode was degraded and ignored as source truth",
      "finalSiteModelAvailable=false and rendererContractAvailable=false from recovery context",
      "warning PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML carried forward",
      "simplified one-page Airship MVP draft only; exact clone fidelity is not claimed",
    ],
  }, null, 2)}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSuperadminPool().end().catch(() => undefined);
  });
