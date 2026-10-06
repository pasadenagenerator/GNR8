import assert from "node:assert/strict";
import test from "node:test";

import { buildLayoutGraphFromSnapshotHtml } from "./layout-graph-builder";
import { fixtureMaverHtml, fixtureSimpleLandingHtml } from "./layout-graph-test-fixtures";
import { buildLayoutToCanonicalBridge } from "./layout-to-canonical";

test("layout-to-canonical groups preserve canonical structural ordering", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({
    html: fixtureSimpleLandingHtml,
    pathSeed: "fixture-simple-landing.html",
  });

  const bridge = buildLayoutToCanonicalBridge({
    html: fixtureSimpleLandingHtml,
    layoutGraph: graph,
  });

  const intents = bridge.groups.map((group) => group.intent);
  const expected = ["header_nav", "hero", "body", "gallery_media", "form_contact", "footer_legal"];

  let cursor = -1;
  for (const intent of expected) {
    const next = intents.findIndex((value, idx) => idx > cursor && value === intent);
    assert.ok(next !== -1, `expected bridge group intent '${intent}' in DOM order`);
    cursor = next;
  }

  for (const block of bridge.blocks) {
    assert.ok(block.structuralConfidence >= 0 && block.structuralConfidence <= 1, "confidence must be normalized");
    assert.ok(block.confidenceComponents.domIntegrity >= 0 && block.confidenceComponents.domIntegrity <= 1);
    assert.ok(block.confidenceComponents.signalStrength >= 0 && block.confidenceComponents.signalStrength <= 1);
    assert.ok(block.confidenceComponents.semanticAgreement >= 0 && block.confidenceComponents.semanticAgreement <= 1);
    assert.ok(block.confidenceComponents.boundaryClarity >= 0 && block.confidenceComponents.boundaryClarity <= 1);
    assert.ok(block.confidenceComponents.densityCoherence >= 0 && block.confidenceComponents.densityCoherence <= 1);
    assert.ok(Array.isArray(block.anomalies));
  }
});

test("layout-to-canonical yields multi-region block plan for maver fixture", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({
    html: fixtureMaverHtml,
    pathSeed: "fixture-maver.html",
  });

  const bridge = buildLayoutToCanonicalBridge({
    html: fixtureMaverHtml,
    layoutGraph: graph,
  });

  assert.ok(bridge.blocks.length >= 5, "bridge should preserve multiple maver regions");

  const intents = new Set(bridge.blocks.map((block) => block.group.intent));
  assert.ok(intents.has("gallery_media"), "gallery/media block intent should exist");
  assert.ok(intents.has("form_contact"), "form/contact block intent should exist");
  assert.ok(intents.has("footer_legal"), "footer/legal block intent should exist");
});

test("layout-to-canonical confidence ordering is deterministic and explainable", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({
    html: fixtureSimpleLandingHtml,
    pathSeed: "fixture-simple-landing.html",
  });

  const first = buildLayoutToCanonicalBridge({
    html: fixtureSimpleLandingHtml,
    layoutGraph: graph,
  });
  const second = buildLayoutToCanonicalBridge({
    html: fixtureSimpleLandingHtml,
    layoutGraph: graph,
  });

  assert.deepEqual(
    first.blocks.map((block) => block.structuralConfidence),
    second.blocks.map((block) => block.structuralConfidence),
  );

  assert.deepEqual(
    first.blocks.map((block) => block.confidenceComponents),
    second.blocks.map((block) => block.confidenceComponents),
  );

  for (const block of first.blocks) {
    assert.ok(typeof block.confidenceComponents.domIntegrity === "number");
    assert.ok(typeof block.confidenceComponents.signalStrength === "number");
    assert.ok(typeof block.confidenceComponents.semanticAgreement === "number");
    assert.ok(typeof block.confidenceComponents.boundaryClarity === "number");
    assert.ok(typeof block.confidenceComponents.densityCoherence === "number");
  }
});

test("repeated body blocks do not displace the real footer intent", () => {
  const html = `<!doctype html><html><body>
    <header><nav><a href="/">Brand</a><a href="/one">One</a><a href="/two">Two</a></nav></header>
    <main>
      <section class="hero"><h1>Headline</h1><p>Subheadline long enough to be meaningful.</p></section>
      <section><h2>One</h2><p>${"First body content ".repeat(10)}</p></section>
      <section><h2>Two</h2><p>${"Second body content ".repeat(10)}</p></section>
      <section><h2>Three</h2><p>${"Third body content ".repeat(10)}</p></section>
    </main>
    <footer><p>Copyright 2026 Example. All rights reserved.</p></footer>
  </body></html>`;
  const bridge = buildLayoutToCanonicalBridge({
    html,
    layoutGraph: buildLayoutGraphFromSnapshotHtml({ html, pathSeed: "repeated-body" }),
  });

  assert.equal(bridge.blocks.at(-1)?.group.intent, "footer_legal");
  assert.match(bridge.blocks.at(-1)?.blockHtml ?? "", /^<footer\b/i);
  assert.deepEqual(
    bridge.blocks.map((block) => block.blockOrdinal),
    bridge.blocks.map((_, index) => index),
  );
});

test("expanded main children own disjoint ranges while parent-only content remains represented", () => {
  const html = `<!doctype html><html><body>
    <header><nav><a href="/">Brand</a><a href="/one">One</a></nav></header>
    <main>Parent-only introduction that belongs to main and must remain represented.
      <section><h1>First child</h1><p>${"First section content ".repeat(8)}</p></section>
      <section><h2>Second child</h2><p>${"Second section content ".repeat(8)}</p></section>
    </main>
    <footer><p>Copyright 2026 Example. All rights reserved.</p></footer>
  </body></html>`;
  const bridge = buildLayoutToCanonicalBridge({
    html,
    layoutGraph: buildLayoutGraphFromSnapshotHtml({ html, pathSeed: "parent-only-main" }),
  });

  const parentOnly = bridge.blocks.find((block) => block.blockHtml.includes("Parent-only introduction"));
  assert.ok(parentOnly, "parent-only main text should remain represented");
  assert.equal(parentOnly.layoutHint?.tagName, "main");
  assert.equal(parentOnly.group.intent, "body");
  assert.equal(parentOnly.group.domIndexStart, parentOnly.group.domIndexEnd);

  const occupied = new Set<number>();
  for (const block of bridge.blocks) {
    for (let index = block.group.domIndexStart; index <= block.group.domIndexEnd; index += 1) {
      assert.equal(occupied.has(index), false, `DOM index ${index} must contribute to at most one block`);
      occupied.add(index);
    }
  }
});
