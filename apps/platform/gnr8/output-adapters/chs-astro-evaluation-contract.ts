import { createAstroProductionCandidateId } from "./astro-production-candidate-record";

export const CHS_ASTRO_EVALUATION = {
  runtimeSiteId: "test_runtime_e2e_site_chs_astro_eval_7f13c9",
  internalHost: "chs-astro-eval.staging.gnr8.test",
  sourceUrl: "https://chs-astro-eval.staging.gnr8.test/",
  baselineSiteVersionId: "22000000-0000-4222-8222-000000000001",
  sourceSiteVersionId: "22000000-0000-4222-8222-000000000002",
  registrationOperationId: "22000000-0000-4222-8222-000000000003",
  promotionIdempotencyKey: "mvp22:chs:astro:promotion:v1",
  ownership: {
    agencyId: "6a09c2d9-12c3-4c19-a466-0c29ae2f723e",
    agencyName: "E-pro",
    agencySlug: "e-pro",
    organizationId: "e61d1982-068f-4d84-bb6f-c3fbfc93f39b",
    organizationName: "Glazura Glizon",
    organizationSlug: "glazura-glizon",
    siteId: "a03fcb5b-6ad9-4b19-a682-4c06f998881a",
  },
} as const;

export const CHS_ASTRO_EVALUATION_CANDIDATE_ID = createAstroProductionCandidateId(
  CHS_ASTRO_EVALUATION.registrationOperationId,
);
