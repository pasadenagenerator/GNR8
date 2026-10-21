import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { captureStackiRuntimeFiles } from "./stacki-runtime-files";

test("capture keeps source, binary image and editor state, excluding credentials/dependencies; rejects symlink escapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "stacki-files-"));
  try {
    await mkdir(join(root, "src/pages"), { recursive: true });
    await mkdir(join(root, "public"));
    await mkdir(join(root, ".studio-state"));
    await writeFile(join(root, "package.json"), "{}");
    await writeFile(join(root, "astro.config.mjs"), "export default {}");
    await writeFile(join(root, "src/pages/index.astro"), "<h1>Saved</h1>");
    await writeFile(join(root, "public/image.png"), Buffer.from([0, 255, 128]));
    await writeFile(join(root, ".studio-state/page.bin"), Buffer.from([254, 1]));
    await writeFile(join(root, ".env"), "PRIVATE");
    const files = await captureStackiRuntimeFiles(root);
    assert.equal(files.length, 5);
    assert.deepEqual(Buffer.from(files.find(f => f.path === "public/image.png")!.base64, "base64"), Buffer.from([0, 255, 128]));
    assert(!files.some(f => f.path === ".env"));
    await symlink(join(root, ".env"), join(root, "public/leaked.txt"));
    await assert.rejects(captureStackiRuntimeFiles(root), /SYMLINK/);
    await rm(join(root, "public/leaked.txt"));
    await writeFile(join(root, "public/too-large.png"), Buffer.alloc(1024 * 1024 + 1));
    await assert.rejects(captureStackiRuntimeFiles(root), /LIMIT/);
  } finally { await rm(root, { recursive: true }); }
});
