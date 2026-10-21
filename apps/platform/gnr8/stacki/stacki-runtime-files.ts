import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { parseStackiSave, STACKI_FILE_MAX_BYTES, STACKI_PROJECT_MAX_BYTES, type StackiDraftFile } from "./stacki-draft-contract";

/** Called while Studio holds its project writer queue, after all rooms persist. */
export async function captureStackiRuntimeFiles(root: string): Promise<StackiDraftFile[]> {
  const canonical = await realpath(root);
  const files: StackiDraftFile[] = [];
  let total = 0;
  async function visit(path: string) {
    const absolute = join(canonical, path);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error("STACKI_CHECKPOINT_SYMLINK");
    if (stat.isDirectory()) {
      if (path.split("/").length > 20) throw new Error("STACKI_CHECKPOINT_DEPTH");
      for (const name of (await readdir(absolute)).sort()) await visit(`${path}/${name}`);
      return;
    }
    if (!stat.isFile() || stat.size > STACKI_FILE_MAX_BYTES || files.length >= 256) throw new Error("STACKI_CHECKPOINT_LIMIT");
    total += stat.size;
    if (total > STACKI_PROJECT_MAX_BYTES) throw new Error("STACKI_CHECKPOINT_LIMIT");
    if (await realpath(absolute) !== absolute) throw new Error("STACKI_CHECKPOINT_SYMLINK");
    const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const bytes = Buffer.alloc(stat.size + 1);
      const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
      if (bytesRead !== stat.size) throw new Error("STACKI_CHECKPOINT_CHANGED");
      files.push({ path, base64: bytes.subarray(0, bytesRead).toString("base64") });
    } finally { await handle.close(); }
  }
  for (const path of ["src", "public", ".studio-state", "package.json", "package-lock.json", "astro.config.mjs"]) {
    try { await lstat(join(canonical, path)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && ["public", ".studio-state", "package-lock.json"].includes(path)) continue;
      throw error;
    }
    await visit(path);
  }
  return parseStackiSave({ expectedRevision: 0, files }).files;
}
