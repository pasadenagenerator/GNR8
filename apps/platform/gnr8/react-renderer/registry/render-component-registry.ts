import type {
  RenderComponentImplementation,
  RenderComponentRegistry,
} from "@/gnr8/react-renderer/types/renderer-runtime-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function createRenderComponentRegistry(): RenderComponentRegistry {
  const byKind = new Map<string, RenderComponentImplementation>();

  return {
    get(renderKind: string): RenderComponentImplementation | null {
      return byKind.get(renderKind) ?? null;
    },
    has(renderKind: string): boolean {
      return byKind.has(renderKind);
    },
    register(renderKind: string, impl: RenderComponentImplementation): void {
      byKind.set(renderKind, impl);
    },
    listKinds(): string[] {
      return [...byKind.keys()].sort((a, b) => stringCmp(a, b));
    },
  };
}
