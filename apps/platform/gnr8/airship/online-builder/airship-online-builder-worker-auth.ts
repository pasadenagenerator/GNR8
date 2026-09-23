import crypto from "node:crypto";

import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipOnlineBuilderDeploymentMode,
} from "./airship-online-builder-worker-contract";

export type AirshipOnlineBuilderWorkerCapability =
  | "create_session"
  | "status_readback"
  | "mint_editor_gateway_url"
  | "capture_diff"
  | "cleanup_session";

export type AirshipOnlineBuilderWorkerIdentity = {
  workerId: string;
  displayName: string;
  allowlisted: boolean;
  status: "active" | "disabled" | "rotating" | "revoked";
  deploymentMode: AirshipOnlineBuilderDeploymentMode;
  contractVersion: typeof AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION;
  capabilities: AirshipOnlineBuilderWorkerCapability[];
  version: {
    workerImageRef: string | null;
    airshipCliVersion: string | null;
    adapterVersion: "airship-adapter-20-worker-auth-lease-heartbeat-gateway:v1";
  };
  registeredAt: string;
  rotatedAt: string | null;
  lastAuthenticatedAt: string | null;
};

export type AirshipOnlineBuilderWorkerAuthTokenMetadata = {
  id: string;
  workerId: string;
  tokenId: string;
  tokenHash: string;
  hashAlgorithm: "sha256";
  status: "active" | "rotating" | "revoked" | "expired";
  audience: "gnr8-airship-online-builder-control-plane";
  issuedAt: string;
  expiresAt: string;
  rotatedAt: string | null;
  replacedByTokenId: string | null;
  lastUsedAt: string | null;
};

export type AirshipOnlineBuilderWorkerBearerToken = {
  tokenId: string;
  plaintextToken: string;
  authorizationHeader: string;
};

export type AirshipOnlineBuilderWorkerAuthFailureReason =
  | "authorization_header_missing"
  | "authorization_scheme_invalid"
  | "token_shape_invalid"
  | "token_not_found"
  | "token_hash_mismatch"
  | "token_not_active"
  | "token_expired"
  | "worker_not_allowlisted"
  | "worker_contract_version_unsupported";

export type AirshipOnlineBuilderWorkerAuthVerification =
  | {
    ok: true;
    worker: AirshipOnlineBuilderWorkerIdentity;
    token: AirshipOnlineBuilderWorkerAuthTokenMetadata;
    auditEventType: "worker_auth_success";
  }
  | {
    ok: false;
    failureReason: AirshipOnlineBuilderWorkerAuthFailureReason;
    diagnostics: string[];
    auditEventType: "worker_auth_failure";
  };

export type AirshipOnlineBuilderSignedWorkerRequest = {
  workerId: string;
  method: string;
  path: string;
  bodySha256: string;
  timestamp: string;
  nonce: string;
  signature: string;
};

export type AirshipOnlineBuilderSignedWorkerRequestFailureReason =
  | "request_timestamp_invalid"
  | "request_expired"
  | "request_nonce_replayed"
  | "request_signature_invalid";

export type AirshipOnlineBuilderSignedWorkerRequestVerification =
  | { ok: true; replayKey: string }
  | { ok: false; failureReason: AirshipOnlineBuilderSignedWorkerRequestFailureReason; diagnostics: string[] };

const TOKEN_PATTERN = /^aobw_([A-Za-z0-9_-]{8,64})\.([A-Za-z0-9_-]{24,160})$/;

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmacSha256Hex(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildAirshipOnlineBuilderWorkerBearerToken(input: {
  tokenId: string;
  secret: string;
}): AirshipOnlineBuilderWorkerBearerToken {
  const plaintextToken = `aobw_${input.tokenId}.${input.secret}`;
  return {
    tokenId: input.tokenId,
    plaintextToken,
    authorizationHeader: `Bearer ${plaintextToken}`,
  };
}

export function hashAirshipOnlineBuilderWorkerBearerToken(plaintextToken: string): string {
  return sha256Hex(`airship-online-builder-worker-token:v1:${plaintextToken}`);
}

export function parseAirshipOnlineBuilderWorkerBearerToken(authorizationHeader: string): AirshipOnlineBuilderWorkerBearerToken | null {
  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme !== "Bearer" || !token) return null;
  const match = TOKEN_PATTERN.exec(token);
  if (!match) return null;
  return {
    tokenId: match[1],
    plaintextToken: token,
    authorizationHeader: `Bearer ${token}`,
  };
}

