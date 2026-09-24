import { randomUUID } from "node:crypto";

import {
  buildAirshipOnlineBuilderHeartbeatAuditMetadata,
  buildAirshipOnlineBuilderHeartbeatRecord,
  buildAirshipOnlineBuilderHeartbeatResponse,
  type AirshipOnlineBuilderWorkerHeartbeatRequest,
} from "@/gnr8/airship/online-builder/airship-online-builder-heartbeat";
import {
  AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
  renewAirshipOnlineBuilderWorkerLease,
  releaseAirshipOnlineBuilderWorkerLease,
} from "@/gnr8/airship/online-builder/airship-online-builder-lease";
import {
  createConfiguredAirshipOnlineBuilderRepository,
} from "@/gnr8/airship/online-builder/airship-online-builder-runtime-config";
import {
  AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
  buildAirshipOnlineBuilderAuditEvent,
} from "@/gnr8/airship/online-builder/airship-online-builder-security";
import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipOnlineBuilderAuditEventName,
  type AirshipOnlineBuilderFailureReason,
} from "@/gnr8/airship/online-builder/airship-online-builder-worker-contract";
import type { AirshipOnlineBuilderRepositoryBoundary } from "@/gnr8/airship/online-builder/airship-online-builder-repository";
import {
  parseAirshipOnlineBuilderWorkerBearerToken,
  sha256Hex,
  verifyAirshipOnlineBuilderSignedWorkerRequest,
  verifyAirshipOnlineBuilderWorkerBearerToken,
  type AirshipOnlineBuilderSignedWorkerRequest,
  type AirshipOnlineBuilderWorkerIdentity,
} from "@/gnr8/airship/online-builder/airship-online-builder-worker-auth";

type WorkerRouteDeps = {
  repository?: AirshipOnlineBuilderRepositoryBoundary;
  now?: () => Date;
  auditIdFactory?: () => string;
  heartbeatIdFactory?: () => string;
  requestSigningSecret?: string | null;
  requestSigningMaxSkewSeconds?: number;
  seenNonces?: Set<string>;
};

type AuthSuccess = {
  ok: true;
  worker: AirshipOnlineBuilderWorkerIdentity;
};

type AuthFailure = {
  ok: false;
  status: number;
  failureReason: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
  response: Response;
};

