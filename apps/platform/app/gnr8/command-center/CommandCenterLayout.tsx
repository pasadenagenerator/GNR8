"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import WorkspaceLayout, { type WorkspaceHeaderModel, type WorkspaceTab } from "../_components/workspace/WorkspaceLayout";

type Props = {
  children: ReactNode;
};

type TabKey = "overview" | "sites" | "agencies";

const TABS: Omit<WorkspaceTab, "active">[] = [
  { key: "overview", href: "/gnr8/command-center", label: "Overview" },
  { key: "sites", href: "/gnr8/command-center/sites", label: "Sites" },
  { key: "agencies", href: "/gnr8/command-center/agencies", label: "Agencies" },
];

function resolveActiveTab(pathname: string): TabKey {
  if (pathname.startsWith("/gnr8/command-center/sites")) return "sites";
  if (pathname.startsWith("/gnr8/command-center/agencies")) return "agencies";
  return "overview";
}

export default function CommandCenterLayout(props: Props) {
  const pathname = usePathname() || "/gnr8/command-center";
  const activeTab = resolveActiveTab(pathname);
  const tabs: WorkspaceTab[] = TABS.map((tab) => ({ ...tab, active: tab.key === activeTab }));
  const header: WorkspaceHeaderModel = {
    contextLabel: "Command Center",
    title: "Superadmin Workspace",
    subtitle: "Platform Operations",
    titleFontSize: 30,
    subtitleFontSize: 13,
    meta: (
      <>
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
      </>
    ),
  };

  return (
    <WorkspaceLayout
      maxWidth={1800}
      padding={20}
      header={header}
      tabs={tabs}
      tabsAriaLabel="Command Center navigation"
    >
      {props.children}
    </WorkspaceLayout>
  );
}
