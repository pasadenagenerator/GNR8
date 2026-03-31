import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicEntryPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined;
  const typeValue = resolvedSearchParams?.type;
  const type = String(Array.isArray(typeValue) ? typeValue[0] ?? "" : typeValue ?? "")
    .trim()
    .toLowerCase();

  if (type === "recovery") {
    const forwardedParams = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(resolvedSearchParams ?? {})) {
      if (Array.isArray(rawValue)) {
        for (const value of rawValue) {
          if (value != null) forwardedParams.append(key, value);
        }
        continue;
      }
      if (rawValue != null) forwardedParams.set(key, rawValue);
    }
    const suffix = forwardedParams.toString();
    redirect(suffix ? `/reset-password?${suffix}` : "/reset-password");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 15% 20%, rgba(160, 174, 192, 0.12) 0%, rgba(160, 174, 192, 0) 44%), #f8fafc",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        color: "#0f172a",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          background: "#ffffff",
          padding: "28px 24px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
          display: "grid",
          gap: 14,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 0.2 }}>GNR8</h1>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: 2.4, color: "#334155" }}>WEB AGENCY OS</p>

        <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
          <Link
            href="/login"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#0f172a",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Login
          </Link>
          <Link
            href="/signup"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Signup
          </Link>
        </div>
      </section>
    </main>
  );
}