type LeaseBody = {
  actionMode?: unknown;
  sessionId?: unknown;
  leaseId?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function response(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function recordBody(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function failure(status: number, failureReason: AirshipOnlineBuilderFailureReason, diagnostics: string[]): Response {
  return response(status, {
    ok: false,
    failureReason,
    diagnostics,
    mutationFlags: {
      launchesWorker: false,
      exposesPublicEditorUrl: false,
      publishes: false,
      liveSiteMutation: false,
      activePointerMutation: false,
      demoMutation: false,
      dnsMutation: false,
      providerMutation: false,
      billingMutation: false,
      sourceCaptureImport: false,
      previewHostBindingMutation: false,
    },
    boundaries: AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
  });
}

function signatureFromHeaders(request: Request, bodySha256: string): AirshipOnlineBuilderSignedWorkerRequest | null {
  const workerId = text(request.headers.get("x-gnr8-airship-worker-id"));
  const timestamp = text(request.headers.get("x-gnr8-airship-timestamp"));
  const nonce = text(request.headers.get("x-gnr8-airship-nonce"));
  const signature = text(request.headers.get("x-gnr8-airship-signature"));
  const headerBodySha256 = text(request.headers.get("x-gnr8-airship-body-sha256")) || bodySha256;
  if (!workerId && !timestamp && !nonce && !signature) return null;
  return {
    workerId,
    method: request.method.toUpperCase(),
    path: new URL(request.url).pathname,
    bodySha256: headerBodySha256,
    timestamp,
    nonce,
    signature,
  };
}

export function createAirshipOnlineBuilderWorkerRouteHandlers(deps: WorkerRouteDeps = {}) {
  const repository = deps.repository ?? createConfiguredAirshipOnlineBuilderRepository();
  const now = deps.now ?? (() => new Date());
  const auditIdFactory = deps.auditIdFactory ?? (() => `airship-online-worker-audit-${randomUUID()}`);
  const heartbeatIdFactory = deps.heartbeatIdFactory ?? (() => `airship-online-worker-heartbeat-${randomUUID()}`);
  const seenNonces = deps.seenNonces ?? new Set<string>();
  const requestSigningSecret = deps.requestSigningSecret ?? process.env.GNR8_AIRSHIP_ONLINE_BUILDER_WORKER_SIGNING_SECRET ?? null;
  const requestSigningMaxSkewSeconds = deps.requestSigningMaxSkewSeconds ?? 120;

  async function appendAudit(input: {
    sessionId?: string | null;
    workerId?: string | null;
    eventType: AirshipOnlineBuilderAuditEventName;
    severity?: "info" | "warning" | "error";
    correlationId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await repository.auditEvents.appendAuditEvent(buildAirshipOnlineBuilderAuditEvent({
      id: auditIdFactory(),
      sessionId: input.sessionId ?? input.workerId ?? "worker-auth",
      actorUserId: input.workerId ?? "airship-builder-worker",
      eventType: input.eventType,
      severity: input.severity ?? "info",
      correlationId: input.correlationId,
      idempotencyKey: null,
      metadata: input.metadata,
      createdAt: now().toISOString(),
    }));
  }

  async function authenticate(request: Request, rawBody: string, correlationId: string): Promise<AuthSuccess | AuthFailure> {
    const authorizationHeader = request.headers.get("authorization");
    const parsed = authorizationHeader ? parseAirshipOnlineBuilderWorkerBearerToken(authorizationHeader) : null;
    const token = parsed ? await repository.workerAuthTokens.readByTokenId(parsed.tokenId) : null;
    const worker = token ? await repository.workers.readWorker(token.workerId) : null;
    const verified = verifyAirshipOnlineBuilderWorkerBearerToken({
      authorizationHeader,
      token,
      worker,
      now: now(),
    });

    if (!verified.ok) {
      await appendAudit({
        workerId: worker?.workerId ?? token?.workerId ?? null,
        eventType: "worker_auth_failure",
        severity: "warning",
        correlationId,
        metadata: {
          failureReason: verified.failureReason,
          diagnostics: verified.diagnostics,
        },
      });
      return {
        ok: false,
        status: 401,
        failureReason: verified.failureReason === "token_expired" ? "request_expired" : "worker_auth_failed",
        diagnostics: verified.diagnostics,
        response: failure(verified.failureReason === "token_expired" ? 401 : 403, verified.failureReason === "token_expired" ? "request_expired" : "worker_auth_failed", verified.diagnostics),
      };
    }

    if (requestSigningSecret) {
      const bodySha256 = sha256Hex(rawBody);
      const signed = signatureFromHeaders(request, bodySha256);
      if (!signed || signed.workerId !== verified.worker.workerId || signed.bodySha256 !== bodySha256) {
        const diagnostics = ["airship_online_builder_worker_request_signature_missing_or_body_mismatch"];
        await appendAudit({
          workerId: verified.worker.workerId,
          eventType: "worker_auth_failure",
          severity: "warning",
          correlationId,
          metadata: { failureReason: "request_signature_invalid", diagnostics },
        });
        return {
          ok: false,
          status: 403,
          failureReason: "worker_auth_failed",
          diagnostics,
          response: failure(403, "worker_auth_failed", diagnostics),
        };
      }
      const signedVerification = verifyAirshipOnlineBuilderSignedWorkerRequest({
        request: signed,
        signingSecret: requestSigningSecret,
        now: now(),
        maxSkewSeconds: requestSigningMaxSkewSeconds,
        seenNonces,
      });
      if (!signedVerification.ok) {
        const failureReason = signedVerification.failureReason === "request_nonce_replayed"
          ? "request_replay_rejected"
          : signedVerification.failureReason === "request_expired"
            ? "request_expired"
            : "worker_auth_failed";
        await appendAudit({
          workerId: verified.worker.workerId,
          eventType: "worker_auth_failure",
          severity: "warning",
          correlationId,
          metadata: { failureReason: signedVerification.failureReason, diagnostics: signedVerification.diagnostics },
        });
        return {
          ok: false,
          status: failureReason === "request_expired" ? 401 : 403,
          failureReason,
          diagnostics: signedVerification.diagnostics,
          response: failure(failureReason === "request_expired" ? 401 : 403, failureReason, signedVerification.diagnostics),
        };
      }
      seenNonces.add(signedVerification.replayKey);
    }

    await repository.workerAuthTokens.markLastUsed({ tokenId: verified.token.tokenId, lastUsedAt: now().toISOString() });
    await repository.workers.upsertWorker({ ...verified.worker, lastAuthenticatedAt: now().toISOString() });
    await appendAudit({
      workerId: verified.worker.workerId,
      eventType: "worker_auth_success",
      correlationId,
      metadata: {
        workerId: verified.worker.workerId,
        tokenId: verified.token.tokenId,
        tokenHash: verified.token.tokenHash,
      },
    });
    return { ok: true, worker: verified.worker };
  }

  async function authenticatedJson(request: Request): Promise<{ auth: AuthSuccess | AuthFailure; body: unknown; rawBody: string; correlationId: string }> {
    const rawBody = await request.text();
    let body: unknown = null;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      body = null;
    }
    const correlationId = text((recordBody(body) ?? {}).correlationId) || text(request.headers.get("x-correlation-id")) || "airship-online-builder-worker-route";
    return {
      body,
      rawBody,
      correlationId,
      auth: await authenticate(request, rawBody, correlationId),
    };
  }

  return {
    async workerAuth(request: Request): Promise<Response> {
      const rawBody = request.method === "GET" ? "" : await request.text();
      const correlationId = text(request.headers.get("x-correlation-id")) || "airship-online-builder-worker-auth";
      const auth = await authenticate(request, rawBody, correlationId);
      if (!auth.ok) return auth.response;
      const heartbeat = await repository.heartbeats.readLatestForWorker(auth.worker.workerId);
      return response(200, {
        ok: true,
        worker: {
          workerId: auth.worker.workerId,
          displayName: auth.worker.displayName,
          status: auth.worker.status,
          allowlisted: auth.worker.allowlisted,
          deploymentMode: auth.worker.deploymentMode,
          contractVersion: auth.worker.contractVersion,
          capabilities: auth.worker.capabilities,
          version: auth.worker.version,
          lastAuthenticatedAt: now().toISOString(),
        },
        latestHeartbeat: heartbeat ? {
          observedAt: heartbeat.observedAt,
          workerStatus: heartbeat.workerStatus,
          activeSessionCount: heartbeat.activeSessionCount,
          processHealth: heartbeat.processHealth,
          cleanupHealth: heartbeat.cleanupHealth,
        } : null,
        exposesPublicEditorUrl: false,
        canLaunchWorker: false,
      });
    },

    async heartbeat(request: Request): Promise<Response> {
      const parsed = await authenticatedJson(request);
      if (!parsed.auth.ok) return parsed.auth.response;
      const body = recordBody(parsed.body);
      if (!body || body.workerId !== parsed.auth.worker.workerId || body.contractVersion !== AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION) {
        return failure(400, "invalid_request", ["airship_online_builder_worker_heartbeat_contract_invalid"]);
      }
      const heartbeatRequest = body as AirshipOnlineBuilderWorkerHeartbeatRequest;
      const observedAt = now().toISOString();
      const heartbeat = buildAirshipOnlineBuilderHeartbeatRecord({
        id: heartbeatIdFactory(),
        request: heartbeatRequest,
        observedAt,
      });
      await repository.heartbeats.upsertHeartbeat(heartbeat);
      await appendAudit({
        workerId: parsed.auth.worker.workerId,
        eventType: "worker_heartbeat",
        correlationId: parsed.correlationId,
        metadata: buildAirshipOnlineBuilderHeartbeatAuditMetadata({ heartbeat, stale: false }),
      });

      for (const activeSession of heartbeatRequest.activeSessions) {
        const activeLease = await repository.leases.readActiveLease(activeSession.sessionId);
        if (activeLease?.id === activeSession.leaseId && activeLease.workerId === parsed.auth.worker.workerId) {
          await repository.leases.renewLease({
            ...activeLease,
            heartbeatAt: activeSession.heartbeatAt,
          });
        }
      }

      return response(200, buildAirshipOnlineBuilderHeartbeatResponse({
        request: heartbeatRequest,
        acceptedAt: observedAt,
      }) as unknown as Record<string, unknown>);
    },

    async lease(request: Request): Promise<Response> {
      const parsed = await authenticatedJson(request);
      if (!parsed.auth.ok) return parsed.auth.response;
      const body = recordBody(parsed.body) as LeaseBody | null;
      const actionMode = text(body?.actionMode);
      const sessionId = text(body?.sessionId);
      const leaseId = text(body?.leaseId);
      if (!sessionId || !leaseId || (actionMode !== "renew" && actionMode !== "release")) {
        return failure(400, "invalid_request", ["airship_online_builder_worker_lease_fields_required"]);
      }
      const activeLease = await repository.leases.readActiveLease(sessionId);
      if (!activeLease || activeLease.id !== leaseId || activeLease.workerId !== parsed.auth.worker.workerId) {
        return failure(404, "lease_not_found", ["airship_online_builder_worker_lease_not_found_or_not_owned"]);
      }
      if (actionMode === "release") {
        const released = releaseAirshipOnlineBuilderWorkerLease({ lease: activeLease, now: now() });
        await repository.leases.releaseLease({ id: released.id, state: released.state, releasedAt: released.releasedAt });
        await appendAudit({
          sessionId,
          workerId: parsed.auth.worker.workerId,
          eventType: "lease_released",
          correlationId: parsed.correlationId,
          metadata: { workerId: parsed.auth.worker.workerId, leaseId },
        });
        return response(200, { ok: true, lease: { id: released.id, state: released.state, releasedAt: released.releasedAt }, canLaunchWorker: false });
      }
      const renewed = renewAirshipOnlineBuilderWorkerLease({
        lease: activeLease,
        config: AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
        now: now(),
      });
      await repository.leases.renewLease(renewed);
      await appendAudit({
        sessionId,
        workerId: parsed.auth.worker.workerId,
        eventType: "lease_renewed",
        correlationId: parsed.correlationId,
        metadata: { workerId: parsed.auth.worker.workerId, leaseId, expiresAt: renewed.expiresAt },
      });
      return response(200, { ok: true, lease: { id: renewed.id, state: renewed.state, heartbeatAt: renewed.heartbeatAt, expiresAt: renewed.expiresAt }, canLaunchWorker: false });
    },

    async health(request: Request): Promise<Response> {
      const rawBody = request.method === "GET" ? "" : await request.text();
      const auth = await authenticate(request, rawBody, text(request.headers.get("x-correlation-id")) || "airship-online-builder-worker-health");
      if (!auth.ok) return auth.response;
      const heartbeat = await repository.heartbeats.readLatestForWorker(auth.worker.workerId);
      const leases = await repository.leases.listActiveLeases({ workerId: auth.worker.workerId, now: now().toISOString() });
      return response(200, {
        ok: true,
        workerId: auth.worker.workerId,
        contractVersion: auth.worker.contractVersion,
        deploymentMode: auth.worker.deploymentMode,
        heartbeat: heartbeat ? {
          observedAt: heartbeat.observedAt,
          workerStatus: heartbeat.workerStatus,
          activeSessionCount: heartbeat.activeSessionCount,
          processHealth: heartbeat.processHealth,
          cleanupHealth: heartbeat.cleanupHealth,
        } : null,
        activeLeaseCount: leases.length,
        activeLeases: leases.map((lease) => ({
          id: lease.id,
          sessionId: lease.sessionId,
          state: lease.state,
          heartbeatAt: lease.heartbeatAt,
          expiresAt: lease.expiresAt,
        })),
        exposesPublicEditorUrl: false,
        canLaunchWorker: false,
      });
    },
  };
}
