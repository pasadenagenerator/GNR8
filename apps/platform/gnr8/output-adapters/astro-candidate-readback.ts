import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join, resolve } from "node:path";

import { parse } from "parse5";

import { buildDeterministicArtifactBundle } from "../runtime/artifact-builder";
import {
  renderSiteVersionPreview,
  setUnifiedRenderPreviewDependenciesForTest,
} from "../runtime/unified-render-preview";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "../runtime/types";
import type { NormalizedStaticBusinessSiteContent } from "./astro-static-site-adapter";
import {
  inspectAstroStaticExport,
  runAstroBuildExportProof,
  type AstroBuildExportProofEvidence,
  type AstroStaticExportVerification,
} from "./astro-static-site-build-export-proof";
import {
  convertAstroExportToInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";
import {
  prepareAstroStaticSiteWorkspace,
  type PreparedAstroStaticSiteWorkspace,
} from "./astro-static-site-workspace-preparation";

export const ASTRO_CANDIDATE_READBACK_VERSION = "gnr8-astro-candidate-readback:v1" as const;
export const ASTRO_CANDIDATE_READBACK_OUTPUT_DIRECTORY =
  "docs/product/gnr8-platform-mvp-07-chs-aris-astro-candidate-readback-evidence" as const;
export const ASTRO_CANDIDATE_READBACK_HOST = "127.0.0.1" as const;

export type CandidateReadbackFixtureId = "chs-like" | "aris-like";
export type CandidateReadbackVariant = "astro" | "fallback";
export type DifferenceClassification = "expected_adapter_variation" | "unsupported_capability" | "defect";

export type CandidateReadbackFixture = {
  id: CandidateReadbackFixtureId;
  description: string;
  siteId: string;
  siteVersionId: string;
  candidateId: string;
  fallbackArtifactId: string;
  content: NormalizedStaticBusinessSiteContent;
  expected: {
    title: string;
    visibleText: string[];
    hrefs: string[];
    sectionOrderText: string[];
    themeValues: string[];
  };
  inputModelGaps: Array<{
    field: string;
    astro: string;
    fallback: string;
    classification: "unsupported_capability" | "expected_adapter_variation";
  }>;
};

export type PreviewComparisonSnapshot = {
  variant: CandidateReadbackVariant;
  adapterId: "astro-static-site" | "html-static-artifact";
  source: string;
  fallbackUsed: boolean;
  path: string;
  html: string;
  ownership: { siteId: string; siteVersionId: string };
  provenance: Record<string, string | number | boolean | null>;
  contentHash: string;
};

export type PreviewHtmlAnalysis = {
  title: string;
  visibleText: string;
  hrefs: string[];
  fragmentHrefs: string[];
  ids: string[];
  brokenFragmentHrefs: string[];
  sectionOrderIndexes: Array<{ text: string; index: number }>;
};

export type PreviewComparisonResult = {
  fixtureId: CandidateReadbackFixtureId;
  variant: CandidateReadbackVariant;
  adapterId: string;
  source: string;
  fallbackUsed: boolean;
  content: {
    expectedCount: number;
    presentCount: number;
    missing: string[];
    titleMatches: boolean;
  };
  links: {
    expectedCount: number;
    presentCount: number;
    missing: string[];
    brokenFragmentHrefs: string[];
  };
  sectionOrder: {
    matches: boolean;
    indexes: Array<{ text: string; index: number }>;
  };
  theme: {
    expectedCount: number;
    presentCount: number;
    missing: string[];
  };
  ownership: {
    matches: boolean;
    expected: { siteId: string; siteVersionId: string };
    actual: { siteId: string; siteVersionId: string };
  };
  provenance: Record<string, string | number | boolean | null>;
  contentHash: string;
  differences: Array<{
    classification: DifferenceClassification;
    code: string;
    detail: string;
  }>;
};

export type CandidateReadbackFixtureEvidence = {
  fixtureId: CandidateReadbackFixtureId;
  description: string;
  expectedContentSha256: string;
  sharedExpected: CandidateReadbackFixture["expected"];
  mappings: {
    astro: string;
    fallback: string;
    gaps: CandidateReadbackFixture["inputModelGaps"];
  };
  buildExport: AstroBuildExportProofEvidence;
  candidate: {
    id: string;
    siteId: string;
    siteVersionId: string;
    sourceSnapshotSha256: string;
    exportSha256: string;
    convertedArtifactSha256: string;
    durableRegistration: false;
  };
  fallbackArtifact: {
    id: string;
    siteId: string;
    siteVersionId: string;
    bundleSha256: string;
    durableRegistration: false;
    governanceEvidenceConstructed: false;
  };
  comparisons: {
    astro: PreviewComparisonResult;
    fallback: PreviewComparisonResult;
    crossVariant: Array<{
      classification: DifferenceClassification;
      code: string;
      detail: string;
    }>;
  };
  previewFiles: { astro: string; fallback: string };
  cleanup: {
    astroWorkspaceRemoved: boolean;
    astroDistServerStopped: boolean;
    databaseReads: 0;
  };
};

export type BrowserReadbackEvidence = {
  version: "gnr8-astro-candidate-readback-browser:v1";
  capturedAt: string;
  serverStopped: boolean;
  captures: Array<{
    fixtureId: CandidateReadbackFixtureId;
    variant: CandidateReadbackVariant;
    viewport: { name: "desktop" | "mobile"; width: number; height: number };
    screenshot: string;
    contactScreenshot?: string;
    missingExpectedText: string[];
    horizontalOverflow: boolean;
    clippedElements: string[];
    overlappingText: string[];
    lowContrastText: string[];
    anchors: Array<{ href: string; targetFound: boolean; navigationVerified: boolean }>;
    consoleErrors: string[];
  }>;
};

export type AstroCandidateReadbackEvidence = {
  version: typeof ASTRO_CANDIDATE_READBACK_VERSION;
  proofOnly: true;
  generatedAt: string;
  outputDirectory: string;
  constraints: {
    syntheticDataOnly: true;
    externalAssets: false;
    durableRegistration: false;
    databaseReads: 0;
    providerOrDnsOperations: 0;
    productionMutation: false;
  };
  fixtures: CandidateReadbackFixtureEvidence[];
  browser: BrowserReadbackEvidence | null;
  readiness: {
    status: "needs_fixes" | "ready_for_further_internal_evaluation" | "blocked";
    reasons: string[];
  };
};

type ParseNode = {
  nodeName?: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: ParseNode[];
};

export function candidateReadbackFixtures(): CandidateReadbackFixture[] {
  return [
    createFixture({
      id: "chs-like",
      description: "Synthetic service-business fixture shaped like a regional managed-IT company.",
      siteId: "site-mvp07-chs-like",
      siteVersionId: "sv-mvp07-chs-like",
      candidateId: "candidate-mvp07-chs-like-astro",
      fallbackArtifactId: "artifact-mvp07-chs-like-fallback",
      content: {
        siteName: "Cobalt Harbor Systems — Managed IT",
        brandName: "Cobalt Harbor Systems",
        navItems: [
          { label: "Services", href: "#services" },
          { label: "Approach", href: "#approach" },
          { label: "Contact", href: "#contact" },
        ],
        hero: {
          headline: "Secure infrastructure for teams that keep moving",
          body: "Practical cloud, network, and security operations for growing organizations.",
          ctaLabel: "Plan an assessment",
          ctaHref: "#contact",
        },
        sections: [
          {
            id: "services",
            eyebrow: "Capabilities",
            title: "Practical IT services",
            body: "Focused support from daily operations through modernization.",
            cards: [
              { title: "Managed infrastructure", body: "Reliable cloud, endpoint, and network care." },
              { title: "Security operations", body: "Clear controls, monitoring, and response planning." },
            ],
          },
          {
            id: "approach",
            eyebrow: "How we work",
            title: "From assessment to steady operations",
            body: "A small senior team maps priorities, delivers in stages, and documents the result.",
            cards: [
              { title: "Discover", body: "Review constraints, risks, and the current operating model." },
              { title: "Operate", body: "Measure service quality and improve the system over time." },
            ],
          },
        ],
        contact: {
          heading: "Plan your next upgrade",
          body: "Tell us what needs to become safer or easier to operate.",
          email: "hello@cobalt-harbor.example",
          phone: "+386 1 555 0107",
          address: "Harbor Road 7, 1000 Ljubljana",
        },
        footer: { text: "Cobalt Harbor Systems · Synthetic MVP 07 proof" },
        theme: {
          accentHex: "#0b6e6b",
          backgroundHex: "#f2fbfa",
          textHex: "#102a2a",
          mutedHex: "#52706f",
          surfaceHex: "#ffffff",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          tone: "technical",
        },
      },
    }),
    createFixture({
      id: "aris-like",
      description: "Synthetic supply-business fixture shaped like a specialist technology and audio retailer.",
      siteId: "site-mvp07-aris-like",
      siteVersionId: "sv-mvp07-aris-like",
      candidateId: "candidate-mvp07-aris-like-astro",
      fallbackArtifactId: "artifact-mvp07-aris-like-fallback",
      content: {
        siteName: "Aurora Ridge Supply — Technology & Sound",
        brandName: "Aurora Ridge Supply",
        navItems: [
          { label: "Products", href: "#products" },
          { label: "Advice", href: "#advice" },
          { label: "Contact", href: "#contact" },
        ],
        hero: {
          headline: "Technology and sound, selected with care",
          body: "Specialist computers, studio systems, and home audio with practical advice before and after purchase.",
          ctaLabel: "Ask for a recommendation",
          ctaHref: "#contact",
        },
        sections: [
          {
            id: "products",
            eyebrow: "Selected ranges",
            title: "Tools for work and listening",
            body: "A focused assortment for creative desks, studios, and considered home setups.",
            cards: [
              { title: "Creative computing", body: "Quiet, capable systems for design and production." },
              { title: "Reference audio", body: "Speakers and components chosen for clarity and longevity." },
            ],
          },
          {
            id: "advice",
            eyebrow: "Personal guidance",
            title: "Advice that fits the room and the workflow",
            body: "Compare options, test the important details, and leave with a system that works together.",
            cards: [
              { title: "Listen and compare", body: "Evaluate sound and ergonomics before deciding." },
              { title: "Configure and support", body: "Get a coherent setup plus help after delivery." },
            ],
          },
        ],
        contact: {
          heading: "Find the right setup",
          body: "Share the space, budget, and work you want the system to do.",
          email: "advice@aurora-ridge.example",
          phone: "+386 1 555 0142",
          address: "Ridge Avenue 14, 1000 Ljubljana",
        },
        footer: { text: "Aurora Ridge Supply · Synthetic MVP 07 proof" },
        theme: {
          accentHex: "#b45309",
          backgroundHex: "#fffaf2",
          textHex: "#2d2118",
          mutedHex: "#786454",
          surfaceHex: "#ffffff",
          fontFamily: "Georgia, ui-serif, serif",
          tone: "premium",
        },
      },
    }),
  ];
}

function createFixture(input: Omit<CandidateReadbackFixture, "expected" | "inputModelGaps">): CandidateReadbackFixture {
  const { content } = input;
  const visibleText = [
    content.brandName,
    content.hero.headline,
    content.hero.body,
    content.hero.ctaLabel,
    ...content.navItems.map((item) => item.label),
    ...content.sections.flatMap((section) => [
      ...(section.eyebrow ? [section.eyebrow] : []),
      section.title,
      ...(section.body ? [section.body] : []),
      ...(section.cards ?? []).flatMap((card) => [card.title, card.body]),
    ]),
    content.contact.heading,
    content.contact.body,
    ...(content.contact.email ? [content.contact.email] : []),
    ...(content.contact.phone ? [content.contact.phone] : []),
    ...(content.contact.address ? [content.contact.address] : []),
    content.footer.text,
  ];
  const sectionOrderText = [
    content.hero.headline,
    ...content.sections.map((section) => section.title),
    content.contact.heading,
    content.footer.text,
  ];
  const hrefs = [
    "/",
    ...content.navItems.map((item) => item.href),
    content.hero.ctaHref,
    ...(content.contact.email ? [`mailto:${content.contact.email}`] : []),
    ...(content.contact.phone ? [`tel:${content.contact.phone}`] : []),
  ];
  const themeValues = [
    content.theme.accentHex,
    content.theme.backgroundHex,
    content.theme.textHex,
    content.theme.mutedHex,
    content.theme.surfaceHex,
    content.theme.fontFamily,
  ].filter((value): value is string => Boolean(value));
  return {
    ...input,
    expected: {
      title: content.siteName,
      visibleText: unique(visibleText),
      hrefs: unique(hrefs),
      sectionOrderText,
      themeValues,
    },
    inputModelGaps: [
      {
        field: "theme.tone",
        astro: "Accepted by the normalized model but not emitted by the current Astro adapter.",
        fallback: "No dedicated canonical style-token or renderer behavior exists.",
        classification: "unsupported_capability",
      },
      {
        field: "brand/header semantics",
        astro: "Rendered as a linked site-header brand.",
        fallback: "Represented as navbar title/content rather than a dedicated brand primitive.",
        classification: "expected_adapter_variation",
      },
      {
        field: "card layout semantics",
        astro: "Rendered as article cards in a responsive grid.",
        fallback: "Current content fallback flattens card fields into text paragraphs.",
        classification: "unsupported_capability",
      },
      {
        field: "theme application",
        astro: "Theme signals drive the page stylesheet.",
        fallback: "Theme values are retained as compiled CSS custom properties but the fallback shell uses fixed inline colors.",
        classification: "unsupported_capability",
      },
    ],
  };
}

export function analyzePreviewHtml(html: string, sectionOrderText: string[] = []): PreviewHtmlAnalysis {
  const document = parse(html) as unknown as ParseNode;
  let title = "";
  const bodyText: string[] = [];
  const hrefs: string[] = [];
  const ids = new Set<string>();

  function visit(node: ParseNode, excluded = false): void {
    const tag = String(node.tagName ?? node.nodeName ?? "").toLowerCase();
    const isExcluded = excluded || ["head", "script", "style", "template", "noscript", "svg"].includes(tag);
    if (tag === "title") title = collectNodeText(node).replace(/\s+/g, " ").trim();
    for (const attr of node.attrs ?? []) {
      if (attr.name === "href") hrefs.push(attr.value);
      if (attr.name === "id" && attr.value) ids.add(attr.value);
    }
    if (node.nodeName === "#text" && !isExcluded && node.value) bodyText.push(node.value);
    for (const child of node.childNodes ?? []) visit(child, isExcluded);
  }
  visit(document);
  const visibleText = bodyText.join(" ").replace(/\s+/g, " ").trim();
  const fragmentHrefs = unique(hrefs.filter((href) => /^#[^#]/.test(href)));
  return {
    title,
    visibleText,
    hrefs: unique(hrefs),
    fragmentHrefs,
    ids: [...ids].sort(),
    brokenFragmentHrefs: fragmentHrefs.filter((href) => !ids.has(href.slice(1))),
    sectionOrderIndexes: sectionOrderText.map((text) => ({ text, index: visibleText.indexOf(text) })),
  };
}

export function comparePreviewSnapshot(
  fixture: CandidateReadbackFixture,
  snapshot: PreviewComparisonSnapshot,
): PreviewComparisonResult {
  const analysis = analyzePreviewHtml(snapshot.html, fixture.expected.sectionOrderText);
  const missingContent = fixture.expected.visibleText.filter((value) => !analysis.visibleText.includes(value));
  const missingHrefs = fixture.expected.hrefs.filter((value) => !analysis.hrefs.includes(value));
  const missingTheme = fixture.expected.themeValues.filter((value) => !snapshot.html.includes(value));
  const orderIndexes = analysis.sectionOrderIndexes;
  const orderMatches = orderIndexes.every((entry) => entry.index >= 0) && orderIndexes.every((entry, index) => {
    return index === 0 || entry.index > orderIndexes[index - 1]!.index;
  });
  const ownershipMatches = snapshot.ownership.siteId === fixture.siteId && snapshot.ownership.siteVersionId === fixture.siteVersionId;
  const differences: PreviewComparisonResult["differences"] = [];
  if (missingContent.length > 0 || analysis.title !== fixture.expected.title) {
    differences.push({
      classification: "defect",
      code: "content_missing",
      detail: `Missing ${missingContent.length} visible values; title match=${analysis.title === fixture.expected.title}.`,
    });
  }
  if (missingHrefs.length > 0) {
    differences.push({
      classification: "defect",
      code: "link_missing",
      detail: `Missing expected hrefs: ${missingHrefs.join(", ")}.`,
    });
  }
  if (analysis.brokenFragmentHrefs.length > 0) {
    differences.push({
      classification: "defect",
      code: "broken_anchor",
      detail: `Fragment targets are absent: ${analysis.brokenFragmentHrefs.join(", ")}.`,
    });
  }
  if (!orderMatches) {
    differences.push({
      classification: "defect",
      code: "section_order_mismatch",
      detail: "Expected section text did not appear in the shared order.",
    });
  }
  if (missingTheme.length > 0) {
    differences.push({
      classification: "unsupported_capability",
      code: "theme_signal_missing",
      detail: `Theme values not represented: ${missingTheme.join(", ")}.`,
    });
  }
  if (!ownershipMatches) {
    differences.push({
      classification: "defect",
      code: "ownership_mismatch",
      detail: `Expected ${fixture.siteId}/${fixture.siteVersionId}; received ${snapshot.ownership.siteId}/${snapshot.ownership.siteVersionId}.`,
    });
  }
  return {
    fixtureId: fixture.id,
    variant: snapshot.variant,
    adapterId: snapshot.adapterId,
    source: snapshot.source,
    fallbackUsed: snapshot.fallbackUsed,
    content: {
      expectedCount: fixture.expected.visibleText.length,
      presentCount: fixture.expected.visibleText.length - missingContent.length,
      missing: missingContent,
      titleMatches: analysis.title === fixture.expected.title,
    },
    links: {
      expectedCount: fixture.expected.hrefs.length,
      presentCount: fixture.expected.hrefs.length - missingHrefs.length,
      missing: missingHrefs,
      brokenFragmentHrefs: analysis.brokenFragmentHrefs,
    },
    sectionOrder: { matches: orderMatches, indexes: orderIndexes },
    theme: {
      expectedCount: fixture.expected.themeValues.length,
      presentCount: fixture.expected.themeValues.length - missingTheme.length,
      missing: missingTheme,
    },
    ownership: {
      matches: ownershipMatches,
      expected: { siteId: fixture.siteId, siteVersionId: fixture.siteVersionId },
      actual: snapshot.ownership,
    },
    provenance: snapshot.provenance,
    contentHash: snapshot.contentHash,
    differences,
  };
}

export async function runAstroCandidateReadback(input: {
  outputDirectory?: string;
  workspaceRoot?: string;
  signal?: AbortSignal;
} = {}): Promise<AstroCandidateReadbackEvidence> {
  const outputDirectory = resolve(input.outputDirectory ?? ASTRO_CANDIDATE_READBACK_OUTPUT_DIRECTORY);
  await mkdir(join(outputDirectory, "previews"), { recursive: true });
  await mkdir(join(outputDirectory, "screenshots"), { recursive: true });
  const fixtures: CandidateReadbackFixtureEvidence[] = [];
  for (const fixture of candidateReadbackFixtures()) {
    fixtures.push(await runFixture({ fixture, outputDirectory, workspaceRoot: input.workspaceRoot, signal: input.signal }));
  }
  const evidence: AstroCandidateReadbackEvidence = {
    version: ASTRO_CANDIDATE_READBACK_VERSION,
    proofOnly: true,
    generatedAt: new Date().toISOString(),
    outputDirectory,
    constraints: {
      syntheticDataOnly: true,
      externalAssets: false,
      durableRegistration: false,
      databaseReads: 0,
      providerOrDnsOperations: 0,
      productionMutation: false,
    },
    fixtures,
    browser: null,
    readiness: readinessFrom(fixtures, null),
  };
  await writeEvidence(outputDirectory, evidence);
  return evidence;
}

async function runFixture(input: {
  fixture: CandidateReadbackFixture;
  outputDirectory: string;
  workspaceRoot?: string;
  signal?: AbortSignal;
}): Promise<CandidateReadbackFixtureEvidence> {
  const { fixture } = input;
  let prepared: PreparedAstroStaticSiteWorkspace | null = null;
  let candidate: AstroInternalPreviewCandidate | null = null;
  const verification: AstroStaticExportVerification = {
    expectedContent: [`<title>${escapeHtml(fixture.content.siteName)}</title>`, ...fixture.expected.visibleText],
    expectedThemeToken: `--gnr8-astro-accent: ${fixture.content.theme.accentHex};`,
  };
  const buildExport = await runAstroBuildExportProof({
    workspaceRoot: input.workspaceRoot,
    content: fixture.content,
    verification,
    signal: input.signal,
    dependencies: {
      prepareWorkspace: async (prepareInput) => {
        prepared = await prepareAstroStaticSiteWorkspace(prepareInput);
        return prepared;
      },
      inspectExport: async (workspacePath, inspectVerification) => {
        const inspected = await inspectAstroStaticExport(workspacePath, inspectVerification ?? verification);
        if (!prepared) throw new Error("mvp07_prepared_workspace_missing");
        candidate = await convertAstroExportToInternalPreviewCandidate({
          inspectedExport: inspected,
          candidateId: fixture.candidateId,
          siteId: fixture.siteId,
          siteVersionId: fixture.siteVersionId,
          rendererCompatibilityVersion: "gnr8-renderer-v1",
          sourceSnapshotSha256: prepared.sourceSnapshot.aggregateSha256,
        });
        return inspected;
      },
    },
  });
  const completedCandidate = candidate as AstroInternalPreviewCandidate | null;
  if (!completedCandidate) throw new Error(`mvp07_candidate_missing:${fixture.id}`);

  const astroPreview = await renderAstroPreview(fixture, completedCandidate);
  const fallbackSiteVersion = fallbackSiteVersionFor(fixture);
  const fallbackBundle = buildDeterministicArtifactBundle({ siteVersion: fallbackSiteVersion, renderMode: "PREVIEW" });
  const fallbackArtifact = {
    ...fallbackBundle,
    id: fixture.fallbackArtifactId,
    createdAt: "2026-09-27T00:00:00.000Z",
  } as unknown as RuntimeArtifact;
  const fallbackPreview = await renderFallbackPreview(fixture, fallbackArtifact);

  const astroFile = `previews/${fixture.id}-astro.html`;
  const fallbackFile = `previews/${fixture.id}-fallback.html`;
  await Promise.all([
    writeFile(join(input.outputDirectory, astroFile), astroPreview.html, "utf8"),
    writeFile(join(input.outputDirectory, fallbackFile), fallbackPreview.html, "utf8"),
  ]);

  const astroSnapshot: PreviewComparisonSnapshot = {
    variant: "astro",
    adapterId: "astro-static-site",
    source: astroPreview.source,
    fallbackUsed: astroPreview.fallbackUsed,
    path: astroPreview.path,
    html: astroPreview.html,
    ownership: { siteId: completedCandidate.siteId, siteVersionId: completedCandidate.siteVersionId },
    provenance: {
      sourceSnapshotSha256: completedCandidate.manifest.provenance.sourceSnapshotSha256,
      exportSha256: completedCandidate.manifest.provenance.exportSha256,
      conversionVersion: completedCandidate.manifest.conversionVersion,
      storage: completedCandidate.manifest.lifecycle.storage,
      durableRegistration: completedCandidate.manifest.lifecycle.durableRegistration,
    },
    contentHash: completedCandidate.contentSha256,
  };
  const fallbackSnapshot: PreviewComparisonSnapshot = {
    variant: "fallback",
    adapterId: "html-static-artifact",
    source: fallbackPreview.source,
    fallbackUsed: fallbackPreview.fallbackUsed,
    path: fallbackPreview.path,
    html: fallbackPreview.html,
    ownership: { siteId: fallbackBundle.siteId, siteVersionId: fallbackBundle.siteVersionId },
    provenance: {
      builder: "buildDeterministicArtifactBundle",
      renderMode: "PREVIEW",
      durableRegistration: false,
      governanceEvidenceConstructed: false,
    },
    contentHash: fallbackBundle.bundleSha256,
  };

  return {
    fixtureId: fixture.id,
    description: fixture.description,
    expectedContentSha256: sha256(JSON.stringify(fixture.content)),
    sharedExpected: fixture.expected,
    mappings: {
      astro: "NormalizedStaticBusinessSiteContent -> createAstroStaticSiteProjectManifest -> real Astro build/export -> MVP 06 bridge candidate.",
      fallback: "NormalizedStaticBusinessSiteContent -> explicit CanonicalSiteVersionSnapshot mapping -> buildDeterministicArtifactBundle -> ordinary transformed-artifact preview selection.",
      gaps: fixture.inputModelGaps,
    },
    buildExport,
    candidate: {
      id: completedCandidate.id,
      siteId: completedCandidate.siteId,
      siteVersionId: completedCandidate.siteVersionId,
      sourceSnapshotSha256: completedCandidate.manifest.provenance.sourceSnapshotSha256,
      exportSha256: completedCandidate.manifest.provenance.exportSha256,
      convertedArtifactSha256: completedCandidate.contentSha256,
      durableRegistration: false,
    },
    fallbackArtifact: {
      id: fixture.fallbackArtifactId,
      siteId: fallbackBundle.siteId,
      siteVersionId: fallbackBundle.siteVersionId,
      bundleSha256: fallbackBundle.bundleSha256,
      durableRegistration: false,
      governanceEvidenceConstructed: false,
    },
    comparisons: {
      astro: comparePreviewSnapshot(fixture, astroSnapshot),
      fallback: comparePreviewSnapshot(fixture, fallbackSnapshot),
      crossVariant: [
        {
          classification: "expected_adapter_variation",
          code: "content_hash_differs",
          detail: `Astro ${completedCandidate.contentSha256}; fallback ${fallbackBundle.bundleSha256}.`,
        },
        ...fixture.inputModelGaps.map((gap) => ({
          classification: gap.classification,
          code: `input_model_gap:${gap.field}`,
          detail: `${gap.astro} ${gap.fallback}`,
        })),
      ],
    },
    previewFiles: { astro: astroFile, fallback: fallbackFile },
    cleanup: {
      astroWorkspaceRemoved: buildExport.workspace.removed,
      astroDistServerStopped: buildExport.server.stopped,
      databaseReads: 0,
    },
  };
}

async function renderAstroPreview(fixture: CandidateReadbackFixture, candidate: AstroInternalPreviewCandidate) {
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    requestScopedDbClientEnabled: false,
    getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    getAstroInternalPreviewCandidate: async (candidateId) => candidateId === candidate.id ? candidate : null,
    getSiteVersion: async () => { throw new Error("mvp07_astro_database_read_forbidden"); },
    getSiteVersionArtifactBinding: async () => { throw new Error("mvp07_astro_binding_read_forbidden"); },
    getArtifactById: async () => { throw new Error("mvp07_astro_artifact_read_forbidden"); },
  });
  try {
    return await renderSiteVersionPreview({
      siteVersionId: fixture.siteVersionId,
      path: "/",
      mode: "transformed",
      astroCandidateSelection: { candidateId: fixture.candidateId, siteId: fixture.siteId },
      requestCorrelationKey: `req-mvp07-${fixture.id}-astro`,
    });
  } finally {
    restore();
  }
}

async function renderFallbackPreview(fixture: CandidateReadbackFixture, artifact: RuntimeArtifact) {
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    requestScopedDbClientEnabled: false,
    getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    getSiteVersionArtifactBinding: async (siteVersionId) =>
      siteVersionId === fixture.siteVersionId ? { siteId: fixture.siteId, artifactId: fixture.fallbackArtifactId } : null,
    getArtifactById: async (artifactId) => artifactId === fixture.fallbackArtifactId ? artifact : null,
    getSiteVersion: async () => { throw new Error("mvp07_fallback_site_version_database_read_forbidden"); },
  });
  try {
    return await renderSiteVersionPreview({
      siteVersionId: fixture.siteVersionId,
      path: "/",
      mode: "transformed",
      requestCorrelationKey: `req-mvp07-${fixture.id}-fallback`,
    });
  } finally {
    restore();
  }
}

