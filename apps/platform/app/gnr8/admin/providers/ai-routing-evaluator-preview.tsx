"use client";

import { useMemo, useState } from "react";
import { evaluateAIRoutingPreview } from "@/gnr8/runtime/providers/ai-routing-evaluator-preview";
import { PROVIDER_CONTRACT_BY_ID, type ProviderId } from "@/gnr8/runtime/providers/provider-contract-registry";

type PreviewTaskId =
  | "site_migration_planning"
  | "long_architecture_review"
  | "layout_visual_understanding"
  | "fast_interactive_generation"
  | "eu_sensitive_workloads"
  | "structured_tool_orchestration";

type PreviewTaskOption = {
  id: PreviewTaskId;
  label: string;
  policyTaskType: string;
};

const PREVIEW_TASK_OPTIONS: readonly PreviewTaskOption[] = [
  {
    id: "site_migration_planning",
    label: "site_migration_planning",
    policyTaskType: "Site Migration Planning",
  },
  {
    id: "long_architecture_review",
    label: "long_architecture_review",
    policyTaskType: "Long Architecture Review",
  },
  {
    id: "layout_visual_understanding",
    label: "layout_visual_understanding",
    policyTaskType: "Layout / Visual Understanding",
  },
  {
    id: "fast_interactive_generation",
    label: "fast_interactive_generation",
    policyTaskType: "Fast Interactive Generation",
  },
  {
    id: "eu_sensitive_workloads",
    label: "eu_sensitive_workloads",
    policyTaskType: "EU-sensitive Workloads",
  },
  {
    id: "structured_tool_orchestration",
    label: "structured_tool_orchestration",
    policyTaskType: "Structured Tool Orchestration",
  },
] as const;

function resolveProviderDisplayName(providerId: string): string {
  const provider = PROVIDER_CONTRACT_BY_ID[providerId as ProviderId];
  return provider?.displayName ?? providerId;
}

export function AIRoutingEvaluatorPreview() {
  const [selectedTaskId, setSelectedTaskId] = useState<PreviewTaskId>("site_migration_planning");

  const selectedTask = PREVIEW_TASK_OPTIONS.find((task) => task.id === selectedTaskId) ?? PREVIEW_TASK_OPTIONS[0];

  const preview = useMemo(
    () =>
      evaluateAIRoutingPreview({
        taskType: selectedTask.policyTaskType,
        fallbackAllowed: true,
      }),
    [selectedTask.policyTaskType],
  );

  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>AI Routing Evaluator Preview</h2>

      <div style={{ marginBottom: 10 }}>
        <label htmlFor="ai-routing-evaluator-preview-task" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Task Selector
        </label>
        <select
          id="ai-routing-evaluator-preview-task"
          value={selectedTaskId}
          onChange={(event) => setSelectedTaskId(event.target.value as PreviewTaskId)}
          style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", background: "#ffffff", minWidth: 320 }}
        >
          {PREVIEW_TASK_OPTIONS.map((task) => (
            <option key={task.id} value={task.id}>
              {task.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Preview Routing Result</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>selectedProviderId: {preview.selectedProviderId} ({resolveProviderDisplayName(preview.selectedProviderId)})</li>
            <li>selectedModelFamily: {preview.selectedModelFamily}</li>
            <li>routingStrategy: {preview.routingStrategy}</li>
            <li>fallbackProviderIds: {preview.fallbackProviderIds.map((providerId) => resolveProviderDisplayName(providerId)).join(", ") || "none"}</li>
            <li>reason: {preview.reason}</li>
          </ul>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Constraints</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {preview.constraintsApplied.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Diagnostics</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {preview.diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ul>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Execution State</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>executionAllowed: {String(preview.executionAllowed)}</li>
            <li>executionBlocked: {String(preview.executionBlocked)}</li>
            <li>state: blocked</li>
          </ul>
        </section>
      </div>

      <p style={{ margin: "10px 0 0 0", color: "#374151", fontSize: 13 }}>
        Routing evaluator preview is deterministic and non-executable. No AI providers are called.
      </p>
    </section>
  );
}
