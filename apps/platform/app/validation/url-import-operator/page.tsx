import { UrlImportOperatorConsole } from "@/app/validation/url-import-operator/_components/url-import-operator-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function UrlImportOperatorPage() {
  return (
    <main
      style={{
        padding: 18,
        maxWidth: 1300,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20 }}>URL Import + Preview Operator (Internal)</h1>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        Minimal internal operator console for one public landing-page URL. Uses existing deterministic URL import runtime only, with explicit
        simulation/materialize execution mode.
      </p>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        Validation control tower:{" "}
        <a href="/validation" style={{ color: "#1d4ed8" }}>
          /validation
        </a>{" "}
        | Fixture operator flow:{" "}
        <a href="/validation/beta-export-operator" style={{ color: "#1d4ed8" }}>
          /validation/beta-export-operator
        </a>
      </p>

      <UrlImportOperatorConsole />

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 14, marginTop: 12, background: "#ffffff" }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Implementation Notes</h2>
        <ul style={{ margin: "10px 0 0 18px", color: "#374151" }}>
          <li>
            Route path: <code>/validation/url-import-operator</code>
          </li>
          <li>
            Trigger: client-side <code>POST</code> to <code>/api/validation/url-import</code> with <code>url</code> +{" "}
            <code>executionMode</code> and optional <code>x-gnr8-validation-operator-key</code>.
          </li>
          <li>
            Simulation vs materialize: explicit selector and mode-specific summary section labels to distinguish no-write simulation from
            materialized output.
          </li>
          <li>
            Preview links: <code>executionResult.previewHosting.previewEntryUrl</code> is the primary operator-facing link;{" "}
            <code>executionResult.previewHosting.previewRootUrl</code> is secondary/technical when{" "}
            <code>previewHosting.available=true</code>.
          </li>
          <li>
            Current limitations: single public page only, no recursive crawling, no browser JS rendering, no deploy button, and no
            customer-facing UX.
          </li>
        </ul>
      </section>
    </main>
  );
}
