import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import {
  FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
  FirstLimitedDryRunOutputPersistenceValidationError,
  loadLatestFirstLimitedDryRunOutput,
  persistFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutputProvenanceSummary,
} from "./first-limited-dry-run-output-persistence";
import type { FirstLimitedDryRunOutput } from "./first-limited-dry-run-contract";

const SITE_VERSION_ID = "site-version-first-limited";
const DRY_RUN_ID = "dry-run-first-limited";

function baseProvenanceSummary(): RuntimeImportProvenanceSummary {
  return { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
}

function validOutput(input: {
  outputId?: string;
  dryRunId?: string;
  siteVersionId?: string;
  createdAt?: string;
} = {}): FirstLimitedDryRunOutput {
  const dryRunId = input.dryRunId ?? DRY_RUN_ID;
  const siteVersionId = input.siteVersionId ?? SITE_VERSION_ID;
  return {
    outputId: input.outputId ?? `${dryRunId}:first-limited-output`,
    dryRunId,
    reconstructionPackageId: "reconstruction-package-first-limited",
    siteVersionId,
    routeScope: {
      scopeType: "single_route",
      routes: ["/"],
    },
    outputStatus: "valid",
    routeModels: [
      {
        routePath: "/",
        sourceUrl: "https://example.test/",
        sectionRefs: ["section-home-hero"],
        navigationRefs: ["navigation-home"],
        limitationRefs: [],
        confidenceLevel: "HIGH",
      },
    ],
    navigationModels: [
      {
        navigationId: "navigation-home",
        routePath: "/",
        items: [
          {
            label: "Home",
            href: "/",
            position: 0,
            confidenceLevel: "HIGH",
            sourceEvidenceRefs: ["navigation-evidence-home"],
          },
        ],
        confidenceLevel: "HIGH",
        sourceEvidenceRefs: ["navigation-evidence-home"],
        limitationRefs: [],
      },
    ],
    sectionModels: [
      {
        sectionId: "section-home-hero",
        routePath: "/",
        regionType: "hero",
        selector: "main > section:nth-of-type(1)",
        boundingBox: {
          x: 0,
          y: 80,
          width: 1200,
          height: 520,
        },
        confidenceLevel: "HIGH",
        sourceEvidenceRefs: ["section-boundary-home-hero"],
        limitationRefs: [],
      },
    ],
    limitations: [],
    evidenceRefs: [
      "evidence:route:/",
      "navigation-evidence-home",
      "section-boundary-home-hero",
    ],
    createdAt: input.createdAt ?? "2026-06-15T10:10:00.000Z",
  };
}

function memoryStore(initialSummary: RuntimeImportProvenanceSummary | null = baseProvenanceSummary()) {
  let summary = initialSummary;
  return {
    get summary() {
      return summary as FirstLimitedDryRunOutputProvenanceSummary | null;
    },
    options: {
      persistedAt: "2026-06-16T08:00:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, SITE_VERSION_ID);
        summary = input.importProvenanceSummary;
        return { affectedRows: 1 };
      },
    },
  };
}

test("valid first limited dry-run output persists as provenance artifact", async () => {
  const store = memoryStore();
  const output = validOutput();

  const ref = await persistFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    output,
    options: store.options,
  });

  assert.equal(ref.kind, FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.outputId, output.outputId);
  assert.equal(ref.validation.valid, true);
  assert.deepEqual(ref.validation.errors, []);
  assert.deepEqual(store.summary?.firstLimitedDryRunOutputArtifacts?.[0]?.output, output);
});

