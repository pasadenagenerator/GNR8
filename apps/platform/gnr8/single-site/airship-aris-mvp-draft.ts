import "server-only";

import type { CanonicalSiteVersionSnapshot } from "../runtime/types";
import {
  AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION,
  DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS,
  type AirshipSingleSiteDraftEdit,
  type AirshipSingleSiteDraftSeed,
} from "./airship-single-site-draft-service";

export const AIRSHIP_ARIS_MVP_DRAFT_VERSION = "airship-aris-mvp-source-evidence-draft:v1" as const;
export const AIRSHIP_ARIS_MIGRATION_ID = "ebf62324-1e51-4435-abd7-004722fb48d6" as const;
export const AIRSHIP_ARIS_SITE_LABEL = "aris.si" as const;
export const AIRSHIP_ARIS_SOURCE_URL = "https://www.aris.si/" as const;
export const AIRSHIP_ARIS_OWNERSHIP_SITE_ID = "ccc4e66e-5dcb-4556-a339-51dbe891cfd8" as const;
export const AIRSHIP_ARIS_CLIENT_ID = "e61d1982-068f-4d84-bb6f-c3fbfc93f39b" as const;
export const AIRSHIP_ARIS_AGENCY_ID = "6a09c2d9-12c3-4c19-a466-0c29ae2f723e" as const;
export const AIRSHIP_ARIS_RUNTIME_SITE_ID = "site_6b859cc1599a5b6642dc" as const;
export const AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID = "ae35c6ad-5a26-4413-a3c8-64362b042810" as const;
export const AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID = "f024459a-8bc9-41b9-b2a7-137ee85eaf83" as const;
export const AIRSHIP_ARIS_DRAFT_ID = "5ed1b4da-eb06-4eee-bdc0-5b5cdec99707" as const;
export const AIRSHIP_ARIS_DRAFT_VERSION = 1 as const;
export const AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID = "6d712ab9-f48e-49a3-9c26-03915365d746" as const;
export const AIRSHIP_ARIS_CANDIDATE_ARTIFACT_ID = "8073651e-510b-47e7-8363-8a742b7967db" as const;
export const AIRSHIP_ARIS_PREVIEW_HOSTNAME = "aris-airship.app.pasadenagenerator.com" as const;
export const AIRSHIP_ARIS_PREVIEW_BINDING_ID = "e73e5d73-cbbe-4ff7-9cdb-75c0ee6aa2ae" as const;
export const AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID = "c868beb0-08d8-412c-9f21-4ef49cfae4c5" as const;
export const AIRSHIP_ARIS_CAPTURE_RUN_ID = "imported-url-site-5a3cd0011548018e" as const;
export const AIRSHIP_ARIS_SOURCE_PACKAGE_REF = "b66c7af5-f365-4d85-a821-46eb31dbc633" as const;

export const AIRSHIP_ARIS_FORBIDDEN_DRAFT_PATTERNS = [
  /\bCHS\b/,
  /chs\.si/i,
  /sales@chs\.si/i,
  /Less risk\. More control\. Better IT\./i,
  /cybersecurity,\s*data systems,\s*and hybrid infrastructure/i,
  /FALLBACK PREVIEW/i,
  /raw-block/i,
  /CAPTURE_DRIVEN/i,
  /Diagnostics:/i,
] as const;

const ARIS_HEADLINE = "ARIS - Apple in Canton ponudba";
const ARIS_SUBHEADING = "MacBook Air, Mac Studio in Canton Smart izdelki z osebnim svetovanjem, testiranjem in ponudbo v Ljubljani.";
const ARIS_CTA = "Želim ponudbo";
const ARIS_PRODUCT_OFFER = [
  "NOVI Mac Book Air 15 - Neverjetno velik. Čudovito tanek.",
  "NOVI Mac Studio - Vir supermoči.",
  "Canton Smart - pametno povezovanje za zvok celotnega doma.",
  "Posebni ponudbi: MacBook Pro 16 M3 Pro in Canton Smart Reference 5 K.",
].join(" ");
const ARIS_BRAND_PROOF = "ARIS JABOLKO d. o. o. povezuje Apple, Canton, micromega, Blackmagic Design, Eizo, Just Normlicht in in-akustik ponudbo.";
const ARIS_CONTACT = "Kontaktirajte nas za svetovanje, rezervacijo termina testiranja ali nakup: 040 397 527, prodaja@aris.si, Bognarjeva pot 44, 1000 Ljubljana. Na voljo je tudi prijava na ARIS tedenska obvestila.";

