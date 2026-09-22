import React, { type ReactNode } from "react";

import type {
  AirshipSingleSiteEditorReadonlyProjection,
  AirshipSingleSiteRecommendationMaterial,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import type { SingleSiteStudioPreviewState } from "@/gnr8/single-site/single-site-studio-readonly-projection";

import { AirshipDraftCandidateAction } from "./airship-draft-candidate-action";
import { AirshipDraftCandidateReviewAction } from "./airship-draft-candidate-review-action";
import { AirshipProofWorkflowPanel } from "./airship-proof-workflow-panel";
import { AirshipPreviewHostBindingAction } from "./airship-preview-host-binding-action";
import { AirshipPublishReadinessAction } from "./airship-publish-readiness-action";
import { AirshipSimplePromoteRollbackAction } from "./airship-simple-promote-rollback-action";
import { AirshipSingleSiteLocalDraftEditor } from "./airship-single-site-local-draft-editor";

type Props = {
  model: AirshipSingleSiteEditorReadonlyProjection;
};

const AIRSHIP_PROOF_APPLIED_HEADLINE = "The XXX team helps your IT change with every technology wave.";

function airshipProofFreshDraftProof(model: AirshipSingleSiteEditorReadonlyProjection) {
  const draftId = model.draftPanel.persistence.draftId;
  const draftVersion = model.draftPanel.persistence.version;
  const hasAppliedHeadline = model.draftPanel.drafts.some((draft) =>
    draft.fieldKey === "headline" && draft.proposedTextContent === AIRSHIP_PROOF_APPLIED_HEADLINE,
  );
  if (!draftId || !draftVersion || !hasAppliedHeadline) return null;
  return {
    draftId,
    draftVersion,
    appliedHeadline: AIRSHIP_PROOF_APPLIED_HEADLINE,
  };
}

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function badge(value: string, tone: "good" | "warn" | "neutral" = "neutral") {
  const palette = {
    good: { border: "#86efac", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fbbf24", background: "#fffbeb", color: "#92400e" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: "4px 8px",
        background: palette.background,
        color: palette.color,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {labelize(value)}
    </span>
  );
}

function fact(label: string, value: ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 850 }}>{label}</div>
      <div style={{ marginTop: 5, color: "#0f172a", fontSize: 15, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function section(title: string, children: ReactNode) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, color: "#0f172a", fontSize: 20, lineHeight: 1.2 }}>{title}</h2>
      {children}
    </section>
  );
}

