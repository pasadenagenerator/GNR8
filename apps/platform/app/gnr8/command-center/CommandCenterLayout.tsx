"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type Tab = {
  key: "overview" | "sites" | "agencies";
  href: string;
  label: string;
};

const TABS: Tab[] = [
  { key: "overview", href: "/gnr8/command-center", label: "Overview" },
  { key: "sites", href: "/gnr8/command-center/sites", label: "Sites" },
  { key: "agencies", href: "/gnr8/command-center/agencies", label: "Agencies" },
];

function resolveActiveTab(pathname: string): Tab["key"] {
  if (pathname.startsWith("/gnr8/command-center/sites")) return "sites";
  if (pathname.startsWith("/gnr8/command-center/agencies")) return "agencies";
  return "overview";
}

function tabStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: 8,
    border: active ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1e3a8a" : "#0f172a",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
  };
}

export default function CommandCenterLayout(props: Props) {
  const pathname = usePathname() || "/gnr8/command-center";
  const activeTab = resolveActiveTab(pathname);

  return (
    <main
      style={{
        maxWidth: 1800,
        margin: "0 auto",
        padding: 20,
        background: "linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        minHeight: "100vh",
      }}
    >
      <section
        style={{
          border: "1px solid #dbe6f1",
          borderRadius: 12,
          background: "#fff",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ margin: 0, fontSize: 12, color: "#475569" }}>Command Center</div>
            <div style={{ margin: 0, fontSize: 30, color: "#0f172a", fontWeight: 700 }}>Superadmin Workspace</div>
            <div style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Platform Operations</div>
          </div>

          <div style={{ display: "grid", gap: 4, justifyItems: "end", fontSize: 12, color: "#334155" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "4px 10px",
                border: "1px solid #7dd3fc",
                background: "#e0f2fe",
                color: "#0c4a6e",
                fontWeight: 700,
              }}
            >
              Superadmin Context
            </span>
            <span>
              <strong>Surface:</strong> /gnr8/command-center*
            </span>
          </div>
        </div>

        <nav style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Command Center navigation">
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Link key={tab.key} href={tab.href} aria-current={active ? "page" : undefined} style={tabStyle(active)}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </section>

      <div style={{ marginTop: 14 }}>{props.children}</div>
    </main>
  );
}
