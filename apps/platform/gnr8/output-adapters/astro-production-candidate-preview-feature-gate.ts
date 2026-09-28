import "server-only";

export const ASTRO_PRODUCTION_CANDIDATE_PREVIEW_FEATURE_GATE =
  "GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED" as const;
export const ASTRO_PRODUCTION_CANDIDATE_PREVIEW_ENABLED_VALUE = "1" as const;

export class AstroProductionCandidatePreviewConfigurationError extends Error {
  constructor() {
    super("Astro production candidate preview dependencies are not configured.");
    this.name = "AstroProductionCandidatePreviewConfigurationError";
  }
}

/**
 * The route is enabled only by the exact server-owned value documented above.
 * Missing, blank, or any other value remains disabled.
 */
export function parseAstroProductionCandidatePreviewFeatureGate(value: unknown): boolean {
  return value === ASTRO_PRODUCTION_CANDIDATE_PREVIEW_ENABLED_VALUE;
}

export function isAstroProductionCandidatePreviewFeatureEnabled(): boolean {
  return parseAstroProductionCandidatePreviewFeatureGate(
    process.env[ASTRO_PRODUCTION_CANDIDATE_PREVIEW_FEATURE_GATE],
  );
}
