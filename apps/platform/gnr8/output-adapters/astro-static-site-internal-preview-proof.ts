import { createServer, type Server } from "node:http";

import {
  renderSiteVersionPreview,
  setUnifiedRenderPreviewDependenciesForTest,
} from "../runtime/unified-render-preview";
import {
  inspectAstroStaticExport,
  runAstroBuildExportProof,
  type AstroBuildExportProofEvidence,
} from "./astro-static-site-build-export-proof";
import {
  convertAstroExportToInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";
import {
  prepareAstroStaticSiteWorkspace,
  type PreparedAstroStaticSiteWorkspace,
} from "./astro-static-site-workspace-preparation";

export const ASTRO_INTERNAL_PREVIEW_BRIDGE_PROOF_VERSION =
  "gnr8-astro-internal-preview-bridge-proof:v1" as const;
export const ASTRO_INTERNAL_PREVIEW_PROOF_SITE_ID = "site-astro-mvp06-local-proof" as const;
export const ASTRO_INTERNAL_PREVIEW_PROOF_SITE_VERSION_ID = "sv-astro-mvp06-local-proof" as const;
export const ASTRO_INTERNAL_PREVIEW_PROOF_CANDIDATE_ID = "candidate-astro-mvp06-local-proof" as const;
const PROOF_HOST = "127.0.0.1" as const;

export type AstroInternalPreviewBridgeProofEvidence = {
  proofVersion: typeof ASTRO_INTERNAL_PREVIEW_BRIDGE_PROOF_VERSION;
  proofOnly: true;
  buildExport: AstroBuildExportProofEvidence;
  candidate: {
    id: string;
    siteId: string;
    siteVersionId: string;
    sourceSnapshotSha256: string;
    exportSha256: string;
    convertedArtifactSha256: string;
    inlinedStylesheetPaths: string[];
    storage: "caller_owned_in_memory";
    durableRegistration: false;
  };
  preview: {
    source: string;
    path: string;
    fallbackUsed: boolean;
    databaseReads: 0;
    expectedContentVerified: string[];
    themeTokenVerified: string;
    anchorBehaviorVerified: string[];
  };
  server: {
    host: typeof PROOF_HOST;
    port: number;
    url: string;
    pageStatus: number;
    pageContentType: string;
    stopped: boolean;
  };
  cleanup: {
    workspaceRemoved: boolean;
    serverStopped: boolean;
  };
};

export async function runAstroInternalPreviewBridgeProof(input: {
  workspaceRoot?: string;
  signal?: AbortSignal;
} = {}): Promise<AstroInternalPreviewBridgeProofEvidence> {
  let prepared: PreparedAstroStaticSiteWorkspace | null = null;
  let candidate: AstroInternalPreviewCandidate | null = null;
  let previewEvidence: AstroInternalPreviewBridgeProofEvidence["preview"] | null = null;
  let serverEvidence: AstroInternalPreviewBridgeProofEvidence["server"] | null = null;

  const buildExport = await runAstroBuildExportProof({
    workspaceRoot: input.workspaceRoot,
    signal: input.signal,
    dependencies: {
      prepareWorkspace: async (prepareInput) => {
        prepared = await prepareAstroStaticSiteWorkspace(prepareInput);
        return prepared;
      },
      inspectExport: async (workspacePath) => {
        const inspected = await inspectAstroStaticExport(workspacePath);
        if (!prepared) throw new Error("astro_internal_preview_prepared_workspace_missing");
        candidate = await convertAstroExportToInternalPreviewCandidate({
          inspectedExport: inspected,
          candidateId: ASTRO_INTERNAL_PREVIEW_PROOF_CANDIDATE_ID,
          siteId: ASTRO_INTERNAL_PREVIEW_PROOF_SITE_ID,
          siteVersionId: ASTRO_INTERNAL_PREVIEW_PROOF_SITE_VERSION_ID,
          rendererCompatibilityVersion: "gnr8-renderer-v1",
          sourceSnapshotSha256: prepared.sourceSnapshot.aggregateSha256,
        });

        const restore = setUnifiedRenderPreviewDependenciesForTest({
          requestScopedDbClientEnabled: false,
          getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
          getAstroInternalPreviewCandidate: async (candidateId) =>
            candidateId === ASTRO_INTERNAL_PREVIEW_PROOF_CANDIDATE_ID ? candidate : null,
          getSiteVersion: async () => {
            throw new Error("Astro bridge proof must not read a persisted site version.");
          },
          getSiteVersionArtifactBinding: async () => {
            throw new Error("Astro bridge proof must not read a persisted artifact binding.");
          },
          getArtifactById: async () => {
            throw new Error("Astro bridge proof must not read a persisted runtime artifact.");
          },
        });
        let server: Server | null = null;
        try {
          const preview = await renderSiteVersionPreview({
            siteVersionId: ASTRO_INTERNAL_PREVIEW_PROOF_SITE_VERSION_ID,
            path: "/",
            mode: "transformed",
            astroCandidateSelection: {
              candidateId: ASTRO_INTERNAL_PREVIEW_PROOF_CANDIDATE_ID,
              siteId: ASTRO_INTERNAL_PREVIEW_PROOF_SITE_ID,
            },
            requestCorrelationKey: "req-astro-mvp06-real-build-proof",
          });
          const expectedContent = ["Work that reads clearly", "Practical operating support", "Talk with Northline"];
          const verifiedContent = expectedContent.filter((value) => preview.html.includes(value));
          const themeToken = "--gnr8-astro-accent: #0f766e;";
          const anchors = ['href="#services"', 'href="#contact"'];
          if (
            preview.source !== "astro_internal_preview_candidate" ||
            preview.fallbackUsed ||
            verifiedContent.length !== expectedContent.length ||
            !preview.html.includes(themeToken) ||
            anchors.some((anchor) => !preview.html.includes(anchor)) ||
            /<link\b[^>]*rel=["'][^"']*stylesheet/i.test(preview.html)
          ) {
            throw new Error("astro_internal_preview_render_verification_failed");
          }
          previewEvidence = {
            source: preview.source,
            path: preview.path,
            fallbackUsed: preview.fallbackUsed,
            databaseReads: 0,
            expectedContentVerified: verifiedContent,
            themeTokenVerified: themeToken,
            anchorBehaviorVerified: anchors,
          };

          server = createServer((request, response) => {
            if ((request.method === "GET" || request.method === "HEAD") && new URL(request.url ?? "/", "http://gnr8.invalid").pathname === "/") {
              const body = Buffer.from(preview.html, "utf8");
              response.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "content-length": String(body.byteLength),
                "cache-control": "no-store",
              });
              response.end(request.method === "HEAD" ? undefined : body);
              return;
            }
            response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
          });
          await listen(server);
          const address = server.address();
          if (!address || typeof address === "string") throw new Error("astro_internal_preview_server_address_missing");
          const url = `http://${PROOF_HOST}:${address.port}/`;
          const response = await fetch(url, { cache: "no-store", signal: input.signal });
          const body = await response.text();
          const contentType = response.headers.get("content-type") ?? "";
          if (response.status !== 200 || !contentType.includes("text/html") || body !== preview.html || !body.includes(themeToken)) {
            throw new Error("astro_internal_preview_http_verification_failed");
          }
          serverEvidence = {
            host: PROOF_HOST,
            port: address.port,
            url,
            pageStatus: response.status,
            pageContentType: contentType,
            stopped: false,
          };
        } finally {
          restore();
          if (server?.listening) {
            await closeServer(server);
            if (serverEvidence) serverEvidence.stopped = true;
          }
        }
        return inspected;
      },
    },
  });

  const completedCandidate = candidate as AstroInternalPreviewCandidate | null;
  const completedPreviewEvidence = previewEvidence as AstroInternalPreviewBridgeProofEvidence["preview"] | null;
  const completedServerEvidence = serverEvidence as AstroInternalPreviewBridgeProofEvidence["server"] | null;
  if (!completedCandidate || !completedPreviewEvidence || !completedServerEvidence) {
    throw new Error("astro_internal_preview_bridge_evidence_incomplete");
  }
  return {
    proofVersion: ASTRO_INTERNAL_PREVIEW_BRIDGE_PROOF_VERSION,
    proofOnly: true,
    buildExport,
    candidate: {
      id: completedCandidate.id,
      siteId: completedCandidate.siteId,
      siteVersionId: completedCandidate.siteVersionId,
      sourceSnapshotSha256: completedCandidate.manifest.provenance.sourceSnapshotSha256,
      exportSha256: completedCandidate.manifest.provenance.exportSha256,
      convertedArtifactSha256: completedCandidate.contentSha256,
      inlinedStylesheetPaths: completedCandidate.manifest.assetHandling.inlinedStylesheetPaths,
      storage: completedCandidate.manifest.lifecycle.storage,
      durableRegistration: completedCandidate.manifest.lifecycle.durableRegistration,
    },
    preview: completedPreviewEvidence,
    server: completedServerEvidence,
    cleanup: {
      workspaceRemoved: buildExport.workspace.removed,
      serverStopped: completedServerEvidence.stopped,
    },
  };
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(0, PROOF_HOST, () => {
      server.removeListener("error", onError);
      resolve();
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
