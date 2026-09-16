import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { AirshipPreviewHostReadback } from "@/gnr8/single-site/airship-preview-host-binding-service";

import { AirshipPreviewHostBindingAction } from "./airship-preview-host-binding-action";

const { renderToStaticMarkup } = ReactDomServer;

function previewHostReadback(overrides: Partial<AirshipPreviewHostReadback> = {}): AirshipPreviewHostReadback {
  return {
    serviceVersion: "airship-21-preview-host-binding:v1",
    label: "GNR8 demo preview, not live",
    candidateSiteVersionId: "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7",
    candidateArtifactId: "4ec7588a-b7cb-46dc-a735-88e4ec466a72",
    suggestedHostname: "chs-airship.app.pasadenagenerator.com",
    previewUrl: "https://chs-airship.app.pasadenagenerator.com/",
    binding: null,
    bindingStatus: {
      label: "Preview host binding missing",
      detail: "No GNR8 preview-host binding exists for chs-airship.app.pasadenagenerator.com.",
      tone: "warn",
    },
    activePointerStatus: {
      siteVersionId: null,
      artifactId: null,
      label: "No active pointer",
      detail: "Preview-host workflow does not require an active/live pointer.",
      tone: "neutral",
    },
    externalSourceDomainStatus: {
      url: "https://www.chs.si/",
      host: "www.chs.si",
      label: "External customer domain separate",
      detail: "www.chs.si is the customer/source domain and is not mutated by this workflow.",
      tone: "neutral",
    },
    action: {
      enabled: true,
      endpoint: "/api/gnr8/admin/airship/single-site/preview-host-binding",
      actionMode: "create_gnr8_demo_preview_host",
      disabledReason: null,
    },
    ...overrides,
  };
}

test("AirshipPreviewHostBindingAction renders no action when readback is null", () => {
  const html = renderToStaticMarkup(
    <AirshipPreviewHostBindingAction
      migrationId="682a09fd-8fd5-4f73-93b8-54f5d4067c63"
      readback={null}
    />,
  );

  assert.equal(html, "");
});

test("AirshipPreviewHostBindingAction renders existing preview-host action when readback is present", () => {
  const html = renderToStaticMarkup(
    <AirshipPreviewHostBindingAction
      migrationId="682a09fd-8fd5-4f73-93b8-54f5d4067c63"
      readback={previewHostReadback()}
    />,
  );

  assert.equal(html.includes("GNR8 demo preview, not live"), true);
  assert.equal(html.includes("Create preview host binding"), true);
  assert.equal(html.includes("candidate preview only"), true);
  assert.equal(html.includes("no active pointer"), true);
  assert.equal(html.includes("no customer DNS"), true);
});