export function verifyAirshipOnlineBuilderWorkerBearerToken(input: {
  authorizationHeader: string | null;
  worker: AirshipOnlineBuilderWorkerIdentity | null;
  token: AirshipOnlineBuilderWorkerAuthTokenMetadata | null;
  now: Date;
}): AirshipOnlineBuilderWorkerAuthVerification {
  if (!input.authorizationHeader) {
    return { ok: false, failureReason: "authorization_header_missing", diagnostics: ["airship_online_builder_worker_authorization_header_missing"], auditEventType: "worker_auth_failure" };
  }
  if (!input.authorizationHeader.startsWith("Bearer ")) {
    return { ok: false, failureReason: "authorization_scheme_invalid", diagnostics: ["airship_online_builder_worker_authorization_scheme_invalid"], auditEventType: "worker_auth_failure" };
  }
  const parsed = parseAirshipOnlineBuilderWorkerBearerToken(input.authorizationHeader);
  if (!parsed) {
    return { ok: false, failureReason: "token_shape_invalid", diagnostics: ["airship_online_builder_worker_token_shape_invalid"], auditEventType: "worker_auth_failure" };
  }
  if (!input.token || input.token.tokenId !== parsed.tokenId) {
    return { ok: false, failureReason: "token_not_found", diagnostics: ["airship_online_builder_worker_token_not_found"], auditEventType: "worker_auth_failure" };
  }
  if (!safeEqualHex(input.token.tokenHash, hashAirshipOnlineBuilderWorkerBearerToken(parsed.plaintextToken))) {
    return { ok: false, failureReason: "token_hash_mismatch", diagnostics: ["airship_online_builder_worker_token_hash_mismatch"], auditEventType: "worker_auth_failure" };
  }
  if (input.token.status !== "active") {
    return { ok: false, failureReason: "token_not_active", diagnostics: [`airship_online_builder_worker_token_not_active:${input.token.status}`], auditEventType: "worker_auth_failure" };
  }
  if (Date.parse(input.token.expiresAt) <= input.now.getTime()) {
    return { ok: false, failureReason: "token_expired", diagnostics: ["airship_online_builder_worker_token_expired"], auditEventType: "worker_auth_failure" };
  }
  if (!input.worker || !input.worker.allowlisted || input.worker.status !== "active") {
    return { ok: false, failureReason: "worker_not_allowlisted", diagnostics: ["airship_online_builder_worker_not_allowlisted"], auditEventType: "worker_auth_failure" };
  }
  if (input.worker.contractVersion !== AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION) {
    return { ok: false, failureReason: "worker_contract_version_unsupported", diagnostics: ["airship_online_builder_worker_contract_version_unsupported"], auditEventType: "worker_auth_failure" };
  }
  return {
    ok: true,
    worker: input.worker,
    token: input.token,
    auditEventType: "worker_auth_success",
  };
}

export function signAirshipOnlineBuilderWorkerRequest(input: {
  workerId: string;
  method: string;
  path: string;
  bodySha256: string;
  timestamp: string;
  nonce: string;
  signingSecret: string;
}): AirshipOnlineBuilderSignedWorkerRequest {
  const payload = [
    input.workerId,
    input.method.toUpperCase(),
    input.path,
    input.bodySha256,
    input.timestamp,
    input.nonce,
  ].join("\n");
  return {
    workerId: input.workerId,
    method: input.method.toUpperCase(),
    path: input.path,
    bodySha256: input.bodySha256,
    timestamp: input.timestamp,
    nonce: input.nonce,
    signature: hmacSha256Hex(input.signingSecret, payload),
  };
}

export function verifyAirshipOnlineBuilderSignedWorkerRequest(input: {
  request: AirshipOnlineBuilderSignedWorkerRequest;
  signingSecret: string;
  now: Date;
  maxSkewSeconds: number;
  seenNonces: ReadonlySet<string>;
}): AirshipOnlineBuilderSignedWorkerRequestVerification {
  const timestampMs = Date.parse(input.request.timestamp);
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, failureReason: "request_timestamp_invalid", diagnostics: ["airship_online_builder_worker_request_timestamp_invalid"] };
  }
  if (Math.abs(input.now.getTime() - timestampMs) > input.maxSkewSeconds * 1000) {
    return { ok: false, failureReason: "request_expired", diagnostics: ["airship_online_builder_worker_request_expired"] };
  }
  const replayKey = `${input.request.workerId}:${input.request.nonce}`;
  if (input.seenNonces.has(replayKey)) {
    return { ok: false, failureReason: "request_nonce_replayed", diagnostics: ["airship_online_builder_worker_request_nonce_replayed"] };
  }
  const expected = signAirshipOnlineBuilderWorkerRequest({ ...input.request, signingSecret: input.signingSecret }).signature;
  if (!safeEqualHex(expected, input.request.signature)) {
    return { ok: false, failureReason: "request_signature_invalid", diagnostics: ["airship_online_builder_worker_request_signature_invalid"] };
  }
  return { ok: true, replayKey };
}