function fallbackSiteVersionFor(fixture: CandidateReadbackFixture): CanonicalSiteVersionSnapshot {
  const content = fixture.content;
  const sections = [
    { id: "nav", type: "navbar.basic", order: 0 },
    { id: "hero", type: "hero.basic", order: 1 },
    ...content.sections.map((section, index) => ({ id: section.id, type: "content.basic", order: index + 2 })),
    { id: "contact", type: "cta.basic", order: content.sections.length + 2 },
    { id: "footer", type: "footer.basic", order: content.sections.length + 3 },
  ];
  const sectionProps: Record<string, Record<string, unknown>> = {
    nav: {
      title: `${content.brandName} navigation`,
      links: [{ href: "/", label: content.brandName }, ...content.navItems],
    },
    hero: {
      headline: content.hero.headline,
      body: content.hero.body,
      links: [{ href: content.hero.ctaHref, label: content.hero.ctaLabel }],
    },
    contact: {
      title: content.contact.heading,
      body: content.contact.body,
      description: content.contact.address,
      links: [
        ...(content.contact.email ? [{ href: `mailto:${content.contact.email}`, label: content.contact.email }] : []),
        ...(content.contact.phone ? [{ href: `tel:${content.contact.phone}`, label: content.contact.phone }] : []),
      ],
    },
    footer: { title: content.brandName, text: content.footer.text },
  };
  for (const section of content.sections) {
    sectionProps[section.id] = {
      eyebrow: section.eyebrow,
      heading: section.title,
      body: section.body,
      cards: section.cards,
    };
  }
  const theme = content.theme;
  const styleTokens = {
    "color.accent": theme.accentHex ?? "",
    "color.background": theme.backgroundHex ?? "",
    "color.text": theme.textHex ?? "",
    "color.muted": theme.mutedHex ?? "",
    "color.surface": theme.surfaceHex ?? "",
    "font.family": theme.fontFamily ?? "",
  };
  return {
    id: fixture.siteVersionId,
    siteId: fixture.siteId,
    versionNo: 1,
    state: "READY_FOR_REVIEW",
    source: "migration",
    actor: "mvp07-synthetic-proof",
    createdAt: "2026-09-27T00:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: null,
    importProvenanceSummary: null,
    pages: [{
      id: `pv-${fixture.id}`,
      siteVersionId: fixture.siteVersionId,
      pageId: `page-${fixture.id}`,
      path: "/",
      title: content.siteName,
      structureModel: { sections },
      contentModel: { sectionProps },
      styleTokens,
      assetGraph: [],
      semanticSignals: [{ label: `mvp07.${fixture.id}`, confidence: 1, source: "migration" }],
      source: "migration",
      actor: "mvp07-synthetic-proof",
      createdAt: "2026-09-27T00:00:00.000Z",
    }],
  };
}

