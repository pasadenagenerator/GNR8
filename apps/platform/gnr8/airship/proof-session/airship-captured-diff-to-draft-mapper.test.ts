import assert from "node:assert/strict";
import test from "node:test";

import { mapAirshipCapturedDiffToDraft } from "./airship-captured-diff-to-draft-mapper";

const BASE_HTML = [
  "<!doctype html><html><head><style>.hero{color:#111}</style></head><body>",
  '<main><section data-airship-section="hero">',
  '<h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>',
  '<p data-airship-element="hero-subheading">Advanced cybersecurity and infrastructure support.</p>',
  '<a href="#contact" data-airship-element="hero-cta">Contact Us</a>',
  "</section>",
  '<section data-airship-section="cta"><button data-airship-element="contact-cta">Send inquiry</button></section>',
  '<section data-airship-section="proof"><article data-airship-element="proof-card" data-airship-element-index="0"><h3>Assess</h3><p>Understand the current environment.</p></article></section>',
  '<section data-airship-section="misc"><p data-airship-element="unknown-copy">Legacy copy.</p></section>',
  "</main></body></html>",
].join("");

test("hero headline text change maps exactly to hero headline draft field", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("The CHS team helps your IT change with every technology wave.", "Airship real capture test"),
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changedElementMarker, "hero-headline");
  assert.equal(result.entries[0]?.sectionMarker, "hero");
  assert.equal(result.entries[0]?.previousText, "The CHS team helps your IT change with every technology wave.");
  assert.equal(result.entries[0]?.nextText, "Airship real capture test");
  assert.equal(result.entries[0]?.draftFieldKey, "headline");
  assert.equal(result.entries[0]?.confidence, "exact");
  assert.equal(result.entries[0]?.safeToApplyLater, true);
});

test("hero subheading and body markers map to subheading with exact or probable confidence", () => {
  const exact = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("Advanced cybersecurity and infrastructure support.", "Better support for complex IT change."),
  });
  assert.equal(exact.entries[0]?.changedElementMarker, "hero-subheading");
  assert.equal(exact.entries[0]?.draftFieldKey, "subheading");
  assert.equal(exact.entries[0]?.confidence, "exact");
  assert.equal(exact.entries[0]?.safeToApplyLater, true);

  const bodyHtml = BASE_HTML.replaceAll("hero-subheading", "hero-body");
  const probable = mapAirshipCapturedDiffToDraft({
    beforeHtml: bodyHtml,
    afterHtml: bodyHtml.replace("Advanced cybersecurity and infrastructure support.", "A body-style edit from Airship."),
  });
  assert.equal(probable.entries[0]?.changedElementMarker, "hero-body");
  assert.equal(probable.entries[0]?.draftFieldKey, "subheading");
  assert.equal(probable.entries[0]?.confidence, "probable");
  assert.equal(probable.entries[0]?.safeToApplyLater, false);
});

test("CTA label text change maps to CTA label draft field", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("Send inquiry", "Contact CHS sales"),
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changedElementMarker, "contact-cta");
  assert.equal(result.entries[0]?.sectionMarker, "cta");
  assert.equal(result.entries[0]?.draftFieldKey, "ctaLabel");
  assert.equal(result.entries[0]?.confidence, "exact");
  assert.equal(result.entries[0]?.safeToApplyLater, true);
});

test("multiple changed elements return multiple mapping entries", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML
      .replace("The CHS team helps your IT change with every technology wave.", "Airship headline")
      .replace("Send inquiry", "Start with CHS"),
  });

  assert.deepEqual(result.entries.map((entry) => entry.changedElementMarker).sort(), ["contact-cta", "hero-headline"]);
  assert.equal(result.safeEntryCount, 2);
  assert.equal(result.unsupportedEntryCount, 0);
});

test("card title/body mapping only applies with unambiguous known metadata", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("Assess", "Review"),
    knownDraftFieldMappings: [
      {
        elementMarker: "proof-card",
        elementIndex: "0",
        sectionMarker: "proof",
        draftFieldKey: "proofCard0Title",
        confidence: "exact",
      },
    ],
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changedElementMarker, "proof-card");
  assert.equal(result.entries[0]?.elementIndex, "0");
  assert.equal(result.entries[0]?.draftFieldKey, "proofCard0Title");
  assert.equal(result.entries[0]?.confidence, "exact");
  assert.equal(result.entries[0]?.safeToApplyLater, true);
});

test("changed unknown marker returns unsupported readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("Legacy copy.", "Unknown marker edit."),
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changedElementMarker, "unknown-copy");
  assert.equal(result.entries[0]?.confidence, "unsupported");
  assert.equal(result.entries[0]?.draftFieldKey, null);
  assert.equal(result.entries[0]?.safeToApplyLater, false);
  assert.match(result.entries[0]?.readback ?? "", /unknown/i);
});

test("removed data-airship-element marker returns unsupported readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace(' data-airship-element="hero-headline"', ""),
  });

  assert.equal(result.entries.some((entry) => entry.changeKind === "marker_removed" && entry.changedElementMarker === "hero-headline"), true);
  assert.equal(result.unsupportedEntryCount, result.entries.length);
});

test("style and class-only changes return unsupported readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace('data-airship-element="hero-headline"', 'class="large" data-airship-element="hero-headline"'),
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changeKind, "style_class");
  assert.equal(result.entries[0]?.confidence, "unsupported");
  assert.match(result.entries[0]?.readback ?? "", /Style changes/i);
});

test("structural section changes return unsupported readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("</main>", '<section data-airship-section="new-panel"><p>New section</p></section></main>'),
  });

  assert.equal(result.entries.some((entry) => entry.changeKind === "section_added" && entry.sectionMarker === "new-panel"), true);
  assert.equal(result.unsupportedEntryCount, result.entries.length);
});

test("structural marked-element changes return unsupported readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace(
      '<h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>',
      '<h1 data-airship-element="hero-headline"><span>The CHS team helps your IT change with every technology wave.</span></h1>',
    ),
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changeKind, "structure");
  assert.equal(result.entries[0]?.confidence, "unsupported");
});

test("CSS changes return unsupported readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace(".hero{color:#111}", ".hero{color:#222}"),
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.changeKind, "css");
  assert.equal(result.entries[0]?.confidence, "unsupported");
});

test("multiple changed text nodes inside one element are unsupported", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML.replace("<h3>Assess</h3><p>Understand the current environment.</p>", "<h3>Review</h3><p>Map the next environment.</p>"),
    knownDraftFieldMappings: [
      {
        elementMarker: "proof-card",
        elementIndex: "0",
        sectionMarker: "proof",
        draftFieldKey: "proofCard0",
      },
    ],
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.confidence, "unsupported");
  assert.match(result.entries[0]?.reason ?? "", /Expected one changed text node/);
});

test("no changes returns empty mapping with clean readback", () => {
  const result = mapAirshipCapturedDiffToDraft({
    beforeHtml: BASE_HTML,
    afterHtml: BASE_HTML,
  });

  assert.equal(result.hasChanges, false);
  assert.deepEqual(result.entries, []);
  assert.equal(result.safeEntryCount, 0);
  assert.equal(result.unsupportedEntryCount, 0);
  assert.match(result.readback, /No captured HTML changes/);
  assert.equal(result.safety.noDraftPersistence, true);
});
