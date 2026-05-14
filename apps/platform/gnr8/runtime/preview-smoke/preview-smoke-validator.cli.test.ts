import assert from "node:assert/strict";
import test from "node:test";

import {
  makeTarget,
  makeTargetFromSiteResolution,
  RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS,
} from "@/gnr8/runtime/preview-smoke/preview-smoke-validator.cli";

test("preview smoke cli: missing resolution binding uses known Maver baseline fallback in route_harness strategy mode", async () => {
  const warnLogs: Array<{ message: string; meta: unknown }> = [];

  const target = await makeTargetFromSiteResolution({
    label: "Maver",
    siteId: "site_missing",
    strategy: "active",
    identitySignals: ["maver"],
    fallbackAssets: [],
    executionMode: "route_harness",
  }, {
    getResolutionBinding: async () => null,
    getDomainReadinessBinding: async () => null,
    logWarn: (...args: unknown[]) => {
      warnLogs.push({ message: String(args[0] ?? ""), meta: args[1] });
    },
    logInfo: () => undefined,
  });

  assert.ok(target);
  assert.equal(target?.siteLabel, "Maver");
  assert.equal(target?.siteVersionId, RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS.Maver.siteVersionId);
  assert.equal(target?.expectedSiteId, RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS.Maver.siteId);

  const missingDiag = warnLogs.find((entry) => entry.message.includes("RUNTIME_RESOLUTION_BINDING_MISSING"));
  assert.ok(missingDiag);
  const fallbackDiag = warnLogs.find((entry) => entry.message.includes("RUNTIME_SMOKE_BASELINE_TARGET_FALLBACK_USED"));
  assert.ok(fallbackDiag);
  assert.equal((fallbackDiag?.meta as { reasonCode?: string } | undefined)?.reasonCode, "runtime_resolution_binding_missing");
});

test("preview smoke cli: missing resolution binding uses known Roboplast baseline fallback in route_harness strategy mode", async () => {
  const target = await makeTargetFromSiteResolution({
    label: "Roboplast",
    siteId: "site_missing_robo",
    strategy: "latest_imported",
    identitySignals: ["roboplast"],
    fallbackAssets: [],
    executionMode: "route_harness",
  }, {
    getResolutionBinding: async () => null,
    getDomainReadinessBinding: async () => null,
    logWarn: () => undefined,
    logInfo: () => undefined,
  });

  assert.ok(target);
  assert.equal(target?.siteLabel, "Roboplast");
  assert.equal(target?.siteVersionId, RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS.Roboplast.siteVersionId);
  assert.equal(target?.expectedSiteId, RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS.Roboplast.siteId);
});

test("preview smoke cli: route-harness fallback path yields Maver and Roboplast targets", async () => {
  const maver = await makeTargetFromSiteResolution({
    label: "Maver",
    siteId: "site_missing",
    strategy: "active",
    identitySignals: ["maver"],
    fallbackAssets: [],
    executionMode: "route_harness",
  }, {
    getResolutionBinding: async () => null,
    getDomainReadinessBinding: async () => null,
    logWarn: () => undefined,
    logInfo: () => undefined,
  });
  const roboplast = await makeTargetFromSiteResolution({
    label: "Roboplast",
    siteId: "site_missing_robo",
    strategy: "active",
    identitySignals: ["roboplast"],
    fallbackAssets: [],
    executionMode: "route_harness",
  }, {
    getResolutionBinding: async () => null,
    getDomainReadinessBinding: async () => null,
    logWarn: () => undefined,
    logInfo: () => undefined,
  });

  const labels = [maver?.siteLabel, roboplast?.siteLabel].filter(Boolean);
  assert.deepEqual(labels, ["Maver", "Roboplast"]);
});

test("preview smoke cli: fallback is not used outside route_harness", async () => {
  const target = await makeTargetFromSiteResolution({
    label: "Maver",
    siteId: "site_missing",
    strategy: "active",
    identitySignals: ["maver"],
    fallbackAssets: [],
    executionMode: "http",
  }, {
    getResolutionBinding: async () => null,
    getDomainReadinessBinding: async () => null,
    logWarn: () => undefined,
    logInfo: () => undefined,
  });

  assert.equal(target, null);
});

test("preview smoke cli: direct siteVersionId mode unchanged", async () => {
  const target = await makeTarget({
    label: "Direct",
    host: "unused.example.com",
    explicitSiteId: "site_direct",
    explicitSiteVersionId: "sv_direct",
    identitySignals: ["direct"],
    fallbackAssets: [],
  });

  assert.ok(target);
  assert.equal(target?.expectedSiteId, "site_direct");
  assert.equal(target?.siteVersionId, "sv_direct");
  assert.equal(target?.resolution, undefined);
});
