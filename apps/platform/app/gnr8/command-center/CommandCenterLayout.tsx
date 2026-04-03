"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from "../_components/workspace/WorkspaceLayout";
import WorkspaceRecentItems from "../_components/workspace/WorkspaceRecentItems";
import WorkspaceStateSync from "../_components/workspace/WorkspaceStateSync";
import { buildWorkspaceViewModel, type WorkspaceTabInput } from "../_components/workspace/workspace-view-model";

type Props = {
  children: ReactNode;
};

type TabKey = "overview" | "sites" | "agencies";

const TABS: WorkspaceTabInput[] = [
  { key: "overview", href: "/gnr8/command-center", label: "Overview" },
  { key: "sites", href: "/gnr8/command-center/sites", label: "Sites" },
  { key: "agencies", href: "/gnr8/command-center/agencies", label: "Agencies" },
];

function resolveActiveTab(pathname: string): TabKey {
  if (pathname.startsWith("/gnr8/command-center/sites")) return "sites";
  if (pathname.startsWith("/gnr8/command-center/agencies")) return "agencies";
  return "overview";
}

function buildCommandCenterBreadcrumbs(activeTab: TabKey): WorkspaceBreadcrumbItem[] {
  if (activeTab === "sites") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Sites" }];
  }

  if (activeTab === "agencies") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Agencies" }];
  }

  return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Overview" }];
}

export default function CommandCenterLayout(props: Props) {
  const pathname = usePathname() || "/gnr8/command-center";
  const activeTab = resolveActiveTab(pathname);
  const { header, tabs } = buildWorkspaceViewModel({
    header: {
      breadcrumbs: buildCommandCenterBreadcrumbs(activeTab),
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
    },
    tabs: TABS,
    activeKey: activeTab,
    fallbackActiveKey: "overview",
  });

  return (
    <WorkspaceLayout
      maxWidth={1800}
      padding={20}
      header={header}
      tabs={tabs}
      tabsAriaLabel="Command Center navigation"
      afterTabs={<WorkspaceRecentItems allowCommandCenter={true} title="Recent Items" maxVisible={6} />}
    >
      <WorkspaceStateSync />
      {props.children}
    </WorkspaceLayout>
  );
}
