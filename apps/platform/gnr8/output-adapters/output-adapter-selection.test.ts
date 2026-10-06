import assert from "node:assert/strict";
import test from "node:test";

import { selectOutputAdapter } from "./output-adapter-selection";

test("new supported website generation defaults to Astro when selection is omitted", () => {
  assert.deepEqual(selectOutputAdapter({
    generationKind: "new",
    siteClass: "static-business-site",
    requiredCapabilities: ["static_pages", "local_assets"],
  }), {
    status: "selected",
    adapterId: "astro-static-site",
    adapterVersion: "gnr8-output-adapter-selection:v1",
    reason: "new_supported_default",
  });
});

test("existing generations remain unchanged and explicit legacy selection remains available", () => {
  assert.equal(selectOutputAdapter({
    generationKind: "regeneration",
    siteClass: "marketing-site",
    requiredCapabilities: ["static_pages"],
    existingAdapterId: "html-static-artifact",
  }).status, "selected");
  assert.equal((selectOutputAdapter({
    generationKind: "regeneration",
    siteClass: "marketing-site",
    requiredCapabilities: ["static_pages"],
    existingAdapterId: "html-static-artifact",
  }) as { adapterId: string }).adapterId, "html-static-artifact");
  assert.equal((selectOutputAdapter({
    generationKind: "new",
    siteClass: "marketing-site",
    requiredCapabilities: ["static_pages"],
    requestedAdapterId: "html-static-artifact",
  }) as { adapterId: string }).adapterId, "html-static-artifact");
});

test("unsupported capabilities fail clearly instead of selecting a fallback", () => {
  assert.deepEqual(selectOutputAdapter({
    generationKind: "new",
    siteClass: "marketing-site",
    requiredCapabilities: ["static_pages", "scripts", "checkout"],
  }), {
    status: "unsupported",
    adapterId: null,
    adapterVersion: "gnr8-output-adapter-selection:v1",
    reason: "unsupported_capability",
    unsupportedCapabilities: ["checkout", "scripts"],
  });
});
