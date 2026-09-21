import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAirshipCapturedMappingsToDraft,
  type ApplyAirshipCapturedMappingsToDraftInput,
} from "./airship-apply-captured-mappings-to-draft";
import { mapAirshipCapturedDiffToDraft } from "./airship-captured-diff-to-draft-mapper";
import type {
  AirshipSingleSiteDraftActor,
  AirshipSingleSiteDraftCreateInput,
  AirshipSingleSiteDraftRecord,
} from "../../single-site/airship-single-site-draft-service";

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const ARIS_MIGRATION_ID = "ebf62324-1e51-4435-abd7-004722fb48d6";

const BASE_HTML = [
  "<!doctype html><html><body>",
  '<main><section data-airship-section="hero">',
  '<h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>',
  '<p data-airship-element="hero-subheading">Advanced cybersecurity and infrastructure support.</p>',
  '<a href="#contact" data-airship-element="hero-cta">Contact Us</a>',
  "</section>",
  '<section data-airship-section="cta"><button data-airship-element="contact-cta">Send inquiry</button></section>',
  '<section data-airship-section="misc"><p data-airship-element="unknown-copy">Legacy copy.</p></section>',
  "</main></body></html>",
].join("");

const actor: AirshipSingleSiteDraftActor = {
  actorId: "superadmin-airship-apply-test",
  actorType: "human",
  actorRole: "platform_superadmin",
};

function seed(migrationId = CHS_MIGRATION_ID): AirshipSingleSiteDraftCreateInput {
  return {
    migrationId,
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    agencyId: null,
    sourceUrl: migrationId === CHS_MIGRATION_ID ? "https://www.chs.si/" : "https://www.aris-rent.com/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: "original-version",
      originalCloneRuntimeArtifactId: "original-artifact",
      improvedCandidateSiteVersionId: "candidate-version",
      improvedCandidateRuntimeArtifactId: "candidate-artifact",
    },
    draftEdits: [
      {
        id: `airship-${migrationId}-home-headline`,
        fieldKey: "headline",
        sectionKey: "hero",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Current source headline.",
        proposedTextContent: "Less risk. More control. Better IT.",
        reasonForChange: "Operator editable hero headline.",
        status: "proposed",
        previewImpact: "Hero headline changes in the Airship draft preview only.",
      },
      {
        id: `airship-${migrationId}-home-subheading`,
        fieldKey: "subheading",
        sectionKey: "hero",
        targetSectionPage: "Homepage / hero subheading",
        currentTextContentSummary: "Current source subheading.",
        proposedTextContent: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions.",
        reasonForChange: "Operator editable hero subheading.",
        status: "proposed",
        previewImpact: "Hero subheading changes in the Airship draft preview only.",
      },
      {
        id: `airship-${migrationId}-home-cta`,
        fieldKey: "ctaLabel",
        sectionKey: "cta",
        targetSectionPage: "Homepage / contact call-to-action",
        currentTextContentSummary: "Current source contact CTA.",
        proposedTextContent: "Contact CHS",
        reasonForChange: "Operator editable CTA label.",
        status: "proposed",
        previewImpact: "CTA label changes in the Airship draft preview only.",
      },
    ],
    metadata: {
      serviceVersion: "airship-3-single-site-draft-service:v1",
      projectionVersion: "airship-1-single-site-editor-readonly:v1",
      previewPersistence: "saved_airship_draft",
      liveSiteUrl: "https://example.test/",
      liveBoundary: "not_applied_to_live_site",
    },
    actor,
  };
}

function record(input = seed(), overrides: Partial<AirshipSingleSiteDraftRecord> = {}): AirshipSingleSiteDraftRecord {
  return {
    id: `draft-${input.migrationId}`,
    migrationId: input.migrationId,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    agencyId: input.agencyId,
    sourceUrl: input.sourceUrl,
    targetSiteVersionRefs: input.targetSiteVersionRefs,
    draftEdits: input.draftEdits,
    draftStatus: "draft",
    version: 3,
    semanticWatermark: "airship-single-site-editor-draft:test",
    metadata: input.metadata,
    createdByActorId: actor.actorId,
    updatedByActorId: actor.actorId,
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function fakeService(initialDraft = record()) {
  let current = initialDraft;
  const calls: string[] = [];
  return {
    calls,
    service: {
      async readCurrentDraft(migrationId: string) {
        calls.push(`read:${migrationId}`);
        return current;
      },
      async updateDraftEditText(input: Parameters<NonNullable<ApplyAirshipCapturedMappingsToDraftInput["service"]>["updateDraftEditText"]>[0]) {
        calls.push(`update:${input.draftEditId}`);
        current = {
          ...current,
          draftEdits: current.draftEdits.map((edit) =>
            edit.id === input.draftEditId
              ? { ...edit, proposedTextContent: input.proposedTextContent, status: "edited" }
              : edit,
          ),
          version: current.version + 1,
          updatedByActorId: input.actor.actorId,
        };
        return current;
      },
    },
    current: () => current,
  };
}

function mapping(afterHtml: string, migrationId = CHS_MIGRATION_ID) {
  return mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml,
    context: {
      migrationId,
      siteKey: migrationId === CHS_MIGRATION_ID ? "chs.si" : "aris-rent.com",
      route: "/",
    },
  });
}

function applyInput(
  overrides: Partial<ApplyAirshipCapturedMappingsToDraftInput> = {},
): ApplyAirshipCapturedMappingsToDraftInput {
  const draftSeed = seed();
  const fake = fakeService();
  return {
    migrationId: CHS_MIGRATION_ID,
    draftSeed,
    expectedDraft: {
      id: `draft-${CHS_MIGRATION_ID}`,
      version: 3,
    },
    mapping: mapping(BASE_HTML.replace("The CHS team helps your IT change with every technology wave.", "Captured CHS hero headline")),
    confirmed: true,
    actor,
    service: fake.service,
    ...overrides,
  };
}

