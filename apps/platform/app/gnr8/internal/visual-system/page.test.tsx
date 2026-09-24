import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import { gnr8VisualTokens } from "../../../../gnr8/visual-system/gnr8-visual-system";

import Gnr8VisualSystemReferencePage from "./page";

const { renderToStaticMarkup } = ReactDomServer;

test("GNR8 visual system reference renders operator UI samples and orange tokens", () => {
  const html = renderToStaticMarkup(<Gnr8VisualSystemReferencePage />);

  assert.equal(html.includes("GNR8 Visual System Foundation"), true);
  assert.equal(html.includes("Operator panel"), true);
  assert.equal(html.includes("Run Check"), true);
  assert.equal(html.includes("Publish locked"), true);
  assert.equal(html.includes("draft"), true);
  assert.equal(html.includes("blocked"), true);
  assert.equal(html.includes(gnr8VisualTokens.color.accentOrange), true);
  assert.equal(html.includes("#1d4ed8"), false);
  assert.equal(html.includes("#2563eb"), false);
});
