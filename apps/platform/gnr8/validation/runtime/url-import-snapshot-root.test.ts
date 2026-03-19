import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR,
  defaultUrlImportSnapshotRootDirAbs,
  resolveUrlImportSnapshotRootDirAbs,
} from "./url-import-snapshot-root";

function withEnv(input: { key: string; value?: string }, fn: () => void): void {
  const previous = process.env[input.key];
  if (typeof input.value === "string") process.env[input.key] = input.value;
  else delete process.env[input.key];
  try {
    fn();
  } finally {
    if (typeof previous === "string") process.env[input.key] = previous;
    else delete process.env[input.key];
  }
}

test("default snapshot root resolves to validation .out outside Vercel runtime", () => {
  withEnv({ key: URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR, value: undefined }, () => {
    withEnv({ key: "VERCEL", value: undefined }, () => {
      const resolved = defaultUrlImportSnapshotRootDirAbs();
      const normalized = resolved.replaceAll(path.sep, "/");
      assert.ok(normalized.endsWith("/apps/platform/gnr8/validation/.out/url-import-snapshots"));
    });
  });
});

test("default snapshot root resolves to tmp root on Vercel runtime", () => {
  withEnv({ key: URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR, value: undefined }, () => {
    withEnv({ key: "VERCEL", value: "1" }, () => {
      const expected = path.resolve(os.tmpdir(), "gnr8", "validation", "url-import-snapshots");
      assert.equal(defaultUrlImportSnapshotRootDirAbs(), expected);
    });
  });
});

test("env override wins over Vercel and default rules", () => {
  const override = path.resolve(os.tmpdir(), "gnr8-test-override-root");
  withEnv({ key: "VERCEL", value: "1" }, () => {
    withEnv({ key: URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR, value: override }, () => {
      assert.equal(defaultUrlImportSnapshotRootDirAbs(), override);
      assert.equal(resolveUrlImportSnapshotRootDirAbs(), override);
    });
  });
});

test("explicit input root wins over defaults", () => {
  const explicit = path.resolve(os.tmpdir(), "gnr8-explicit-root");
  withEnv({ key: URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR, value: undefined }, () => {
    withEnv({ key: "VERCEL", value: "1" }, () => {
      assert.equal(resolveUrlImportSnapshotRootDirAbs(explicit), explicit);
    });
  });
});

