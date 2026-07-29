import React from "react";

import type {
  PublishShadowOpsInboxDerivedWorkItem,
  PublishShadowOpsInboxSurfaceState,
} from "@/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model";

export type OpsInboxShellSourceState = {
  state: PublishShadowOpsInboxSurfaceState;
  siteLabel: string;
  siteVersionLabel: string;
  unavailableStateLabel: string;
  emptyStateLabel: string;
};

export type OpsInboxShellViewModel = {
  generatedAt: string;
  candidateCount: number;
  unavailableCount: number;
  emptyCount: number;
  items: PublishShadowOpsInboxDerivedWorkItem[];
  sourceStates: OpsInboxShellSourceState[];
};

const SEVERITY_ORDER: Record<PublishShadowOpsInboxDerivedWorkItem["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function timestampRank(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function sortOpsInboxItems(
  items: readonly PublishShadowOpsInboxDerivedWorkItem[],
): PublishShadowOpsInboxDerivedWorkItem[] {
  return [...items].sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (severityDelta !== 0) return severityDelta;

    const observedDelta = timestampRank(left.observedAt) - timestampRank(right.observedAt);
    if (observedDelta !== 0) return observedDelta;

    return left.key.localeCompare(right.key);
  });
}

function badge(label: string, tone: "neutral" | "blue" | "green" | "amber" | "red" = "neutral", key?: string) {
  const colors = {
    neutral: { border: "#d1d5db", background: "#f8fafc", color: "#334155" },
    blue: { border: "#bae6fd", background: "#f0f9ff", color: "#075985" },
    green: { border: "#bbf7d0", background: "#f0fdf4", color: "#166534" },
    amber: { border: "#fde68a", background: "#fffbeb", color: "#92400e" },
    red: { border: "#fecaca", background: "#fff1f2", color: "#991b1b" },
  }[tone];

  return (
    <span
      key={key}
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "5px 8px",
        background: colors.background,
        color: colors.color,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: "14px",
      }}
    >
      {label}
    </span>
  );
}

function severityTone(severity: PublishShadowOpsInboxDerivedWorkItem["severity"]): "neutral" | "amber" | "red" {
  if (severity === "critical" || severity === "high") return "red";
  if (severity === "medium") return "amber";
  return "neutral";
}

function stateCopy(sourceStates: readonly OpsInboxShellSourceState[]): string {
  const unavailable = sourceStates.filter((source) => source.state === "unavailable").length;
  if (unavailable > 0) {
    return `${unavailable} publish shadow derivation source${unavailable === 1 ? " is" : "s are"} unavailable or partial. This page remains read-only and no publish behavior changed.`;
  }
  return "All loaded publish shadow derivations were rendered from PASR-8 output or produced safe empty states.";
}

function itemRefs(item: PublishShadowOpsInboxDerivedWorkItem): string {
  if (item.refs.length > 0) {
    return item.refs.map((ref) => `${ref.label}: ${ref.ref}`).join(", ");
  }
  if (item.refSummaries.length > 0) return item.refSummaries.join(", ");
  return "No role-safe refs are visible for this item.";
}

function sourceStateList(sourceStates: readonly OpsInboxShellSourceState[]) {
  const unavailableStates = sourceStates.filter((source) => source.state === "unavailable" || source.state === "forbidden" || source.state === "not_applicable");
  if (unavailableStates.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {unavailableStates.map((source) => (
        <article
          key={`${source.siteLabel}:${source.siteVersionLabel}:${source.state}`}
          style={{ border: "1px solid #fde68a", borderRadius: 8, background: "#fffbeb", padding: 10 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {badge(source.state, source.state === "forbidden" ? "red" : "amber")}
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
              {text(source.siteLabel)} / {text(source.siteVersionLabel)}
            </span>
          </div>
          <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13 }}>
            {source.state === "unavailable" ? source.unavailableStateLabel : source.emptyStateLabel}
          </p>
        </article>
      ))}
    </div>
  );
}

