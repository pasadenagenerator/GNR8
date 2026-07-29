import assert from "node:assert/strict";
import { stat, readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import {
  OpsInboxShell,
  sortOpsInboxItems,
  type OpsInboxShellViewModel,
} from "./_components/OpsInboxShell";
import type { PublishShadowOpsInboxDerivedWorkItem } from "@/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model";

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const CLIENT_OPS_INBOX_ROUTE = new URL("../../client/ops-inbox", import.meta.url);
const PUBLIC_OPS_INBOX_ROUTE = new URL("../../public/ops-inbox", import.meta.url);
const { renderToStaticMarkup } = ReactDomServer;

function item(overrides: Partial<PublishShadowOpsInboxDerivedWorkItem> = {}): PublishShadowOpsInboxDerivedWorkItem {
  return {
    key: "ops:publish_shadow_missing_ddom_snapshot:site:redacted-scope:version:redacted-scope:ddom-snapshot-ref:pasr-8-derived-ops-inbox:v1",
    type: "publish_shadow_missing_ddom_snapshot",
    lifecycleState: "derived_open",
    shadowOnly: true,
    derivedOnly: true,
    nonEnforcing: true,
    nonBlocking: true,
    sourceOfTruthLabel: "Derived from PASR-6 redacted publish shadow projection.",
    severity: "high",
    title: "Publish shadow is missing a DDOM readiness snapshot",
    summary: "Shadow readiness is derived-only, shadow-only, non-enforcing, and non-blocking.",
    siteLabel: "Site scope matched.",
    siteVersionSummary: "Site version scope matched.",
    recommendedNextActionLabel: "Route to source-owned workflow outside Ops Inbox.",
    recommendedNextActionOwnerRole: "technical_operator",
    refs: [],
    refSummaries: ["DDOM snapshot ref"],
    limitationsSummary: "No displayed limitations.",
    freshnessSummary: "Projection freshness is fresh.",
    createdAt: "2026-07-28T08:10:00.000Z",
    observedAt: "2026-07-28T08:10:00.000Z",
    labels: ["shadow-only", "derived-only", "non-enforcing", "non-blocking"],
    hasActionPayload: false,
    actionButtons: [],
    ...overrides,
  };
}

function model(overrides: Partial<OpsInboxShellViewModel> = {}): OpsInboxShellViewModel {
  return {
    generatedAt: "2026-07-29T09:00:00.000Z",
    candidateCount: 1,
    unavailableCount: 0,
    emptyCount: 0,
    sourceStates: [
      {
        state: "visible",
        siteLabel: "Site scope matched.",
        siteVersionLabel: "Site version scope matched.",
        unavailableStateLabel: "Publish shadow Ops Inbox derivation is unavailable. No publish behavior changed.",
        emptyStateLabel: "No derived publish shadow exception work items are open.",
      },
    ],
    items: [item()],
    ...overrides,
  };
}

async function pathExists(url: URL): Promise<boolean> {
  try {
    await stat(url);
    return true;
  } catch {
    return false;
  }
}

test("Ops Inbox shell renders a missing DDOM item safely", () => {
  const html = renderToStaticMarkup(<OpsInboxShell model={model()} />);

  assert.equal(html.includes("Publish shadow is missing a DDOM readiness snapshot"), true);
  assert.equal(html.includes("DDOM snapshot ref"), true);
  assert.equal(html.includes("raw-ddom-ref"), false);
  assert.equal(html.includes("derived-only"), true);
  assert.equal(html.includes("shadow-only"), true);
  assert.equal(html.includes("non-enforcing"), true);
  assert.equal(html.includes("non-blocking"), true);
});

test("Ops Inbox shell renders a missing approval item safely", () => {
  const html = renderToStaticMarkup(
    <OpsInboxShell
      model={model({
        items: [
          item({
            key: "ops:publish_shadow_missing_publish_activation_approval:site:redacted-scope:version:redacted-scope:approval-restricted:pasr-8-derived-ops-inbox:v1",
            type: "publish_shadow_missing_publish_activation_approval",
            title: "Publish shadow is missing publish activation approval",
            recommendedNextActionLabel: "Request publish activation approval in the source-owned AAF workflow.",
            refSummaries: ["Approval request ref", "Approval decision ref"],
          }),
        ],
      })}
    />,
  );

  assert.equal(html.includes("Publish shadow is missing publish activation approval"), true);
  assert.equal(html.includes("source-owned AAF workflow"), true);
  assert.equal(html.includes("raw-approval-actor-id"), false);
});

test("Ops Inbox shell renders empty state safely", () => {
  const html = renderToStaticMarkup(
    <OpsInboxShell
      model={model({
        items: [],
        emptyCount: 1,
        sourceStates: [
          {
            state: "empty",
            siteLabel: "Site scope matched.",
            siteVersionLabel: "Site version scope matched.",
            unavailableStateLabel: "Publish shadow Ops Inbox derivation is unavailable. No publish behavior changed.",
            emptyStateLabel: "No derived publish shadow exception work items are open.",
          },
        ],
      })}
    />,
  );

  assert.equal(html.includes("No derived publish shadow exception work items are open"), true);
  assert.equal(html.includes("does not mean all sites are launch-ready"), true);
  assert.equal(html.includes("publish-approved"), true);
});

test("Ops Inbox shell renders unavailable state safely", () => {
  const html = renderToStaticMarkup(
    <OpsInboxShell
      model={model({
        items: [],
        unavailableCount: 1,
        sourceStates: [
          {
            state: "unavailable",
            siteLabel: "Site scope matched.",
            siteVersionLabel: "Site version scope matched.",
            unavailableStateLabel: "Publish shadow Ops Inbox derivation is unavailable. No publish behavior changed.",
            emptyStateLabel: "No derived publish shadow exception work items are open.",
          },
        ],
      })}
    />,
  );

  assert.equal(html.includes("Publish shadow Ops Inbox derivation is unavailable"), true);
  assert.equal(html.includes("No publish behavior changed"), true);
  assert.equal(html.includes("read-only"), true);
});

test("Ops Inbox shell has no mutation action buttons or forbidden action text", () => {
  const html = renderToStaticMarkup(<OpsInboxShell model={model()} />);

  assert.equal(html.includes("<button"), false);
  assert.equal(html.includes("Approve"), false);
  assert.equal(html.includes("Dismiss"), false);
  assert.equal(html.includes("Retry"), false);
  assert.equal(html.includes("Rollback"), false);
  assert.equal(html.includes("Refresh"), false);
});

test("Ops Inbox shell does not render raw redacted refs or internal diagnostics", () => {
  const html = renderToStaticMarkup(
    <OpsInboxShell
      model={model({
        items: [
          item({
            refs: [],
            refSummaries: ["DDOM snapshot ref", "Correlation restricted."],
            limitationsSummary: "Projection limitations summarized.",
            summary: "Safe summary only.",
          }),
        ],
      })}
    />,
  );

  assert.equal(html.includes("raw-ddom-ref"), false);
  assert.equal(html.includes("raw-correlation-id"), false);
  assert.equal(html.includes("raw-idempotency-key"), false);
  assert.equal(html.includes("internal stack trace"), false);
});

test("Ops Inbox sort uses severity then oldest observed timestamp", () => {
  const sorted = sortOpsInboxItems([
    item({ key: "medium-old", severity: "medium", observedAt: "2026-07-28T07:00:00.000Z" }),
    item({ key: "high-new", severity: "high", observedAt: "2026-07-28T09:00:00.000Z" }),
    item({ key: "high-old", severity: "high", observedAt: "2026-07-28T08:00:00.000Z" }),
  ]);

  assert.deepEqual(sorted.map((entry) => entry.key), ["high-old", "high-new", "medium-old"]);
});

test("Ops Inbox page uses PASR-8 helper and avoids raw PASR read bypass", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("getPublishShadowOpsInboxViewModel"), true);
  assert.equal(source.includes("readPublishShadowResult"), false);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
});

test("Ops Inbox route is not added to client or public surfaces", async () => {
  assert.equal(await pathExists(CLIENT_OPS_INBOX_ROUTE), false);
  assert.equal(await pathExists(PUBLIC_OPS_INBOX_ROUTE), false);
});
