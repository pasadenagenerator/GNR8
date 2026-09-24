import React from "react";

import { gnr8StatusStyle, gnr8Styles, gnr8VisualTokens } from "../../../../gnr8/visual-system/gnr8-visual-system";

const colorSwatches = [
  ["Background", gnr8VisualTokens.color.background],
  ["Surface", gnr8VisualTokens.color.surface],
  ["Surface muted", gnr8VisualTokens.color.surfaceMuted],
  ["Panel dark", gnr8VisualTokens.color.panelDark],
  ["Panel dark muted", gnr8VisualTokens.color.panelDarkMuted],
  ["Border", gnr8VisualTokens.color.border],
  ["Border strong", gnr8VisualTokens.color.borderStrong],
  ["Text", gnr8VisualTokens.color.text],
  ["Text muted", gnr8VisualTokens.color.textMuted],
  ["Accent orange", gnr8VisualTokens.color.accentOrange],
  ["Accent hover", gnr8VisualTokens.color.accentOrangeHover],
  ["Accent soft", gnr8VisualTokens.color.accentOrangeSoft],
  ["Success", gnr8VisualTokens.color.success],
  ["Warning", gnr8VisualTokens.color.warning],
  ["Danger", gnr8VisualTokens.color.danger],
  ["Focus ring", gnr8VisualTokens.color.focusRing],
] as const;

function swatchTextColor(hex: string): string {
  return ["#111827", "#1f2937", "#b8550f", "#b91c1c", "#b45309", "#15803d", "#d96c18"].includes(hex)
    ? gnr8VisualTokens.color.textInverse
    : gnr8VisualTokens.color.text;
}

export default function Gnr8VisualSystemReferencePage() {
  return (
    <main style={{ ...gnr8Styles.canvas, minHeight: "100vh", padding: 24 }}>
      <section style={{ display: "grid", gap: 20, maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "grid", gap: 8 }}>
          <div style={{ color: gnr8VisualTokens.color.accentOrange, fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Internal reference</div>
          <h1 style={{ margin: 0, color: gnr8VisualTokens.color.text, fontSize: gnr8VisualTokens.typography.heading.hero, lineHeight: 1.1 }}>
            GNR8 Visual System Foundation
          </h1>
          <p style={{ margin: 0, maxWidth: 760, color: gnr8VisualTokens.color.textMuted, fontSize: 14, lineHeight: 1.5 }}>
            Operator UI tokens for Command Center, Single-Site Studio, Airship chrome, proof panels, preview states, and readiness surfaces.
          </p>
        </header>

        <section style={{ ...gnr8Styles.panel, padding: 16, display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Colors</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            {colorSwatches.map(([label, value]) => (
              <div key={label} style={{ border: `1px solid ${gnr8VisualTokens.color.border}`, borderRadius: 8, overflow: "hidden", background: gnr8VisualTokens.color.surface }}>
                <div style={{ minHeight: 68, padding: 10, background: value, color: swatchTextColor(value), fontSize: 12, fontWeight: 800 }}>{label}</div>
                <code style={{ display: "block", padding: 8, color: gnr8VisualTokens.color.textMuted, fontFamily: gnr8VisualTokens.typography.monoFont, fontSize: 11 }}>
                  {value}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.8fr)", gap: 16 }}>
          <div style={{ ...gnr8Styles.panel, padding: 16, display: "grid", gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Controls</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={{ ...gnr8Styles.primaryButton, padding: "9px 12px", fontWeight: 850 }}>Run Check</button>
              <button type="button" style={{ ...gnr8Styles.neutralButton, padding: "9px 12px", fontWeight: 850 }}>Open Preview</button>
              <button type="button" disabled style={{ border: `1px solid ${gnr8VisualTokens.color.border}`, borderRadius: 6, background: gnr8VisualTokens.color.surfaceMuted, color: gnr8VisualTokens.color.textMuted, padding: "9px 12px", fontWeight: 850 }}>Publish locked</button>
            </div>
            <label style={{ display: "grid", gap: 5, color: gnr8VisualTokens.color.textMuted, fontSize: 12, fontWeight: 850 }}>
              Source URL
              <input defaultValue="https://preview.gnr8.internal/site" style={{ ...gnr8Styles.input, padding: "10px 12px", fontSize: 14 }} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={gnr8StatusStyle("accent")}>draft</span>
              <span style={gnr8StatusStyle("success")}>ready</span>
              <span style={gnr8StatusStyle("warning")}>review needed</span>
              <span style={gnr8StatusStyle("danger")}>blocked</span>
              <span style={gnr8StatusStyle("neutral")}>shadow only</span>
            </div>
            <div style={{ display: "inline-flex", width: "fit-content", gap: 6, padding: 6, border: `1px solid ${gnr8VisualTokens.color.border}`, borderRadius: 8, background: gnr8VisualTokens.color.surfaceMuted }}>
              {["Inspect", "Preview", "Proof"].map((label, index) => (
                <button key={label} type="button" style={{ border: `1px solid ${index === 1 ? gnr8VisualTokens.color.accentOrange : "transparent"}`, borderRadius: 6, background: index === 1 ? gnr8VisualTokens.color.accentOrangeSoft : "transparent", color: index === 1 ? gnr8VisualTokens.color.accentOrangeHover : gnr8VisualTokens.color.textMuted, padding: "6px 9px", fontSize: 12, fontWeight: 850 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <aside style={{ ...gnr8Styles.darkPanel, padding: 16, display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ color: "#fed7aa", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Operator panel</div>
            <h2 style={{ margin: 0, color: gnr8VisualTokens.color.textInverse, fontSize: 20 }}>Readiness Gate</h2>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
              Publish boundary remains locked until draft, preview, proof, and approval refs match.
            </p>
            <pre style={{ ...gnr8Styles.monoReadback, margin: 0, padding: 12, background: gnr8VisualTokens.color.panelDarkMuted, color: gnr8VisualTokens.color.textInverse, borderColor: "#374151", whiteSpace: "pre-wrap" }}>
{`draft: saved
preview: internal_only
publish: no_live_mutation
focus: orange ring`}
            </pre>
          </aside>
        </section>
      </section>
    </main>
  );
}
