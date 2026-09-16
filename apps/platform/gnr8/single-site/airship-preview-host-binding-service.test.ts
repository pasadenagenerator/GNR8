import assert from "node:assert/strict";
import test from "node:test";

import {
  createAirshipPreviewHostBinding,
  readAirshipPreviewHostReadback,
  suggestedAirshipPreviewHost,
} from "./airship-preview-host-binding-service";
import type { RuntimePreviewHostBinding } from "@/gnr8/runtime/runtime-store";

const SITE_ID = "site_6b859cc1599a5b6642dc";
const CANDIDATE_VERSION_ID = "6d712ab9-f48e-49a3-9c26-03915365d746";
const ARTIFACT_ID = "8073651e-510b-47e7-8363-8a742b7967db";
const HOST = "aris-airship.app.pasadenagenerator.com";

function binding(overrides: Partial<RuntimePreviewHostBinding> = {}): RuntimePreviewHostBinding {
  return {
    id: "e73e5d73-cbbe-4ff7-9cdb-75c0ee6aa2ae",
    siteId: SITE_ID,
    host: HOST,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateArtifactId: ARTIFACT_ID,
    status: "ACTIVE",
    bindingKind: "candidate_preview",
    createdAt: "2026-09-15T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    ...overrides,
  };
}

function deps(input: {
  existing?: RuntimePreviewHostBinding | null;
  artifactId?: string | null;
  activePointer?: { siteVersionId: string; artifactId: string } | null;
  onUpsert?: (value: unknown) => void;
} = {}) {
  return {
    async getSiteVersionArtifactBinding() {
      return { siteId: SITE_ID, artifactId: input.artifactId ?? ARTIFACT_ID };
    },
    async getPreviewHostBindingForHost() {
      return input.existing ?? null;
    },
    async getActivePointerForSite() {
      return input.activePointer ?? null;
    },
    async upsertPreviewHostBinding(value: Parameters<typeof createAirshipPreviewHostBinding>[0] & { siteId: string; host: string; status: "ACTIVE"; bindingKind: string }) {
      input.onUpsert?.(value);
      return binding({
        siteId: value.siteId,
        host: value.host,
        candidateSiteVersionId: value.candidateSiteVersionId,
        candidateArtifactId: value.candidateArtifactId,
      });
    },
  };
}

test("airship preview host suggests the site-slug-airship app host convention", () => {
  assert.equal(suggestedAirshipPreviewHost({ siteLabel: "aris.si" }), "aris-airship.app.pasadenagenerator.com");
  assert.equal(suggestedAirshipPreviewHost({ sourceUrl: "https://www.chs.si/" }), "chs-airship.app.pasadenagenerator.com");
});

test("airship preview host readback separates preview host, active pointer, and external domain", async () => {
  const readback = await readAirshipPreviewHostReadback({
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateArtifactId: ARTIFACT_ID,
    siteLabel: "aris.si",
    liveUrl: "https://www.aris.si/",
  }, deps({
    existing: binding(),
    activePointer: null,
  }));

  assert.ok(readback);
  assert.equal(readback.label, "GNR8 demo preview, not live");
  assert.equal(readback.previewUrl, "https://aris-airship.app.pasadenagenerator.com/");
  assert.equal(readback.bindingStatus.label, "Preview host binding active");
  assert.equal(readback.activePointerStatus.label, "No active pointer");
  assert.equal(readback.externalSourceDomainStatus.host, "www.aris.si");
  assert.equal(readback.action.enabled, false);
});

test("airship preview host creation creates a candidate_preview binding without active pointer or customer domain mutation", async () => {
  let upsertInput: Record<string, unknown> | null = null;
  const output = await createAirshipPreviewHostBinding({
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateArtifactId: ARTIFACT_ID,
    siteLabel: "aris.si",
    liveUrl: "https://www.aris.si/",
  }, deps({
    existing: null,
    onUpsert(value) {
      upsertInput = value as Record<string, unknown>;
    },
  }));

  assert.equal(output.status, "created");
  assert.equal(output.binding.host, HOST);
  assert.equal(output.binding.bindingKind, "candidate_preview");
  assert.equal(output.activationNotice, "Preview host binding created. Vercel/domain activation required.");
  assert.equal(output.mutationFlags.previewHostBindingMutation, true);
  assert.equal(output.mutationFlags.activePointerMutation, false);
  assert.equal(output.mutationFlags.customerDomainMutation, false);
  assert.equal(output.mutationFlags.publishes, false);
  assert.equal(upsertInput?.host, HOST);
});

test("airship preview host creation is idempotent for the same hostname candidate and artifact", async () => {
  let upsertCalls = 0;
  const output = await createAirshipPreviewHostBinding({
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateArtifactId: ARTIFACT_ID,
    hostname: HOST,
  }, deps({
    existing: binding(),
    onUpsert() {
      upsertCalls += 1;
    },
  }));

  assert.equal(output.status, "reused");
  assert.equal(output.binding.id, "e73e5d73-cbbe-4ff7-9cdb-75c0ee6aa2ae");
  assert.equal(output.mutationFlags.previewHostBindingMutation, false);
  assert.equal(upsertCalls, 0);
});

test("airship preview host creation rejects customer domains and mismatched existing bindings", async () => {
  await assert.rejects(
    () => createAirshipPreviewHostBinding({
      candidateSiteVersionId: CANDIDATE_VERSION_ID,
      candidateArtifactId: ARTIFACT_ID,
      hostname: "www.aris.si",
    }, deps()),
    /airship_preview_host_customer_domain_rejected/,
  );

  await assert.rejects(
    () => createAirshipPreviewHostBinding({
      candidateSiteVersionId: CANDIDATE_VERSION_ID,
      candidateArtifactId: ARTIFACT_ID,
      hostname: HOST,
    }, deps({
      existing: binding({ candidateArtifactId: "11111111-1111-4111-8111-111111111111" }),
    })),
    /airship_preview_host_existing_binding_mismatch/,
  );
});
