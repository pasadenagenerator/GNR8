import assert from "node:assert/strict";
import test from "node:test";
import { CREDENTIAL_REFERENCE_REGISTRY_PREVIEW } from "@/gnr8/runtime/providers/credential-reference-registry-preview";

test("credential reference registry preview exports all preview references", () => {
  assert.equal(CREDENTIAL_REFERENCE_REGISTRY_PREVIEW.length, 3);
  assert.deepEqual(
    CREDENTIAL_REFERENCE_REGISTRY_PREVIEW.map((reference) => reference.providerId),
    ["openprovider", "openai", "resend"],
  );
});

test("credential reference registry preview has no secret-like values", () => {
  const serialized = JSON.stringify(CREDENTIAL_REFERENCE_REGISTRY_PREVIEW).toLowerCase();
  assert.equal(serialized.includes("password"), false);
  assert.equal(serialized.includes("token"), false);
  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("bearer"), false);
  assert.equal(serialized.includes("api_key_live"), false);
  assert.equal(serialized.includes("private_key"), false);
});

test("credential reference registry preview keeps execution blocked for all references", () => {
  for (const reference of CREDENTIAL_REFERENCE_REGISTRY_PREVIEW) {
    assert.equal(reference.executionAllowed, false);
    assert.equal(reference.executionBlocked, true);
  }
});

test("credential reference registry preview keeps resolution disabled for all references", () => {
  for (const reference of CREDENTIAL_REFERENCE_REGISTRY_PREVIEW) {
    assert.equal(reference.resolutionState, "disabled");
  }
});
