import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateReadbackFixtures,
  comparePreviewSnapshot,
  type CandidateReadbackFixture,
  type PreviewComparisonSnapshot,
} from "./astro-candidate-readback";

test("candidate readback command remains inert when imported", async () => {
  const entrypoint = await import("./run-astro-candidate-readback");
  assert.equal(typeof entrypoint.main, "function");
});

test("comparison reports representative missing content", () => {
  const fixture = candidateReadbackFixtures()[0]!;
  const missingValue = "Reliable cloud, endpoint, and network care.";
  const snapshot = validSnapshot(fixture).replaceAll(missingValue, "");
  const comparison = comparePreviewSnapshot(fixture, previewSnapshot(fixture, snapshot));

  assert.ok(comparison.content.missing.includes(missingValue));
  assert.ok(comparison.differences.some((difference) => difference.code === "content_missing"));
});

test("comparison reports a representative broken fragment anchor", () => {
  const fixture = candidateReadbackFixtures()[0]!;
  const html = validSnapshot(fixture).replace('id="services"', 'data-removed-id="services"');
  const comparison = comparePreviewSnapshot(fixture, previewSnapshot(fixture, html));

  assert.ok(comparison.links.brokenFragmentHrefs.includes("#services"));
  assert.ok(comparison.differences.some((difference) => difference.code === "broken_anchor"));
});

test("comparison reports representative ownership mismatch", () => {
  const fixture = candidateReadbackFixtures()[1]!;
  const snapshot = previewSnapshot(fixture, validSnapshot(fixture));
  snapshot.ownership = { siteId: "site-wrong-owner", siteVersionId: fixture.siteVersionId };
  const comparison = comparePreviewSnapshot(fixture, snapshot);

  assert.equal(comparison.ownership.matches, false);
  assert.ok(comparison.differences.some((difference) => difference.code === "ownership_mismatch"));
});

function validSnapshot(fixture: CandidateReadbackFixture): string {
  const ids = fixture.expected.hrefs
    .filter((href) => href.startsWith("#"))
    .map((href) => `<span id="${href.slice(1)}"></span>`)
    .join("");
  const links = fixture.expected.hrefs.map((href) => `<a href="${href}">link</a>`).join("");
  const ordered = fixture.expected.sectionOrderText.join(" ");
  const remaining = fixture.expected.visibleText.filter((value) => !ordered.includes(value)).join(" ");
  const theme = fixture.expected.themeValues.join(" ");
  return `<!doctype html><html><head><title>${fixture.expected.title}</title><style>${theme}</style></head><body>${ids}${links}<main>${ordered} ${remaining}</main></body></html>`;
}

function previewSnapshot(fixture: CandidateReadbackFixture, html: string): PreviewComparisonSnapshot {
  return {
    variant: "astro",
    adapterId: "astro-static-site",
    source: "astro_internal_preview_candidate",
    fallbackUsed: false,
    path: "/",
    html,
    ownership: { siteId: fixture.siteId, siteVersionId: fixture.siteVersionId },
    provenance: { synthetic: true },
    contentHash: "a".repeat(64),
  };
}