test("applying exact hero headline mapping updates the draft", async () => {
  const fake = fakeService();
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({ service: fake.service }));

  assert.equal(result.status, "applied");
  assert.equal(result.appliedCount, 1);
  assert.equal(result.skippedCount, 0);
  assert.equal(result.draft.versionBefore, 3);
  assert.equal(result.draft.versionAfter, 4);
  assert.deepEqual(result.changedDraftFields.map((field) => field.draftFieldKey), ["headline"]);
  assert.equal(fake.current().draftEdits.find((edit) => edit.fieldKey === "headline")?.proposedTextContent, "Captured CHS hero headline");
  assert.match(result.readback, /Captured edits saved to draft/);
  assert.match(result.readback, /Preview not regenerated yet/);
  assert.equal(result.nextRecommendedAction, "Apply / generate preview");
});

test("applying exact CTA label mapping updates the draft", async () => {
  const fake = fakeService();
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({
    service: fake.service,
    mapping: mapping(BASE_HTML.replace("Send inquiry", "Contact CHS sales")),
  }));

  assert.equal(result.appliedCount, 1);
  assert.equal(result.changedDraftFields[0]?.draftFieldKey, "ctaLabel");
  assert.equal(fake.current().draftEdits.find((edit) => edit.fieldKey === "ctaLabel")?.proposedTextContent, "Contact CHS sales");
});

test("unsupported and probable mappings are skipped with readback", async () => {
  const fake = fakeService();
  const bodyHtml = BASE_HTML.replaceAll("hero-subheading", "hero-body");
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({
    service: fake.service,
    mapping: mapAirshipCapturedDiffToDraft({
      beforeHtml: bodyHtml,
      afterHtml: bodyHtml
        .replace("Advanced cybersecurity and infrastructure support.", "Probable body edit.")
        .replace("Legacy copy.", "Unsupported unknown edit."),
      context: { migrationId: CHS_MIGRATION_ID, siteKey: "chs.si", route: "/" },
    }),
  }));

  assert.equal(result.status, "applied");
  assert.equal(result.appliedCount, 0);
  assert.equal(result.skippedCount, 2);
  assert.equal(fake.calls.filter((call) => call.startsWith("update:")).length, 0);
  assert.deepEqual(result.skippedMappings.map((item) => item.reason), [
    "mapping_not_exact_safe_apply_candidate",
    "mapping_not_exact_safe_apply_candidate",
  ]);
});

test("apply without explicit confirmation is rejected", async () => {
  const fake = fakeService();
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({
    service: fake.service,
    confirmed: false,
  }));

  assert.equal(result.status, "rejected");
  assert.equal(result.appliedCount, 0);
  assert.equal(result.diagnostics.includes("airship_captured_mapping_apply_confirmation_required"), true);
  assert.equal(fake.calls.length, 0);
});

test("stale draft version is rejected", async () => {
  const fake = fakeService(record(seed(), { version: 4 }));
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({
    service: fake.service,
    expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: 3 },
  }));

  assert.equal(result.status, "rejected");
  assert.equal(result.diagnostics.includes("airship_captured_mapping_apply_stale_draft_version"), true);
  assert.deepEqual(fake.calls, [`read:${CHS_MIGRATION_ID}`]);
});

test("repeated apply is safely no-op when mapping value is already saved", async () => {
  const fake = fakeService();
  const first = await applyAirshipCapturedMappingsToDraft(applyInput({ service: fake.service }));
  const second = await applyAirshipCapturedMappingsToDraft(applyInput({
    service: fake.service,
    expectedDraft: { id: `draft-${CHS_MIGRATION_ID}`, version: first.draft.versionAfter ?? 4 },
  }));

  assert.equal(first.appliedCount, 1);
  assert.equal(second.appliedCount, 0);
  assert.equal(second.skippedMappings[0]?.reason, "mapped_value_already_saved_to_draft");
  assert.equal(fake.current().version, 4);
});

test("CHS and ARIS mappings stay separated", async () => {
  const fake = fakeService();
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({
    service: fake.service,
    mapping: mapping(BASE_HTML.replace("The CHS team helps your IT change with every technology wave.", "ARIS captured headline"), ARIS_MIGRATION_ID),
  }));

  assert.equal(result.status, "rejected");
  assert.equal(result.diagnostics.includes("airship_captured_mapping_apply_mapping_migration_mismatch"), true);
  assert.equal(fake.calls.length, 0);
});

test("no artifact regeneration or publish/live pointer/provider/source-capture path is invoked", async () => {
  const fake = fakeService();
  const result = await applyAirshipCapturedMappingsToDraft(applyInput({ service: fake.service }));

  assert.equal(result.safety.noArtifactRegeneration, true);
  assert.equal(result.safety.noPreviewRegeneration, true);
  assert.equal(result.safety.noPublishMutation, true);
  assert.equal(result.safety.noLivePointerMutation, true);
  assert.equal(result.safety.noDnsMutation, true);
  assert.equal(result.safety.noProviderMutation, true);
  assert.equal(result.safety.noSourceCaptureImport, true);
  assert.deepEqual(result.mutationFlags, {
    draftDataMutation: true,
    runtimeVersionMutation: false,
    activePointerMutation: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    artifactRegeneration: false,
    previewRegeneration: false,
    sourceCaptureImport: false,
    dnsMutation: false,
    providerMutation: false,
  });
  assert.deepEqual(fake.calls, [`read:${CHS_MIGRATION_ID}`, `update:airship-${CHS_MIGRATION_ID}-home-headline`]);
});
