"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from "../_components/workspace/WorkspaceLayout";
import WorkspaceRecentItems from "../_components/workspace/WorkspaceRecentItems";
import WorkspaceShortcuts, { type WorkspaceShortcut } from "../_components/workspace/WorkspaceShortcuts";
import WorkspaceStateSync from "../_components/workspace/WorkspaceStateSync";
import { buildWorkspaceViewModel, type WorkspaceTabInput } from "../_components/workspace/workspace-view-model";

type Props = {
  children: ReactNode;
};

type TabKey = "overview" | "ops-inbox" | "sites" | "hosting" | "single-site-publish" | "migration-batches" | "agencies";

const TABS: WorkspaceTabInput[] = [
  { key: "overview", href: "/gnr8/command-center", label: "Overview" },
  { key: "ops-inbox", href: "/gnr8/command-center/ops-inbox", label: "Ops Inbox" },
  { key: "sites", href: "/gnr8/command-center/sites", label: "Sites" },
  { key: "hosting", href: "/gnr8/command-center/hosting", label: "Hosting" },
  { key: "single-site-publish", href: "/gnr8/command-center/single-site-publish", label: "Single-Site Publish" },
  { key: "migration-batches", href: "/gnr8/command-center/migration-batches", label: "Migration Batches" },
  { key: "agencies", href: "/gnr8/command-center/agencies", label: "Agencies" },
];

const COMMAND_CENTER_SHORTCUTS: WorkspaceShortcut[] = [
  {
    id: "create-agency",
    label: "Create Agency",
    href: "/gnr8/command-center/agencies",
    description: "Open agency provisioning flow",
    icon: "+",
  },
  {
    id: "open-agencies",
    label: "Open Agencies",
    href: "/gnr8/command-center/agencies",
    description: "Manage agency admin-view entry points",
    icon: "A",
  },
  {
    id: "open-sites",
    label: "Open Sites",
    href: "/gnr8/command-center/sites",
    description: "Review migration and operations status",
    icon: "S",
  },
  {
    id: "open-hosting",
    label: "Open Hosting",
    href: "/gnr8/command-center/hosting",
    description: "Inspect active runtime and domain state",
    icon: "H",
  },
  {
    id: "open-ops-inbox",
    label: "Open Ops Inbox",
    href: "/gnr8/command-center/ops-inbox",
    description: "Review derived publish shadow work items",
    icon: "O",
  },
  {
    id: "open-migration-batches",
    label: "Open Migration Batches",
    href: "/gnr8/command-center/migration-batches",
    description: "Inspect durable migration batch execution",
    icon: "B",
  },
];

function resolveActiveTab(pathname: string): TabKey {
  if (pathname.startsWith("/gnr8/command-center/ops-inbox")) return "ops-inbox";
  if (pathname.startsWith("/gnr8/command-center/sites")) return "sites";
  if (pathname.startsWith("/gnr8/command-center/hosting")) return "hosting";
  if (pathname.startsWith("/gnr8/command-center/single-site-publish")) return "single-site-publish";
  if (pathname.startsWith("/gnr8/command-center/migration-batches")) return "migration-batches";
  if (pathname.startsWith("/gnr8/command-center/agencies")) return "agencies";
  return "overview";
}

function buildCommandCenterBreadcrumbs(activeTab: TabKey): WorkspaceBreadcrumbItem[] {
  if (activeTab === "ops-inbox") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Ops Inbox" }];
  }

  if (activeTab === "sites") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Sites" }];
  }

  if (activeTab === "agencies") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Agencies" }];
  }

  if (activeTab === "hosting") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Hosting" }];
  }

  if (activeTab === "single-site-publish") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Single-Site Publish" }];
  }

  if (activeTab === "migration-batches") {
    return [{ label: "Command Center", href: "/gnr8/command-center" }, { label: "Migration Batches" }];
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
      commandPalette={{
        routes: [
          { id: "route-command-center", label: "Command Center", href: "/gnr8/command-center", sublabel: "Key route" },
          {
            id: "route-command-center-ops-inbox",
            label: "Command Center Ops Inbox",
            href: "/gnr8/command-center/ops-inbox",
            sublabel: "Key route",
          },
          { id: "route-command-center-sites", label: "Command Center Sites", href: "/gnr8/command-center/sites", sublabel: "Key route" },
          { id: "route-command-center-hosting", label: "Command Center Hosting", href: "/gnr8/command-center/hosting", sublabel: "Key route" },
          {
            id: "route-command-center-single-site-publish",
            label: "Command Center Single-Site Publish",
            href: "/gnr8/command-center/single-site-publish",
            sublabel: "Key route",
          },
          {
            id: "route-command-center-migration-batches",
            label: "Command Center Migration Batches",
            href: "/gnr8/command-center/migration-batches",
            sublabel: "Key route",
          },
          {
            id: "route-command-center-agencies",
            label: "Command Center Agencies",
            href: "/gnr8/command-center/agencies",
            sublabel: "Key route",
          },
        ],
        allowCommandCenter: true,
      }}
      afterTabs={
        <div style={{ marginTop: 12 }}>
          <WorkspaceShortcuts
            title="Productivity Shortcuts"
            helperText="Fast access to high-frequency command-center actions."
            shortcuts={COMMAND_CENTER_SHORTCUTS}
          />
          <WorkspaceRecentItems allowCommandCenter={true} title="Recent Items" maxVisible={6} />
        </div>
      }
    >
      <WorkspaceStateSync />
      {props.children}
    </WorkspaceLayout>
  );
}