export function isArisAirshipMvpMigration(migrationId: string | null | undefined): boolean {
  return migrationId === AIRSHIP_ARIS_MIGRATION_ID;
}

export function arisAirshipDraftContainsForbiddenCopy(value: unknown): boolean {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return AIRSHIP_ARIS_FORBIDDEN_DRAFT_PATTERNS.some((pattern) => pattern.test(serialized));
}

function assertArisDraftSafe(value: unknown) {
  if (arisAirshipDraftContainsForbiddenCopy(value)) {
    throw new Error("Airship ARIS draft identity violation: CHS copy or fallback diagnostics are not allowed in ARIS drafts.");
  }
}

export function buildArisAirshipMvpDraftEdits(): AirshipSingleSiteDraftEdit[] {
  const edits: AirshipSingleSiteDraftEdit[] = [
    {
      id: "airship-aris-home-headline",
      fieldKey: "headline",
      targetSectionPage: "Homepage / hero headline",
      currentTextContentSummary: "Source evidence and public ARIS page show ARIS identity with Apple and Canton product-offer orientation.",
      proposedTextContent: ARIS_HEADLINE,
      reasonForChange: "Keep the first-viewport headline anchored to ARIS identity and captured product themes.",
      status: "edited",
      previewImpact: "Hero headline appears in the internal Airship draft candidate only.",
    },
    {
      id: "airship-aris-home-subheading",
      fieldKey: "subheading",
      targetSectionPage: "Homepage / hero subheading",
      currentTextContentSummary: "Source evidence and public ARIS page show MacBook Air, Mac Studio, Canton Smart, consultation, testing, and offer-request content.",
      proposedTextContent: ARIS_SUBHEADING,
      reasonForChange: "Condense the captured ARIS offer into a scannable Slovene value proposition.",
      status: "edited",
      previewImpact: "Hero subheading appears in the internal Airship draft candidate only.",
    },
    {
      id: "airship-aris-home-product-offers",
      targetSectionPage: "Homepage / product offer section",
      currentTextContentSummary: "Source evidence includes Apple/Mac offers and Canton audio products.",
      proposedTextContent: ARIS_PRODUCT_OFFER,
      reasonForChange: "Carry forward the main retail/product-offer themes without relying on the degraded transformed artifact.",
      status: "edited",
      previewImpact: "Product offer copy is represented in the internal Airship MVP candidate content summary.",
    },
    {
      id: "airship-aris-home-brand-category-proof",
      targetSectionPage: "Homepage / brand and category proof",
      currentTextContentSummary: "Source evidence includes ARIS identity plus external brand/category links.",
      proposedTextContent: ARIS_BRAND_PROOF,
      reasonForChange: "Show source-supported brand/category breadth while avoiding exact clone-fidelity claims.",
      status: "edited",
      previewImpact: "Brand/category proof appears in the internal Airship MVP candidate content summary.",
    },
    {
      id: "airship-aris-home-ctaLabel",
      fieldKey: "ctaLabel",
      targetSectionPage: "Homepage / contact inquiry call-to-action",
      currentTextContentSummary: "Source evidence includes inquiry form, newsletter opt-in, working hours, phone, email, and Ljubljana address.",
      proposedTextContent: ARIS_CTA,
      reasonForChange: "Keep the CTA tied to the captured ARIS inquiry flow.",
      status: "edited",
      previewImpact: "CTA label appears in the internal Airship draft candidate only.",
    },
  ];
  assertArisDraftSafe(edits);
  return edits;
}

