import assert from "node:assert/strict";
import test from "node:test";

import { resolveCandidateContextScreenshotArtifactPath } from "./candidate-context-review-runtime";

test("resolves the exact persisted screenshot suffix from a server-local projection path", () => {
  assert.equal(
    resolveCandidateContextScreenshotArtifactPath({
      artifactPath: "/tmp/import-run/rendered/screenshots/fullpage.png",
      persistedFilePaths: [
        "rendered/screenshots/viewport.png",
        "rendered/screenshots/fullpage.png",
      ],
    }),
    "rendered/screenshots/fullpage.png",
  );
});

test("fails closed when no unique persisted screenshot path matches", () => {
  assert.equal(
    resolveCandidateContextScreenshotArtifactPath({
      artifactPath: "/tmp/import-run/rendered/screenshots/fullpage.png",
      persistedFilePaths: ["rendered/screenshots/viewport.png"],
    }),
    null,
  );
  assert.equal(
    resolveCandidateContextScreenshotArtifactPath({
      artifactPath: "/tmp/import-run/rendered/screenshots/fullpage.png",
      persistedFilePaths: [
        "rendered/screenshots/fullpage.png",
        "/rendered/screenshots/fullpage.png",
      ],
    }),
    null,
  );
});
