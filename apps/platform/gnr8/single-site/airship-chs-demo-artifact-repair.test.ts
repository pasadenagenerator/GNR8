import test from "node:test";
import assert from "node:assert/strict";

import {
  AIRSHIP_CHS_DEMO_ARTIFACT_ID,
  AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
  AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
  assertCleanAirshipChsDemoHtml,
  buildAirshipChsDemoArtifactRepairPlan,
  buildAirshipChsMvpDemoHtml,
  inspectAirshipChsDemoHtml,
} from "./airship-chs-demo-artifact-repair";

test("buildAirshipChsMvpDemoHtml renders a clean CHS-like public page", () => {
  const html = buildAirshipChsMvpDemoHtml();
  const checks = inspectAirshipChsDemoHtml(html);

  assertCleanAirshipChsDemoHtml(html);
  assert.equal(checks.hasFallbackPreview, false);
  assert.equal(checks.hasRawBlock, false);
  assert.equal(checks.hasCaptureDriven, false);
  assert.equal(checks.hasDiagnosticsLabel, false);
  assert.equal(checks.hasHeader, true);
  assert.equal(checks.hasHero, true);
  assert.equal(checks.hasAirshipHeroMarker, true);
  assert.equal(checks.hasAirshipOffersMarker, true);
  assert.equal(checks.hasAirshipProofMarker, true);
  assert.equal(checks.hasAirshipApproachMarker, true);
  assert.equal(checks.hasAirshipCtaMarker, true);
  assert.equal(checks.hasAirshipFooterMarker, true);
  assert.equal(checks.hasIdentitySection, true);
  assert.equal(checks.hasProofSection, true);
  assert.equal(checks.hasContactSection, true);
  assert.equal(html.includes('data-airship-element="hero-headline"'), true);
  assert.equal(html.includes('data-airship-element="hero-cta"'), true);
  assert.equal(html.includes('data-airship-element="offer-card"'), true);
  assert.equal(html.includes('data-airship-element="contact-card"'), true);
  assert.equal(html.includes('data-airship-element="contact-cta"'), true);
});

test("buildAirshipChsDemoArtifactRepairPlan is guarded to the active Airship CHS artifact", () => {
  const plan = buildAirshipChsDemoArtifactRepairPlan({
    activePointer: {
      siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
      siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
      artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
    },
    artifact: {
      id: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
      siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
      siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
      bundleSha256: "previous-bundle",
      htmlByPath: { "/": "<html><body>Fallback Preview raw-block CAPTURE_DRIVEN Diagnostics:</body></html>" },
      manifest: { existing: true },
      publishStage: "shadow",
      shadowRestricted: false,
    },
    actor: "test",
    idempotencyKey: "test-idempotency",
  });

  assert.equal(plan.artifactId, AIRSHIP_CHS_DEMO_ARTIFACT_ID);
  assert.equal(plan.siteVersionId, AIRSHIP_CHS_DEMO_SITE_VERSION_ID);
  assert.notEqual(plan.repairedBundleSha256, "previous-bundle");
  assert.equal(plan.manifest.existing, true);
  assert.equal(plan.publicRenderChecks.hasDraftCopy, true);
  assertCleanAirshipChsDemoHtml(plan.htmlByPath["/"]!);
});

test("buildAirshipChsDemoArtifactRepairPlan refuses pointer mismatches", () => {
  assert.throws(
    () =>
      buildAirshipChsDemoArtifactRepairPlan({
        activePointer: {
          siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
          siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
          artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
        },
        artifact: {
          id: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
          siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
          siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
          bundleSha256: "previous-bundle",
          htmlByPath: { "/": "<html></html>" },
          manifest: {},
          publishStage: "shadow",
          shadowRestricted: false,
        },
        actor: "test",
        idempotencyKey: "test-idempotency",
      }),
    /airship_chs_demo_active_pointer_artifact_mismatch/,
  );
});