test("latest first limited dry-run output loads by site version and optional dry run", async () => {
  const store = memoryStore();
  const first = validOutput({ outputId: "output-first", createdAt: "2026-06-15T10:10:00.000Z" });
  const second = validOutput({ outputId: "output-second", createdAt: "2026-06-15T10:20:00.000Z" });

  await persistFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    output: first,
    options: { ...store.options, persistedAt: "2026-06-16T08:00:00.000Z" },
  });
  await persistFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    output: second,
    options: { ...store.options, persistedAt: "2026-06-16T08:05:00.000Z" },
  });

  assert.deepEqual(
    await loadLatestFirstLimitedDryRunOutput({
      siteVersionId: SITE_VERSION_ID,
      options: store.options,
    }),
    second,
  );
  assert.deepEqual(
    await loadLatestFirstLimitedDryRunOutput({
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      options: store.options,
    }),
    second,
  );
  assert.equal(
    await loadLatestFirstLimitedDryRunOutput({
      siteVersionId: SITE_VERSION_ID,
      dryRunId: "other-dry-run",
      options: store.options,
    }),
    null,
  );
});

test("invalid forbidden first limited dry-run output is rejected before persistence", async () => {
  const store = memoryStore();
  const invalid = {
    ...validOutput(),
    reactOutput: { component: "ForbiddenGeneratedReact" },
  } as FirstLimitedDryRunOutput & Record<string, unknown>;

  await assert.rejects(
    () =>
      persistFirstLimitedDryRunOutput({
        siteVersionId: SITE_VERSION_ID,
        dryRunId: DRY_RUN_ID,
        output: invalid,
        options: store.options,
      }),
    (error: unknown) => {
      assert.ok(error instanceof FirstLimitedDryRunOutputPersistenceValidationError);
      assert.equal(error.validation.valid, false);
      assert.ok(
        error.validation.errors.includes(
          "reactOutput is forbidden in first limited dry-run output",
        ),
      );
      return true;
    },
  );
  assert.equal(store.summary?.firstLimitedDryRunOutputArtifacts, undefined);
});

test("validation diagnostics are preserved in persisted artifact metadata", async () => {
  const store = memoryStore();

  const ref = await persistFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    output: validOutput(),
    options: store.options,
  });

  assert.deepEqual(ref.validation, {
    valid: true,
    errors: [],
    warnings: [],
  });
  assert.deepEqual(ref.diagnostics, ["FIRST_LIMITED_DRY_RUN_OUTPUT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary?.latestFirstLimitedDryRunOutputArtifact?.validation, ref.validation);
  assert.deepEqual(store.summary?.latestFirstLimitedDryRunOutputArtifact?.diagnostics, ref.diagnostics);
});

test("nested generated forbidden output fields are not accepted", async () => {
  const store = memoryStore();
  const invalid = {
    ...validOutput(),
    routeModels: [
      {
        ...validOutput().routeModels[0],
        generatedOutputs: [{ kind: "block" }],
      },
    ],
  } as FirstLimitedDryRunOutput;

  await assert.rejects(
    () =>
      persistFirstLimitedDryRunOutput({
        siteVersionId: SITE_VERSION_ID,
        dryRunId: DRY_RUN_ID,
        output: invalid,
        options: store.options,
      }),
    (error: unknown) => {
      assert.ok(error instanceof FirstLimitedDryRunOutputPersistenceValidationError);
      assert.ok(
        error.validation.errors.includes(
          "routeModels.0.generatedOutputs is forbidden in first limited dry-run output",
        ),
      );
      return true;
    },
  );
  assert.equal(store.summary?.firstLimitedDryRunOutputArtifacts, undefined);
});

test("first limited dry-run output readback is deterministic and isolated from mutation", async () => {
  const store = memoryStore(null);
  const output = validOutput();

  await persistFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    output,
    options: store.options,
  });

  const firstRead = await loadLatestFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    options: store.options,
  });
  const secondRead = await loadLatestFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    options: store.options,
  });

  assert.deepEqual(firstRead, output);
  assert.deepEqual(secondRead, output);
  assert.deepEqual(firstRead, secondRead);

  firstRead!.routeModels[0]!.sourceUrl = "https://mutated.example/";
  const afterMutation = await loadLatestFirstLimitedDryRunOutput({
    siteVersionId: SITE_VERSION_ID,
    options: store.options,
  });
  assert.deepEqual(afterMutation, output);
});
