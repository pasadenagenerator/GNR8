import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 85% 10%, rgba(148, 163, 184, 0.14) 0%, rgba(148, 163, 184, 0) 36%), #f8fafc",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        color: "#0f172a",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 620,
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          background: "#ffffff",
          padding: "26px 24px",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Signup</h1>
        <p style={{ margin: 0, color: "#334155" }}>
          GNR8 access is currently invite-based. Ask your agency administrator or GNR8 admin for an invite link.
        </p>
        <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
          If you do not have an invite, request access through your agency contact or email support.
        </p>
        <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="mailto:support@pasadenagenerator.com?subject=GNR8%20Access%20Request"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #0f172a",
              borderRadius: 10,
              padding: "8px 12px",
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Request access
          </a>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "8px 12px",
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
