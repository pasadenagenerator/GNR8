const FORBIDDEN_IMPORTER_PATTERNS: readonly RegExp[] = [
  /\/gnr8\/runtime\//,
  /\/gnr8\/migration-factory\//,
  /\/gnr8\/migration\//,
  /\/gnr8\/canonical\//,
  /\/gnr8\/layout-graph\//,
  /\/gnr8\/migration\/layout-graph\//,
];

type BuilderBoundaryAssertOptions = {
  moduleId?: string;
  enforceForbiddenImporter?: boolean;
};

function resolveForbiddenImporterFromStack(): string | null {
  const stack = new Error().stack ?? "";
  const lines = stack.split("\n");
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;
    if (!FORBIDDEN_IMPORTER_PATTERNS.some((pattern) => pattern.test(normalized))) continue;
    return normalized;
  }
  return null;
}

export function assertBuilderOnlyContext(options: BuilderBoundaryAssertOptions = {}): void {
  if (process.env.GNR8_RUNTIME_MODE === "public_runtime") {
    throw new Error(
      "[builder-boundary] builder-only module executed in forbidden runtime mode: public_runtime",
    );
  }

  if (options.enforceForbiddenImporter) {
    const forbiddenImporter = resolveForbiddenImporterFromStack();
    if (forbiddenImporter) {
      const moduleSuffix = options.moduleId ? ` for module ${options.moduleId}` : "";
      throw new Error(
        `[builder-boundary] builder-only boundary breach${moduleSuffix}. Forbidden importer detected: ${forbiddenImporter}`,
      );
    }
  }
}

export function registerBuilderOnlyModule(moduleId: string): void {
  assertBuilderOnlyContext({ moduleId, enforceForbiddenImporter: true });
}
