import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import { Gnr8Icon, gnr8IconNames } from "./Gnr8Icon";

const { renderToStaticMarkup } = ReactDomServer;

test("Gnr8Icon renders every supported icon name", () => {
  for (const name of gnr8IconNames) {
    const html = renderToStaticMarkup(<Gnr8Icon name={name} />);
    assert.equal(html.includes("<svg"), true, name);
    assert.equal(html.includes("aria-hidden=\"true\""), true, name);
  }
});

test("Gnr8Icon renders accessible labels only when requested", () => {
  const decorative = renderToStaticMarkup(<Gnr8Icon name="settings" />);
  const labelled = renderToStaticMarkup(<Gnr8Icon name="settings" label="Settings" state="active" />);

  assert.equal(decorative.includes("aria-label"), false);
  assert.equal(labelled.includes("role=\"img\""), true);
  assert.equal(labelled.includes("aria-label=\"Settings\""), true);
});