export function OpsInboxShell(props: { model: OpsInboxShellViewModel }) {
  const items = sortOpsInboxItems(props.model.items);
  const hasItems = items.length > 0;

  return (
    <>
      <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <header style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Ops Inbox</h1>
          <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
            Internal read-only queue for PASR-8 publish shadow derived work items.
          </p>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {badge("derived-only", "blue")}
          {badge("shadow-only", "blue")}
          {badge("non-blocking", "green")}
          {badge("non-enforcing", "green")}
          {badge("no action is performed from this inbox", "neutral")}
        </div>

        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#334155" }}>
          Source workflows resolve items outside Ops Inbox. This shell does not approve, dismiss, retry, refresh, publish,
          rollback, trigger DDOM, create AAF records, or mutate source truth.
        </p>
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20, color: "#0f172a" }}>Derived Queue State</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <article style={{ border: "1px solid #dbe2ea", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Publish Shadow Items</div>
            <div style={{ marginTop: 6, fontSize: 24, color: "#0f172a", fontWeight: 800 }}>{items.length}</div>
          </article>
          <article style={{ border: "1px solid #dbe2ea", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Candidate Site Versions</div>
            <div style={{ marginTop: 6, fontSize: 24, color: "#0f172a", fontWeight: 800 }}>{props.model.candidateCount}</div>
          </article>
          <article style={{ border: "1px solid #dbe2ea", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Empty Derivations</div>
            <div style={{ marginTop: 6, fontSize: 24, color: "#0f172a", fontWeight: 800 }}>{props.model.emptyCount}</div>
          </article>
          <article style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 12, background: "#fffbeb" }}>
            <div style={{ fontSize: 12, color: "#92400e" }}>Unavailable Derivations</div>
            <div style={{ marginTop: 6, fontSize: 24, color: "#92400e", fontWeight: 800 }}>{props.model.unavailableCount}</div>
          </article>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#334155" }}>{stateCopy(props.model.sourceStates)}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
          Sorted by severity, oldest observed timestamp, then stable derived key.
        </p>
        {sourceStateList(props.model.sourceStates)}
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20, color: "#0f172a" }}>Publish Shadow Items</h2>
        {!hasItems ? (
          <div style={{ border: "1px solid #dbe2ea", borderRadius: 8, background: "#f8fafc", padding: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>
              No derived publish shadow exception work items are open for the current internal scope.
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#475569" }}>
              Empty does not mean all sites are launch-ready, publish-approved, or free of source problems.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((item) => (
              <article key={item.key} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {badge(item.severity, severityTone(item.severity))}
                  {badge(item.lifecycleState, item.lifecycleState === "derived_stale" ? "amber" : "neutral")}
                  {item.labels.map((label) => badge(label, label.includes("non") ? "green" : "blue", label))}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{item.title}</h3>
                  <p style={{ margin: 0, color: "#334155", fontSize: 13 }}>{item.summary}</p>
                </div>

                <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, margin: 0 }}>
                  <div>
                    <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>Item Type</dt>
                    <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontFamily: "monospace", wordBreak: "break-word" }}>{item.type}</dd>
                  </div>
                  <div>
                    <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>Site</dt>
                    <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 700, wordBreak: "break-word" }}>{text(item.siteLabel)}</dd>
                  </div>
                  <div>
                    <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>Site Version</dt>
                    <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 700, wordBreak: "break-word" }}>{text(item.siteVersionSummary)}</dd>
                  </div>
                  <div>
                    <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>Observed</dt>
                    <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 700, wordBreak: "break-word" }}>{text(item.observedAt)}</dd>
                  </div>
                  <div>
                    <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>Owner Role</dt>
                    <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 700, wordBreak: "break-word" }}>{text(item.recommendedNextActionOwnerRole)}</dd>
                  </div>
                  <div>
                    <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>Derived Key</dt>
                    <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontFamily: "monospace", wordBreak: "break-word" }}>{item.key}</dd>
                  </div>
                </dl>

                <div style={{ display: "grid", gap: 6, color: "#374151", fontSize: 13 }}>
                  <p style={{ margin: 0 }}>
                    <strong>Recommended next action:</strong> {text(item.recommendedNextActionLabel)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Freshness:</strong> {text(item.freshnessSummary)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Limitations and warnings:</strong> {text(item.limitationsSummary)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Role-safe visible refs:</strong> {itemRefs(item)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Source boundary:</strong> {item.sourceOfTruthLabel} No action payload is present.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