function preview(previewState: Omit<SingleSiteStudioPreviewState, "label"> & { label: string }) {
  const retryCopy = previewState.available
    ? "If this frame shows a connection-session error, refresh the Airship page or open the internal preview again. The draft editor below remains usable."
    : null;

  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{previewState.label}</h3>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>
            {previewState.siteVersionId ? `Runtime site version ${previewState.siteVersionId}` : "No runtime site version ref"}
          </div>
        </div>
        {badge(previewState.available ? "internal_preview" : "internal_preview_unavailable", previewState.available ? "good" : "warn")}
      </div>
      {previewState.available && previewState.route ? (
        <div style={{ position: "relative", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff", minHeight: 360 }}>
          <iframe
            title={previewState.label}
            src={previewState.route}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            style={{ display: "block", width: "100%", height: 360, border: 0, background: "#fff" }}
          />
          {retryCopy ? (
            <div style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 12, lineHeight: 1.45, padding: "8px 10px" }}>
              {retryCopy}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", padding: 12, color: "#92400e", fontSize: 13 }}>
          <strong>Internal preview unavailable.</strong> {previewState.unavailableReason}
        </div>
      )}
      <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{previewState.authNote}</div>
    </div>
  );
}

function airshipCandidateSummary(model: AirshipSingleSiteEditorReadonlyProjection) {
  const candidate = model.previews.airshipDraftCandidate;
  const previewHost = model.importedSiteModel.latestInternalPreviewHost;
  if (!candidate) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <AirshipDraftCandidateAction
          migrationId={model.migrationId}
          savedDraftId={model.draftPanel.persistence.draftId}
          savedDraftVersion={model.draftPanel.persistence.version}
          initialCandidate={null}
        />
        <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 12, fontSize: 13, lineHeight: 1.45 }}>
          <strong>Airship draft candidate unavailable.</strong> Saved draft edits have not yet been materialized as a separate internal preview candidate.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <AirshipDraftCandidateAction
        migrationId={model.migrationId}
        savedDraftId={model.draftPanel.persistence.draftId}
        savedDraftVersion={model.draftPanel.persistence.version}
        initialCandidate={candidate}
      />
      <AirshipDraftCandidateReviewAction
        migrationId={model.migrationId}
        savedDraftId={model.draftPanel.persistence.draftId}
        savedDraftVersion={model.draftPanel.persistence.version}
        candidate={candidate}
        initialReview={model.previews.airshipDraftCandidateReview}
      />
      <AirshipPublishReadinessAction
        migrationId={model.migrationId}
        savedDraftId={model.draftPanel.persistence.draftId}
        savedDraftVersion={model.draftPanel.persistence.version}
        candidate={candidate}
        review={model.previews.airshipDraftCandidateReview}
        initialReadiness={model.previews.airshipDraftCandidatePublishReadiness}
        initialDryRun={model.previews.airshipDraftCandidateGovernedDryRun}
      />
      <AirshipPreviewHostBindingAction
        migrationId={model.migrationId}
        readback={previewHost}
      />
      {preview(candidate)}
      {previewHost ? (
        <div style={{ border: "1px solid #ccfbf1", borderRadius: 8, background: "#f0fdfa", padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {badge(previewHost.label, "good")}
            {badge(previewHost.bindingStatus.label, previewHost.bindingStatus.tone)}
            {badge(previewHost.activePointerStatus.label, previewHost.activePointerStatus.tone)}
            {badge(previewHost.externalSourceDomainStatus.label, previewHost.externalSourceDomainStatus.tone)}
          </div>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {fact("Candidate site version", previewHost.candidateSiteVersionId)}
            {fact("Artifact", previewHost.candidateArtifactId)}
            {fact(
              "Preview URL",
              <a href={previewHost.previewUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
                {previewHost.previewUrl}
              </a>,
            )}
            {fact("Preview host binding", previewHost.binding ? `${previewHost.binding.id} / ${previewHost.binding.status} / ${previewHost.binding.bindingKind}` : "missing")}
            {fact("Preview host status", previewHost.bindingStatus.detail)}
            {fact("Active/live pointer", previewHost.activePointerStatus.detail)}
            {fact("External customer domain", previewHost.externalSourceDomainStatus.detail)}
          </dl>
        </div>
      ) : null}
      <div style={{ border: "1px solid #bae6fd", borderRadius: 8, background: "#f0f9ff", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {badge(candidate.statusLabel, "warn")}
          {badge("accepted/saved edits applied", "good")}
          {badge("rejected CTA not applied", "neutral")}
        </div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {fact("Draft candidate", candidate.siteVersionId)}
          {fact("Preview artifact", candidate.runtimeArtifactId)}
          {fact("Source live/published version", candidate.sourceLiveSiteVersionId)}
          {fact("Draft", `${candidate.draftId} v${candidate.draftVersion}`)}
        </dl>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#0369a1", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Applied</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#0f172a", fontSize: 13, lineHeight: 1.5 }}>
              {candidate.appliedEdits.map((edit) => (
                <li key={edit.draftEditId}>
                  <strong>{edit.targetSectionPage}:</strong> {edit.appliedTextContent}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Skipped</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#0f172a", fontSize: 13, lineHeight: 1.5 }}>
              {candidate.skippedEdits.map((edit) => (
                <li key={edit.draftEditId}>
                  <strong>{edit.targetSectionPage}:</strong> {edit.skippedTextContent} ({edit.reason})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function field(label: string, value: string, multiline = false) {
  return (
    <label style={{ display: "grid", gap: 5, minWidth: 0, color: "#475569", fontSize: 12, fontWeight: 850 }}>
      {label}
      {multiline ? (
        <textarea
          readOnly
          defaultValue={value}
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "9px 10px",
            color: "#0f172a",
            background: "#fff",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        />
      ) : (
        <input
          readOnly
          defaultValue={value}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "9px 10px",
            color: "#0f172a",
            background: "#fff",
            fontSize: 13,
          }}
        />
      )}
    </label>
  );
}

function recommendationRow(item: AirshipSingleSiteRecommendationMaterial) {
  return (
    <article key={item.id} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
        <strong style={{ color: "#0f172a", fontSize: 14, lineHeight: 1.3 }}>{item.title}</strong>
        {badge(item.sourceStatus, item.sourceStatus === "applied" ? "good" : "warn")}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>{item.key}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {field("Target section/page", item.targetSectionPage)}
        {field("Current text/content summary", item.currentTextContentSummary, true)}
        {field("Proposed text/content", item.proposedTextContent, true)}
        {field("Reason for change", item.reasonForChange, true)}
        {field("Status", item.sourceStatus)}
        {field("Preview impact", item.previewImpact, true)}
      </div>
    </article>
  );
}

function demoReadinessPanel(model: AirshipSingleSiteEditorReadonlyProjection) {
  const demo = model.demoReadiness;
  if (!demo) return null;

  return section(
    "MVP Demo Readiness",
    <div style={{ border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", padding: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {badge(demo.status, "good")}
        {badge(demo.demoUrlStatus, "good")}
        {badge(demo.externalProductionSite.status, "warn")}
      </div>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
        {fact(
          "GNR8 demo URL",
          <a href={demo.demoUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
            {demo.demoUrl}
          </a>,
        )}
        {fact("Current active pointer", `${demo.activePointerTarget.siteVersionId} / ${demo.activePointerTarget.runtimeArtifactId}`)}
        {fact(
          "External www.chs.si",
          <span>
            <a href={demo.externalProductionSite.url} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {demo.externalProductionSite.url}
            </a>{" "}
            ({labelize(demo.externalProductionSite.status)})
          </span>,
        )}
        {fact("Host binding", `${demo.hostBinding.id} / ${demo.hostBinding.status} / ${demo.hostBinding.mode} / ${demo.hostBinding.runtimeSiteId}`)}
      </dl>
      <div style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Admin-only rollback refs</div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {fact("Rollback target pointer", `${demo.rollbackRefs.previousSiteVersionId} / ${demo.rollbackRefs.previousRuntimeArtifactId}`)}
          {fact("Current Airship pointer", `${demo.rollbackRefs.currentSiteVersionId} / ${demo.rollbackRefs.currentRuntimeArtifactId}`)}
          {fact("Promote audit rows", demo.rollbackRefs.promoteAuditRows.join(" / "))}
          {fact(
            "Readback boundary",
            demo.boundary.pointerMutatedByThisReadback === false &&
              demo.boundary.promoteToLiveRunByThisReadback === false &&
              demo.boundary.rollbackRunByThisReadback === false
              ? "no pointer mutation, no promote-to-live, no rollback"
              : "review required",
          )}
        </dl>
      </div>
      <AirshipSimplePromoteRollbackAction migrationId={model.migrationId} demoReadiness={demo} />
    </div>,
  );
}

export function AirshipSingleSiteEditor({ model }: Props) {
  const improvementTone = model.aiImprovementStatus.deterministicEditableChangesGenerated ? "good" : "warn";

  return (
    <main style={{ display: "grid", gap: 22, padding: 20, color: "#0f172a", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ display: "grid", gap: 16, border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Airship</div>
            <h1 style={{ margin: "4px 0 0", color: "#0f172a", fontSize: 30, lineHeight: 1.1 }}>{model.importedSite} single-site editor</h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={model.links.airshipEditor} style={{ border: "1px solid #1d4ed8", borderRadius: 8, background: "#1d4ed8", color: "#fff", padding: "10px 13px", fontSize: 14, fontWeight: 900, textDecoration: "none" }}>
              Open Airship Editor
            </a>
            <a href={model.links.liveSite} target="_blank" rel="noreferrer" style={{ border: "1px solid #0f766e", borderRadius: 8, background: "#0f766e", color: "#fff", padding: "10px 13px", fontSize: 14, fontWeight: 900, textDecoration: "none" }}>
              Open live site
            </a>
            <a href={model.links.singleSiteStudio} style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#334155", padding: "10px 13px", fontSize: 14, fontWeight: 850, textDecoration: "none" }}>
              Open Single-Site Studio
            </a>
          </div>
        </div>

        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {fact("Imported site", model.importedSite)}
          {fact(
            "Source URL",
            <a href={model.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {model.sourceUrl}
            </a>,
          )}
          {fact("MVP status", badge(model.mvpStatus, "good"))}
          {fact("AI improvement status", badge(model.aiImprovementStatus.label, improvementTone))}
          {fact(
            "Live site link",
            <a href={model.liveSiteUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {model.liveSiteUrl}
            </a>,
          )}
          {fact("Migration", model.migrationId ?? "lookup required")}
        </dl>
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
          {model.aiImprovementStatus.detail}
        </div>
      </section>

      {demoReadinessPanel(model)}

      {section(
        "Previews",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
          {preview({ ...model.previews.currentLivePublished, label: "Current live/published preview" })}
          {airshipCandidateSummary(model)}
        </div>,
      )}

      {section(
        model.draftPanel.title,
        <>
          <AirshipProofWorkflowPanel
            migrationId={model.migrationId}
            savedDraftId={model.draftPanel.persistence.draftId}
            savedDraftVersion={model.draftPanel.persistence.version}
            freshDraftProof={airshipProofFreshDraftProof(model)}
          />
          {model.draftPanel.drafts.length > 0 && model.draftPanel.draftPreview ? (
            <AirshipSingleSiteLocalDraftEditor
              migrationId={model.migrationId}
              drafts={model.draftPanel.drafts}
              draftPreview={model.draftPanel.draftPreview}
              controlNote={model.draftPanel.controlNote}
              persistence={model.draftPanel.persistence}
            />
          ) : (
            <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 12, fontSize: 14, fontWeight: 850 }}>
              {model.draftPanel.emptyMessage}
            </div>
          )}
        </>,
      )}

      {section(
        "Recommendation source material",
        <div style={{ display: "grid", gap: 10 }}>
          {model.draftPanel.recommendationMaterial.map(recommendationRow)}
        </div>,
      )}
    </main>
  );
}
