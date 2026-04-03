import type { WorkspaceHeaderModel, WorkspaceTab } from './WorkspaceLayout'

export type WorkspaceTabInput = Omit<WorkspaceTab, 'active'>

export type WorkspaceBackLinkInput = {
  href: string
  label: string
}

export type WorkspaceHeaderInput = Omit<WorkspaceHeaderModel, 'backHref' | 'backLabel'> & {
  backLink?: WorkspaceBackLinkInput
}

type BuildWorkspaceTabsInput<TTabKey extends string> = {
  tabs: WorkspaceTabInput[]
  activeKey: TTabKey
  fallbackActiveKey?: TTabKey
}

type BuildWorkspaceViewModelInput<TTabKey extends string> = {
  header: WorkspaceHeaderInput
  tabs: WorkspaceTabInput[]
  activeKey: TTabKey
  fallbackActiveKey?: TTabKey
}

function resolveActiveTabKey<TTabKey extends string>(
  tabs: WorkspaceTabInput[],
  activeKey: TTabKey,
  fallbackActiveKey?: TTabKey,
): string {
  const keys = new Set(tabs.map((tab) => tab.key))
  if (keys.has(activeKey)) return activeKey
  if (fallbackActiveKey && keys.has(fallbackActiveKey)) return fallbackActiveKey
  return tabs[0]?.key ?? activeKey
}

export function buildWorkspaceHeader(input: WorkspaceHeaderInput): WorkspaceHeaderModel {
  if (!input.backLink) return input
  const { backLink, ...rest } = input
  return {
    ...rest,
    backHref: backLink.href,
    backLabel: backLink.label,
  }
}

export function buildWorkspaceTabs<TTabKey extends string>(input: BuildWorkspaceTabsInput<TTabKey>): WorkspaceTab[] {
  const normalizedActiveKey = resolveActiveTabKey(input.tabs, input.activeKey, input.fallbackActiveKey)
  return input.tabs.map((tab) => ({
    ...tab,
    active: tab.key === normalizedActiveKey,
  }))
}

export function buildWorkspaceViewModel<TTabKey extends string>(input: BuildWorkspaceViewModelInput<TTabKey>): {
  header: WorkspaceHeaderModel
  tabs: WorkspaceTab[]
} {
  return {
    header: buildWorkspaceHeader(input.header),
    tabs: buildWorkspaceTabs({
      tabs: input.tabs,
      activeKey: input.activeKey,
      fallbackActiveKey: input.fallbackActiveKey,
    }),
  }
}
