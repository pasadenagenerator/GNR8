/** Isolated experiment. Never imported by application composition/routes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createStackiRecord, parseStackiRecord, StackiDraftError,
  type StackiDraftRecord, type StackiDraftSave, type StackiDraftScope } from "./stacki-draft-contract";
import type { StackiStorageClient } from "./stacki-draft-store";

export const proofHash = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");
type Entry = { path: string; sha256: string; bytes: number; location: "git" | "object" };
type Manifest = Omit<StackiDraftRecord, "files"> & { files: Entry[]; retainedInputSha256: string };
export type GitProofMetrics = { label: string; ms: number; packBytes?: number }[];

export class GithubProofStore {
  readonly metrics: GitProofMetrics = [];
  unavailable = false;
  loseAcknowledgement = false;
  private knownObjects = new Set<string>();
  constructor(readonly root: string, readonly remote: string,
    private objects: ReturnType<StackiStorageClient["storage"]["from"]>,
    private retainedInputSha256: string) {}

  git(args: string[], cwd = this.root): string {
    return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", cwd, ...args],
      { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }).trim();
  }
  private async measured<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    try { return await fn(); } finally { this.metrics.push({ label, ms: performance.now() - start }); }
  }
  async init() {
    await mkdir(this.root, { recursive: false });
    this.git(["init", "-b", "main"]);
    this.git(["config", "user.name", "GNR8 isolated proof"]);
    this.git(["config", "user.email", "proof@gnr8.invalid"]);
    this.git(["remote", "add", "origin", this.remote]);
  }
  private async head() {
    if (this.unavailable) throw new StackiDraftError(503, "STACKI_DRAFT_STORAGE_UNAVAILABLE");
    return this.measured("remote-head", () => this.git(["ls-remote", "origin", "refs/heads/main"]).split(/\s/)[0] || null);
  }
  private async fetchHead() {
    const head = await this.head();
    if (head) await this.measured("remote-fetch", () => this.git(["fetch", "--quiet", "origin", "main"]));
    return head;
  }
  private manifest(commit: string): Manifest {
    return JSON.parse(this.git(["show", `${commit}:gnr8-proof-manifest.json`]));
  }
  async latest(scope: StackiDraftScope) {
    const head = await this.fetchHead();
    return head ? this.readCommit(head, scope) : null;
  }
  async readCommit(commit: string, scope: StackiDraftScope): Promise<StackiDraftRecord> {
    assert(/^[a-f0-9]{40}$/.test(commit));
    const manifest = this.manifest(commit);
    assert.equal(manifest.retainedInputSha256, this.retainedInputSha256);
    const files = [];
    for (const file of manifest.files) {
      let bytes: Buffer;
      if (file.location === "git") {
        bytes = execFileSync("git", ["-C", this.root, "show", `${commit}:${file.path}`], {maxBuffer: 2 * 1024 * 1024});
      } else {
        const response = await this.objects.download(`sha256/${file.sha256}.json`);
        if (response.error || !response.data) throw new StackiDraftError(503, "STACKI_DRAFT_SAVE_UNCONFIRMED");
        bytes = Buffer.from(JSON.parse(await response.data.text()).base64, "base64");
      }
      assert.equal(bytes.length, file.bytes); assert.equal(proofHash(bytes), file.sha256);
      files.push({path: file.path, base64: bytes.toString("base64")});
    }
    const record = {format:manifest.format, scope:manifest.scope, revision:manifest.revision, actorUserId:manifest.actorUserId, sha256:manifest.sha256};
    return parseStackiRecord({...record, files}, scope, manifest.revision);
  }
  async save(scope: StackiDraftScope, actor: string, save: StackiDraftSave): Promise<StackiDraftRecord> {
    const record = createStackiRecord(scope, actor, save);
    const head = await this.fetchHead();
    if (head) {
      const current = this.manifest(head);
      assert.deepEqual(current.scope, scope);
      if (current.revision !== save.expectedRevision) {
        for (const commit of this.git(["rev-list", head]).split("\n")) {
          const prior = this.manifest(commit);
          if (prior.revision === record.revision && prior.sha256 === record.sha256)
            return this.readCommit(commit, scope);
        }
        throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
      }
    } else if (save.expectedRevision !== 0) throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
    const manifest: Manifest = {...record, files: [], retainedInputSha256: this.retainedInputSha256};
    await this.measured("local-stage-objects", async () => {
      if (head) this.git(["reset", "--hard", head]); // ONLY this dedicated disposable checkout.
      for (const name of ["src", "astro.config.mjs", "package.json", "package-lock.json"])
        await rm(join(this.root, name), { recursive: true, force: true });
      for (const file of record.files) {
        const bytes = Buffer.from(file.base64, "base64"), sha256 = proofHash(bytes);
        const location = file.path.startsWith("public/") || file.path.startsWith(".studio-state/") ? "object" : "git";
        manifest.files.push({path:file.path, sha256, bytes:bytes.length, location});
        if (location === "git") {
          await mkdir(dirname(join(this.root, file.path)), {recursive:true});
          await writeFile(join(this.root, file.path), bytes);
        } else if (!this.knownObjects.has(sha256)) {
          const key = `sha256/${sha256}.json`;
          await this.objects.upload(key, Buffer.from(JSON.stringify({base64:file.base64})),
            {contentType:"application/json", cacheControl:"0", upsert:false});
          // Object persistence must also be confirmed before committing a reference.
          const read = await this.objects.download(key);
          if (read.error || !read.data) throw new StackiDraftError(503, "STACKI_DRAFT_SAVE_UNCONFIRMED");
          assert.equal(proofHash(Buffer.from(JSON.parse(await read.data.text()).base64,"base64")), sha256);
          this.knownObjects.add(sha256);
        }
      }
      await writeFile(join(this.root,"gnr8-proof-manifest.json"),JSON.stringify(manifest));
    });
    await this.measured("local-commit", () => {
      this.git(["add", "--all"]); this.git(["commit", "--quiet", "-m", `GNR8 proof revision ${record.revision}`]);
    });
    const commit = this.git(["rev-parse", "HEAD"]);
    // Git's pack payload, excluding HTTP/TLS/protocol overhead. Same object set as this push.
    const pack = execFileSync("git", ["-C",this.root,"pack-objects","--stdout","--revs","--thin"],
      {input:`${commit}\n${head ? `^${head}\n` : ""}`,maxBuffer:16*1024*1024});
    let pushFailed = false;
    await this.measured("remote-push", () => {
      try { this.git(["push", "--porcelain", "origin", `${commit}:refs/heads/main`]); }
      catch { pushFailed = true; }
    });
    this.metrics[this.metrics.length - 1].packBytes = pack.length;
    if (this.loseAcknowledgement) {
      this.loseAcknowledgement = false;
      throw new StackiDraftError(503, "STACKI_DRAFT_SAVE_UNCONFIRMED");
    }
    const durable = await this.fetchHead();
    if (durable !== commit) throw new StackiDraftError(pushFailed ? 409 : 503,
      pushFailed ? "STACKI_DRAFT_CONFLICT" : "STACKI_DRAFT_SAVE_UNCONFIRMED");
    const confirmed = await this.readCommit(commit, scope);
    assert.equal(confirmed.sha256, record.sha256);
    return confirmed;
  }
}

export function measuredProofStorage(client: StackiStorageClient, bucket: string) {
  const metrics = {uploadBytes:0, downloadBytes:0, uploads:0, downloads:0, calls:0};
  const measured: StackiStorageClient = {storage:{
    getBucket: async name => { metrics.calls++; return client.storage.getBucket(name); },
    from: name => {
      assert.equal(name,bucket); const target=client.storage.from(name);
      return {
        list: async (...args) => {metrics.calls++; return target.list(...args);},
        upload: async (...args) => {metrics.calls++;metrics.uploads++;metrics.uploadBytes+=args[1].byteLength;return target.upload(...args);},
        download: async key => {metrics.calls++;metrics.downloads++;const result=await target.download(key);metrics.downloadBytes+=result.data?.size??0;return result;},
      };
    },
  }};
  return {client:measured, metrics};
}
