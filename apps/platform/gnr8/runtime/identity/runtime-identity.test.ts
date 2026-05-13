import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeCorrelationKey,
  createRuntimePreviewIdentity,
  normalizeRuntimeDomain,
  normalizeRuntimeHost,
  normalizeRuntimePath,
} from "@/gnr8/runtime/identity/runtime-identity";

test("normalizeRuntimePath normalizes roots deterministically", () => {
  assert.equal(normalizeRuntimePath(""), "/");
  assert.equal(normalizeRuntimePath("/"), "/");
  assert.equal(normalizeRuntimePath("///"), "/");
  assert.equal(normalizeRuntimePath("./"), "/");
});

test("normalizeRuntimePath strips query/hash and normalizes separators", () => {
  assert.equal(normalizeRuntimePath("/about?utm=1#hero"), "/about");
  assert.equal(normalizeRuntimePath("about\\team/?x=1"), "/about/team");
  assert.equal(normalizeRuntimePath("https://Example.com/a/b/?q=1#h"), "/a/b");
});

test("normalizeRuntimeHost and normalizeRuntimeDomain lowercase and remove protocol/path", () => {
  assert.equal(normalizeRuntimeHost("HTTPS://App.PasadenaGenerator.com:443/Preview?A=1"), "app.pasadenagenerator.com:443");
  assert.equal(normalizeRuntimeDomain(" http://Roboplast.si/Contact#top "), "roboplast.si");
});

test("createRuntimeCorrelationKey is stable for same canonical input", () => {
  const first = createRuntimeCorrelationKey({ siteId: "site_1", siteVersionId: "sv_1", path: "/" });
  const second = createRuntimeCorrelationKey({ path: "/", siteVersionId: "sv_1", siteId: "site_1" });
  assert.equal(first, second);
});

test("same preview inputs produce identical identity", () => {
  const a = createRuntimePreviewIdentity({
    agencyId: "agency_1",
    clientId: "client_1",
    siteId: "site_1",
    siteVersionId: "sv_1",
    previewMode: "transformed",
    sourceMode: "preview",
    path: "?q=1",
  });
  const b = createRuntimePreviewIdentity({
    agencyId: "agency_1",
    clientId: "client_1",
    siteId: "site_1",
    siteVersionId: "sv_1",
    previewMode: "transformed",
    sourceMode: "preview",
    path: "/",
  });

  assert.equal(a.path, "/");
  assert.deepEqual(a, b);
});

test("different siteVersionId produces different correlation identity", () => {
  const a = createRuntimePreviewIdentity({
    agencyId: "agency_1",
    clientId: "client_1",
    siteId: "site_1",
    siteVersionId: "sv_1",
    previewMode: "transformed",
    sourceMode: "preview",
    path: "/",
  });
  const b = createRuntimePreviewIdentity({
    agencyId: "agency_1",
    clientId: "client_1",
    siteId: "site_1",
    siteVersionId: "sv_2",
    previewMode: "transformed",
    sourceMode: "preview",
    path: "/",
  });

  assert.notEqual(a.correlationKey, b.correlationKey);
});

test("identity helpers do not depend on Date.now or Math.random", () => {
  const originalDateNow = Date.now;
  const originalMathRandom = Math.random;
  Date.now = () => {
    throw new Error("Date.now should not be used");
  };
  Math.random = () => {
    throw new Error("Math.random should not be used");
  };

  try {
    const identity = createRuntimePreviewIdentity({
      agencyId: "agency_1",
      clientId: "client_1",
      siteId: "site_1",
      siteVersionId: "sv_1",
      previewMode: "transformed",
      sourceMode: "preview",
      path: "/",
    });
    assert.equal(identity.path, "/");
    assert.equal(identity.correlationKey.length, 64);
  } finally {
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
  }
});