export async function finalizeAstroCandidateReadback(outputDirectory: string): Promise<AstroCandidateReadbackEvidence> {
  const resolved = resolve(outputDirectory);
  const evidence = JSON.parse(await readFile(join(resolved, "evidence.json"), "utf8")) as AstroCandidateReadbackEvidence;
  const browser = JSON.parse(await readFile(join(resolved, "browser-evidence.json"), "utf8")) as BrowserReadbackEvidence;
  evidence.browser = browser;
  evidence.readiness = readinessFrom(evidence.fixtures, browser);
  await writeEvidence(resolved, evidence);
  return evidence;
}

async function writeEvidence(outputDirectory: string, evidence: AstroCandidateReadbackEvidence): Promise<void> {
  await writeFile(join(outputDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(join(outputDirectory, "comparison-report.md"), renderComparisonReport(evidence), "utf8");
}

function readinessFrom(
  fixtures: CandidateReadbackFixtureEvidence[],
  browser: BrowserReadbackEvidence | null,
): AstroCandidateReadbackEvidence["readiness"] {
  const defects = fixtures.flatMap((fixture) => [
    ...fixture.comparisons.astro.differences,
    ...fixture.comparisons.fallback.differences,
  ]).filter((difference) => difference.classification === "defect");
  const browserDefects = browser?.captures.some((capture) =>
    capture.missingExpectedText.length > 0 || capture.horizontalOverflow || capture.clippedElements.length > 0 ||
    capture.overlappingText.length > 0 || capture.lowContrastText.length > 0 ||
    capture.anchors.some((anchor) => !anchor.targetFound || !anchor.navigationVerified) || capture.consoleErrors.length > 0,
  ) ?? false;
  if (!browser) {
    return { status: defects.length > 0 ? "needs_fixes" : "blocked", reasons: ["Browser evidence has not been attached yet."] };
  }
  if (defects.length > 0 || browserDefects) {
    const missingCount = browser?.captures.filter((capture) => capture.missingExpectedText.length > 0).length ?? 0;
    const missingTargetCount = browser?.captures.flatMap((capture) => capture.anchors.filter((anchor) => !anchor.targetFound)).length ?? 0;
    return {
      status: "needs_fixes",
      reasons: [
        `${defects.length} static comparison defect finding(s).`,
        ...(browserDefects ? [`Browser validation confirmed ${missingCount} capture(s) with missing expected content and ${missingTargetCount} missing fragment target(s).`] : []),
      ],
    };
  }
  return {
    status: "ready_for_further_internal_evaluation",
    reasons: ["Both synthetic fixtures passed static comparison and browser validation without defect findings."],
  };
}

function renderComparisonReport(evidence: AstroCandidateReadbackEvidence): string {
  const rows = evidence.fixtures.flatMap((fixture) => [fixture.comparisons.astro, fixture.comparisons.fallback]).map((comparison) => {
    const visual = evidence.browser
      ? `${evidence.browser.captures.filter((capture) => capture.fixtureId === comparison.fixtureId && capture.variant === comparison.variant).length}/2 captured`
      : "pending";
    return `| ${comparison.fixtureId} | ${comparison.variant} | ${comparison.source} | ${comparison.fallbackUsed} | ${comparison.content.presentCount}/${comparison.content.expectedCount} | ${comparison.links.brokenFragmentHrefs.length} | ${comparison.sectionOrder.matches ? "pass" : "fail"} | ${comparison.theme.presentCount}/${comparison.theme.expectedCount} | ${comparison.ownership.matches ? "pass" : "fail"} | ${visual} |`;
  });
  const unsupported = unique(evidence.fixtures.flatMap((fixture) => fixture.mappings.gaps.map((gap) => `${gap.field}: ${gap.fallback}`)));
  return `# GNR8 Platform MVP 07 — CHS/ARIS Astro Candidate Readback Evidence

Status: \`${evidence.readiness.status}\`

Generated: ${evidence.generatedAt}

This proof uses synthetic businesses and in-memory ownership only. It performed no customer reads, database writes, durable candidate registration, production preview activation, provider/DNS/billing operation, or publish mutation.

## Comparison matrix

| Fixture | Variant | Preview source | Runtime fallback used | Content | Broken anchors | Order | Theme values | Ownership | Browser |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- |
${rows.join("\n")}

Note: \`fallbackUsed=false\` for the fallback rows means the intended \`html-static-artifact\` transformed artifact was selected directly; no secondary recovery fallback was invoked.

## Findings

${evidence.readiness.reasons.map((reason) => `- ${reason}`).join("\n")}

Unsupported or intentionally non-equivalent fields:

${unsupported.map((item) => `- ${item}`).join("\n")}

The Astro and fallback hashes are expected to differ because their adapter structures and styling differ. Pixel-identical output is not a requirement.

## Retained evidence

- Machine-readable evidence: \`evidence.json\`
- Browser evidence: \`browser-evidence.json\`${evidence.browser ? "" : " (pending)"}
- Rendered previews: \`previews/\`
- Desktop/mobile captures: \`screenshots/\`${evidence.browser ? "" : " (pending)"}

## Cleanup

${evidence.fixtures.map((fixture) => `- ${fixture.fixtureId}: workspace removed=${fixture.cleanup.astroWorkspaceRemoved}; build server stopped=${fixture.cleanup.astroDistServerStopped}; database reads=${fixture.cleanup.databaseReads}.`).join("\n")}
${evidence.browser ? `- Comparison server stopped=${evidence.browser.serverStopped}.` : "- Comparison server cleanup pending browser capture."}
`;
}

export async function startAstroCandidateReadbackServer(outputDirectory: string): Promise<{
  server: Server;
  url: string;
  close(): Promise<void>;
}> {
  const root = resolve(outputDirectory);
  const routes: Record<string, string> = {};
  for (const fixture of candidateReadbackFixtures()) {
    routes[`/${fixture.id}/astro`] = join(root, "previews", `${fixture.id}-astro.html`);
    routes[`/${fixture.id}/fallback`] = join(root, "previews", `${fixture.id}-fallback.html`);
  }
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://gnr8.invalid").pathname.replace(/\/$/, "") || "/";
    const file = routes[pathname];
    if ((request.method !== "GET" && request.method !== "HEAD") || !file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": contentType(file),
        "content-length": String(body.byteLength),
        "cache-control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen({ host: ASTRO_CANDIDATE_READBACK_HOST, port: 0, exclusive: true }, resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("mvp07_server_address_missing");
  return {
    server,
    url: `http://${ASTRO_CANDIDATE_READBACK_HOST}:${address.port}`,
    close: () => new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose())),
  };
}

function collectNodeText(node: ParseNode): string {
  return [node.nodeName === "#text" ? node.value ?? "" : "", ...(node.childNodes ?? []).map(collectNodeText)].join(" ");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function contentType(path: string): string {
  return extname(path) === ".html" ? "text/html; charset=utf-8" : "application/octet-stream";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
