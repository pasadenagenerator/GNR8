import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeGeneratedOutputRoutePathForFile,
  encodeGeneratedOutputRoutePath,
  isGeneratedOutputRoutePath,
} from "./generated-output-route-path";

test("generated output routes keep URL-safe identity and decode only for source filenames", () => {
  const encoded = "/b/platform9-in-the-gartner%C2%AE-magic-quadrant%E2%84%A2";
  assert.equal(encodeGeneratedOutputRoutePath("/b/platform9-in-the-gartner®-magic-quadrant™"), encoded);
  assert.equal(encodeGeneratedOutputRoutePath(encoded), encoded);
  assert.equal(
    decodeGeneratedOutputRoutePathForFile(encoded),
    "b/platform9-in-the-gartner®-magic-quadrant™",
  );
  assert.equal(isGeneratedOutputRoutePath(encoded), true);
});

test("generated output routes reject encoded traversal and route delimiters", () => {
  for (const route of ["/b/%2E%2E", "/b/%2Fadmin", "/b/%3Fquery", "/b/trademark%c2%ae"]) {
    assert.equal(isGeneratedOutputRoutePath(route), false, route);
    assert.throws(() => decodeGeneratedOutputRoutePathForFile(route));
  }
});
