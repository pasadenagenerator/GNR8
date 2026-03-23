import assert from "node:assert/strict";
import test from "node:test";

import { detectSectionFromHtmlBlock } from "@/gnr8/importer/html-section-detector";

test("pricing detector does not classify EUR 6 emissions copy as pricing", () => {
  const block = [
    "<section>",
    "  <h2>O nas</h2>",
    "  <p>Kamioni izpolnjujejo novi EU standard (EUR 6) in zagotavljajo varen prevoz.</p>",
    "  <h3>About us</h3>",
    "  <p>All trucks meet the new EU standard (EUR 6) for low emissions.</p>",
    "</section>",
  ].join("\n");

  const section = detectSectionFromHtmlBlock(block);
  assert.notEqual(section.type, "pricing.basic");
});

test("pricing detector still recognizes concrete plan prices", () => {
  const block = [
    "<section>",
    "  <h2>Starter</h2>",
    "  <p>EUR 49 / month for 1 project</p>",
    "  <h3>Pro</h3>",
    "  <p>$99 per month for 10 projects</p>",
    "</section>",
  ].join("\n");

  const section = detectSectionFromHtmlBlock(block);
  assert.equal(section.type, "pricing.basic");
});

test("logo cloud detector skips text-heavy image galleries", () => {
  const block = [
    "<section>",
    "  <h2>O nas</h2>",
    "  <p>Transporti Maver opravlja mednarodne prevoze in nudi varno dostavo vozil po Evropi.</p>",
    "  <p>Poleg prevozov imamo tudi servis in varovano parkirišče.</p>",
    "  <img src=\"/assets/a.jpg\" alt=\"a\" />",
    "  <img src=\"/assets/b.jpg\" alt=\"b\" />",
    "  <img src=\"/assets/c.jpg\" alt=\"c\" />",
    "</section>",
  ].join("\n");

  const section = detectSectionFromHtmlBlock(block);
  assert.notEqual(section.type, "logo.cloud");
});
