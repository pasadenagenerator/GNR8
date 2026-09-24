import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import WorkspaceShortcuts, { type WorkspaceShortcut } from "./WorkspaceShortcuts";

const { renderToStaticMarkup } = ReactDomServer;

test("WorkspaceShortcuts renders GNR8 icon shortcuts without placeholder letters", () => {
  const shortcuts: WorkspaceShortcut[] = [
    {
      id: "command-center",
      label: "Command Center",
      href: "/gnr8/command-center",
      description: "Open operator dashboard",
      icon: "command-center",
    },
    {
      id: "open-airship",
      label: "Open Airship",
      href: "/gnr8/airship",
      description: "Open Airship chrome",
      icon: "airship",
    },
  ];

  const html = renderToStaticMarkup(<WorkspaceShortcuts title="Shortcuts" shortcuts={shortcuts} />);

  assert.equal(html.includes("Command Center"), true);
  assert.equal(html.includes("Open Airship"), true);
  assert.equal(html.includes("<svg"), true);
  assert.equal(html.includes(">AS<"), false);
});