export function buildArisAirshipMvpDraftSeed(input: {
  tenantId?: string | null;
  actorId?: string | null;
} = {}): AirshipSingleSiteDraftSeed {
  const seed: AirshipSingleSiteDraftSeed = {
    migrationId: AIRSHIP_ARIS_MIGRATION_ID,
    tenantId: input.tenantId ?? null,
    clientId: AIRSHIP_ARIS_CLIENT_ID,
    siteId: AIRSHIP_ARIS_OWNERSHIP_SITE_ID,
    agencyId: AIRSHIP_ARIS_AGENCY_ID,
    sourceUrl: AIRSHIP_ARIS_SOURCE_URL,
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
      originalCloneRuntimeArtifactId: AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
      improvedCandidateSiteVersionId: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
      improvedCandidateRuntimeArtifactId: AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
    },
    draftEdits: buildArisAirshipMvpDraftEdits(),
    metadata: {
      serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION,
      projectionVersion: AIRSHIP_ARIS_MVP_DRAFT_VERSION,
      previewPersistence: "saved_airship_draft",
      liveSiteUrl: AIRSHIP_ARIS_SOURCE_URL,
      liveBoundary: "not_applied_to_live_site",
      styleSettings: {
        ...DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS,
        backgroundTint: "#ffffff",
        ctaColor: "#111827",
      },
      internalLabel: "simplified ARIS MVP draft generated from source evidence",
      sourceEvidenceBasis: `sourceReview=${AIRSHIP_ARIS_SOURCE_EVIDENCE_REVIEW_ID};captureRun=${AIRSHIP_ARIS_CAPTURE_RUN_ID};sourcePackage=${AIRSHIP_ARIS_SOURCE_PACKAGE_REF};publicSource=${AIRSHIP_ARIS_SOURCE_URL}`,
      sourceLimitations: "Runtime artifact was degraded and not used as source truth; simplified one-page MVP draft only; no exact clone fidelity claimed.",
    },
  };
  assertArisDraftSafe(seed);
  return seed;
}

export function buildArisAirshipMvpCandidatePages(input: {
  siteVersionId: string;
  pageId?: string | null;
  actor: string;
  createdAt: string;
}): CanonicalSiteVersionSnapshot["pages"] {
  const page: CanonicalSiteVersionSnapshot["pages"][number] = {
    id: "airship-aris-mvp-home-source-evidence-page-version",
    siteVersionId: input.siteVersionId,
    pageId: input.pageId ?? "airship-aris-mvp-home",
    path: "/",
    title: "ARIS - Apple in Canton ponudba",
    structureModel: {
      sections: [{ id: "aris-airship-mvp", type: "legacy.html", order: 0 }],
    },
    contentModel: {
      sectionProps: {
        "aris-airship-mvp": {
          htmlSummary: {
            extractedText: [
              ARIS_HEADLINE,
              ARIS_SUBHEADING,
              ARIS_PRODUCT_OFFER,
              ARIS_BRAND_PROOF,
              ARIS_CONTACT,
            ].join(" "),
            extractedLinks: [
              { href: "https://www.aris.si/", label: "ARIS" },
              { href: "mailto:prodaja@aris.si", label: "prodaja@aris.si" },
              { href: "tel:+38640397527", label: "040 397 527" },
            ],
            labels: {
              overview: "ARIS",
              about: "Blagovne znamke",
              services: "Ponudba",
              contact: "Kontakt",
            },
          },
          airshipSourceEvidenceLabel: "simplified ARIS MVP draft generated from source evidence",
        },
      },
    },
    styleTokens: {
      "color.background": "#ffffff",
      "color.text": "#111827",
      "color.primary": "#111827",
      "brand.primary": "#111827",
    },
    assetGraph: [],
    semanticSignals: [
      { label: "airship.aris.mvp_draft.source_evidence", confidence: 1, source: "manual" },
      { label: "airship.draft_candidate.internal_preview_only", confidence: 1, source: "manual" },
    ],
    migrationGovernance: null,
    source: "manual",
    actor: input.actor,
    createdAt: input.createdAt,
  };
  assertArisDraftSafe(page);
  return [page];
}

export function maybeBuildArisAirshipMvpEvidenceSourceVersion(input: {
  draftMigrationId: string;
  sourceVersion: CanonicalSiteVersionSnapshot;
  actor: string;
}): CanonicalSiteVersionSnapshot {
  if (!isArisAirshipMvpMigration(input.draftMigrationId)) return input.sourceVersion;
  return {
    ...input.sourceVersion,
    pages: buildArisAirshipMvpCandidatePages({
      siteVersionId: input.sourceVersion.id,
      pageId: input.sourceVersion.pages.find((page) => page.path === "/")?.pageId ?? input.sourceVersion.pages[0]?.pageId ?? null,
      actor: input.actor,
      createdAt: input.sourceVersion.createdAt,
    }),
  };
}

export function arisAirshipMvpDraftFieldsForReadback() {
  return buildArisAirshipMvpDraftEdits().map((edit) => ({
    id: edit.id,
    fieldKey: edit.fieldKey ?? null,
    targetSectionPage: edit.targetSectionPage,
    status: edit.status,
  }));
}
