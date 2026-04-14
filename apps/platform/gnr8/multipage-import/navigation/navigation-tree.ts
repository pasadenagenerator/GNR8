import type { NavigationTree, NavigationTreeItem, RouteNode } from '../types/contracts'
import { parentPath } from '../normalization/route-normalization'

function buildTree(items: RouteNode[]): NavigationTreeItem[] {
  const byPath = new Map(items.map((route) => [route.normalizedPath, route]))
  const childrenByParentPath = new Map<string, RouteNode[]>()

  for (const route of items) {
    const parent = parentPath(route.normalizedPath)
    if (!parent || !byPath.has(parent)) {
      const list = childrenByParentPath.get('') ?? []
      list.push(route)
      childrenByParentPath.set('', list)
      continue
    }
    const list = childrenByParentPath.get(parent) ?? []
    list.push(route)
    childrenByParentPath.set(parent, list)
  }

  const build = (parent: string): NavigationTreeItem[] => {
    const children = (childrenByParentPath.get(parent) ?? []).slice().sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath))
    return children.map((route) => ({
      routeId: route.routeId,
      path: route.normalizedPath,
      title: route.title,
      children: build(route.normalizedPath),
    }))
  }

  return build('')
}

function filterRoutes(routes: RouteNode[], kind: NavigationTree['kind']): RouteNode[] {
  if (kind === 'primary') {
    return routes.filter((route) => route.navigationVisibility === 'header' || route.pageRole === 'homepage')
  }
  if (kind === 'footer') {
    return routes.filter((route) => route.navigationVisibility === 'footer')
  }
  return routes.filter((route) => route.navigationVisibility === 'utility')
}

export function buildNavigationTrees(routes: RouteNode[]): NavigationTree[] {
  const kinds: NavigationTree['kind'][] = ['primary', 'utility', 'footer']
  return kinds.map((kind) => {
    const scoped = filterRoutes(routes, kind)
    return {
      treeId: `nav_${kind}`,
      kind,
      items: buildTree(scoped),
    }
  })
}
