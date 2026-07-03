import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import {
  WEBSITE_DESIGN_BRIEF_SECTION_IDS,
  validateWebsiteDesignBrief,
  type WebsiteDesignBriefArtifact,
} from "./website-design-brief-contract";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

function artifact(): WebsiteDesignBriefArtifact {
  const dbt = alignedDigitalBusinessTwinFixture();
  return buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
}

test("valid Website Design Brief contract includes canonical sections", () => {
  const value = artifact();
  const validation = validateWebsiteDesignBrief(value);

  assert.equal(validation.valid, true);
  assert.equal(value.contractVersion, "MVP-1E");
  assert.equal(value.status, "valid");
  assert.deepEqual(value.sections.map((section) => section.sectionId), [...WEBSITE_DESIGN_BRIEF_SECTION_IDS]);
  assert.equal(new Set(value.sections.map((section) => section.sectionId)).size, WEBSITE_DESIGN_BRIEF_SECTION_IDS.length);
});

test("lineage must match aligned Digital Business Twin and Business Alignment source", () => {
  const value = artifact();
  const wrongDigitalBusinessTwin = {
    ...value,
    lineage: {
      ...value.lineage,
      businessAlignmentOutputDigitalBusinessTwinId: "other-dbt",
    },
  };
  const wrongAlignment = {
    ...value,
    sourceBusinessAlignmentId: "other-alignment",
  };

  assert.ok(validateWebsiteDesignBrief(wrongDigitalBusinessTwin).errors
    .includes("lineage.businessAlignmentOutputDigitalBusinessTwinId must match sourceDigitalBusinessTwinId"));
  assert.ok(validateWebsiteDesignBrief(wrongAlignment).errors
    .includes("lineage.sourceBusinessAlignmentId must match sourceBusinessAlignmentId"));
});

test("section IDs must be allowed, unique, and complete", () => {
  const value = artifact();
  const duplicate = {
    ...value,
    sections: [
      { ...value.sections[0]!, sectionId: "executive_summary" },
      { ...value.sections[1]!, sectionId: "executive_summary" },
      ...value.sections.slice(2),
    ],
  } as WebsiteDesignBriefArtifact;
  const missing = {
    ...value,
    sections: value.sections.filter((section) => section.sectionId !== "seo_intent"),
  };
  const unknown = {
    ...value,
    sections: [
      ...value.sections.slice(0, -1),
      { ...value.sections.at(-1)!, sectionId: "layout_plan" },
    ],
  } as unknown as WebsiteDesignBriefArtifact;

  assert.ok(validateWebsiteDesignBrief(duplicate).errors.some((error) => error.includes("sectionId must be unique")));
  assert.ok(validateWebsiteDesignBrief(missing).errors.includes("sections must include seo_intent"));
  assert.ok(validateWebsiteDesignBrief(unknown).errors.some((error) =>
    error.includes("sectionId is not an allowed Website Design Brief section")));
});

test("forbidden downstream fields and implementation instructions are rejected recursively", () => {
  const value = artifact();
  const forbiddenField = {
    ...value,
    sections: [{
      ...value.sections[0]!,
      items: [{
        ...value.sections[0]!.items[0]!,
        providerPayload: { prompt: "make a site" },
      }],
    }, ...value.sections.slice(1)],
  } as unknown as WebsiteDesignBriefArtifact;
  const implementationInstruction = {
    ...value,
    sections: [{
      ...value.sections[0]!,
      items: [{
        ...value.sections[0]!.items[0]!,
        statement: "Use React components to build the website.",
      }],
    }, ...value.sections.slice(1)],
  } as WebsiteDesignBriefArtifact;

  assert.ok(validateWebsiteDesignBrief(forbiddenField).errors.some((error) =>
    error.includes("providerPayload is forbidden")));
  assert.ok(validateWebsiteDesignBrief(implementationInstruction).errors.some((error) =>
    error.includes("must describe website intent, not implementation instructions")));
});

test("source validation allows partial aligned-output DBT and requires matching Business Alignment lineage", () => {
  const dbt = alignedDigitalBusinessTwinFixture({ status: "partial", missingDomains: ["audience"] });
  const value = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const validPartial = validateWebsiteDesignBrief({
    artifact: value,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
  });
  const validation = validateWebsiteDesignBrief({
    artifact: value,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessAlignment: businessAlignmentFixture("other-output-dbt"),
  });

  assert.equal(validPartial.valid, true);
  assert.ok(validation.errors.includes("sourceBusinessAlignment lineage must output sourceDigitalBusinessTwinId"));
});

test("source validation rejects unreviewed observed DBT", () => {
  const dbt = alignedDigitalBusinessTwinFixture({ status: "observed" });
  const value = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const validation = validateWebsiteDesignBrief({
    artifact: value,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
  });

  assert.ok(validation.errors.includes("sourceDigitalBusinessTwin.status must be partial, aligned, confirmed, or blocked for Website Design Brief"));
});
