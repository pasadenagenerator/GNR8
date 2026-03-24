import assert from "node:assert/strict";
import test from "node:test";

import { buildLayoutGraphFromSnapshotHtml } from "./layout-graph-builder";
import { fixtureHeavyNavHtml, fixtureMaverHtml, fixtureSimpleLandingHtml } from "./layout-graph-test-fixtures";
import type { LayoutNode } from "./layout-node-types";

function flattenNodes(root: LayoutNode): LayoutNode[] {
  const out: LayoutNode[] = [];
  const stack: LayoutNode[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    out.push(current);
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]!);
  }
  return out;
}

function firstNodeOfType(nodes: LayoutNode[], type: LayoutNode["type"]): LayoutNode | null {
  return nodes.find((node) => node.type === type) ?? null;
}

test("layout-graph detects hero before first dense text section", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({ html: fixtureSimpleLandingHtml, pathSeed: "fixture-simple-landing.html" });
  const nodes = flattenNodes(graph.root);

  const hero = firstNodeOfType(nodes, "hero");
  const denseSection = nodes
    .filter((n) => n.type === "section" && n.signals.textDensity >= 30)
    .sort((a, b) => a.domIndexStart - b.domIndexStart)[0] ?? null;

  assert.ok(hero, "hero node should exist");
  assert.ok(denseSection, "dense text section should exist");
  assert.ok(hero!.domIndexStart < denseSection!.domIndexStart, "hero should appear before first dense text section");
});

test("layout-graph detects footer near the end of DOM", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({ html: fixtureMaverHtml, pathSeed: "fixture-maver.html" });
  const nodes = flattenNodes(graph.root);
  const footer = firstNodeOfType(nodes, "footer");

  assert.ok(footer, "footer should exist");
  const maxIndex = Math.max(...nodes.map((n) => n.domIndexEnd));
  assert.ok(maxIndex >= 1);
  assert.ok(footer!.domIndexStart >= Math.floor(maxIndex * 0.65), "footer should be close to DOM tail");
});

test("layout-graph does not misclassify heavy nav as hero", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({ html: fixtureHeavyNavHtml, pathSeed: "fixture-heavy-nav.html" });
  const nodes = flattenNodes(graph.root);

  const nav = nodes
    .filter((n) => n.type === "nav")
    .sort((a, b) => a.domIndexStart - b.domIndexStart)[0] ?? null;
  const firstHero = nodes
    .filter((n) => n.type === "hero")
    .sort((a, b) => a.domIndexStart - b.domIndexStart)[0] ?? null;

  assert.ok(nav, "nav should be detected");
  assert.ok(firstHero, "hero should still be detected");
  assert.ok(nav!.signals.linkDensity >= 0.25, "heavy nav should have high link density");
  assert.notEqual(nav!.id, firstHero!.id, "nav node must not be hero node");
  assert.ok(nav!.domIndexStart < firstHero!.domIndexStart, "nav should appear before hero in this fixture");
});

test("layout-graph clusters gallery blocks", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({ html: fixtureSimpleLandingHtml, pathSeed: "fixture-simple-landing.html" });
  const nodes = flattenNodes(graph.root)
    .filter((n) => n.type === "gallery")
    .sort((a, b) => a.domIndexStart - b.domIndexStart);

  assert.ok(nodes.length >= 1, "at least one gallery node expected");
  for (let i = 1; i < nodes.length; i++) {
    const gap = nodes[i]!.domIndexStart - nodes[i - 1]!.domIndexEnd;
    assert.ok(gap <= 4, "gallery nodes should be structurally clustered");
  }
});

test("layout-graph preserves section ordering in DOM order", () => {
  const graph = buildLayoutGraphFromSnapshotHtml({ html: fixtureMaverHtml, pathSeed: "fixture-maver.html" });
  const nodes = flattenNodes(graph.root)
    .filter((n) => n.depth > 0)
    .sort((a, b) => a.domIndexStart - b.domIndexStart);

  for (let i = 1; i < nodes.length; i++) {
    assert.ok(nodes[i]!.domIndexStart >= nodes[i - 1]!.domIndexStart, "dom ordering should be monotonic");
  }

  assert.equal(graph.anomalies.filter((a) => a.code === "NON_MONOTONIC_CHILD_ORDER").length, 0);
});
