import crypto from "node:crypto";

import type {
  AirshipOnlineBuilderSessionRecord,
  AirshipOnlineBuilderSiteKey,
} from "./airship-online-builder-worker-contract";
import { sha256Hex } from "./airship-online-builder-worker-auth";

export type AirshipOnlineBuilderEditorGatewayFailureReason =
  | "editor_token_invalid"
  | "editor_token_expired"
  | "editor_token_wrong_owner"
  | "editor_token_wrong_session"
  | "editor_token_origin_not_allowed"
  | "editor_token_migration_mismatch"
  | "editor_token_site_mismatch";

export type AirshipOnlineBuilderEditorGatewayConfig = {
  gatewayBaseUrl: string;
  signingSecret: string;
  tokenTtlSeconds: number;
  allowedOrigins: string[];
};

export type AirshipOnlineBuilderEditorGatewayTokenClaims = {
  tokenId: string;
  sessionId: string;
  requestedByUserId: string;
  ownerOrganizationId: string;
  migrationId: string;
  siteKey: AirshipOnlineBuilderSiteKey;
  allowedOrigin: string;
  scope: "airship_online_builder_editor_session";
  issuedAt: string;
  expiresAt: string;
};

export type AirshipOnlineBuilderEditorGatewayTokenMetadata = {
  id: string;
  tokenHash: string;
  sessionId: string;
  requestedByUserId: string;
  ownerOrganizationId: string;
  migrationId: string;
  siteKey: AirshipOnlineBuilderSiteKey;
  allowedOrigin: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastVerifiedAt: string | null;
};

export type AirshipOnlineBuilderSignedEditorGatewayToken = {
  token: string;
  claims: AirshipOnlineBuilderEditorGatewayTokenClaims;
  metadata: AirshipOnlineBuilderEditorGatewayTokenMetadata;
  editorUrl: string;
};

export type AirshipOnlineBuilderEditorGatewayVerification =
  | { ok: true; claims: AirshipOnlineBuilderEditorGatewayTokenClaims; tokenHash: string }
  | { ok: false; failureReason: AirshipOnlineBuilderEditorGatewayFailureReason; diagnostics: string[] };

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function hmacSha256Base64url(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashAirshipOnlineBuilderEditorGatewayToken(token: string): string {
  return sha256Hex(`airship-online-builder-editor-gateway-token:v1:${token}`);
}

export function createAirshipOnlineBuilderSignedEditorGatewayToken(input: {
  session: AirshipOnlineBuilderSessionRecord;
  config: AirshipOnlineBuilderEditorGatewayConfig;
  requestedByUserId: string;
  ownerOrganizationId: string;
  origin: string;
  now: Date;
  tokenId: string;
}): AirshipOnlineBuilderSignedEditorGatewayToken {
  if (!input.config.allowedOrigins.includes(input.origin)) {
    throw new Error("airship_online_builder_editor_gateway_origin_not_allowed");
  }
  const issuedAt = input.now.toISOString();
  const expiresAt = new Date(input.now.getTime() + input.config.tokenTtlSeconds * 1000).toISOString();
  const claims: AirshipOnlineBuilderEditorGatewayTokenClaims = {
    tokenId: input.tokenId,
    sessionId: input.session.opaqueSessionId,
    requestedByUserId: input.requestedByUserId,
    ownerOrganizationId: input.ownerOrganizationId,
    migrationId: input.session.migrationId,
    siteKey: input.session.siteKey,
    allowedOrigin: input.origin,
    scope: "airship_online_builder_editor_session",
    issuedAt,
    expiresAt,
  };
  const payload = base64urlEncode(JSON.stringify(claims));
  const signature = hmacSha256Base64url(input.config.signingSecret, payload);
  const token = `aobe_${payload}.${signature}`;
  const tokenHash = hashAirshipOnlineBuilderEditorGatewayToken(token);
  return {
    token,
    claims,
    metadata: {
      id: input.tokenId,
      tokenHash,
      sessionId: claims.sessionId,
      requestedByUserId: claims.requestedByUserId,
      ownerOrganizationId: claims.ownerOrganizationId,
      migrationId: claims.migrationId,
      siteKey: claims.siteKey,
      allowedOrigin: claims.allowedOrigin,
      issuedAt,
      expiresAt,
      revokedAt: null,
      lastVerifiedAt: null,
    },
    editorUrl: `${input.config.gatewayBaseUrl.replace(/\/$/, "")}/editor/${encodeURIComponent(claims.sessionId)}?token=${encodeURIComponent(token)}`,
  };
}

export function verifyAirshipOnlineBuilderSignedEditorGatewayToken(input: {
  token: string;
  config: AirshipOnlineBuilderEditorGatewayConfig;
  expectedSessionId: string;
  expectedRequestedByUserId: string;
  expectedOwnerOrganizationId: string;
  expectedMigrationId: string;
  expectedSiteKey: AirshipOnlineBuilderSiteKey;
  origin: string;
  now: Date;
}): AirshipOnlineBuilderEditorGatewayVerification {
  if (!input.token.startsWith("aobe_")) {
    return { ok: false, failureReason: "editor_token_invalid", diagnostics: ["airship_online_builder_editor_token_prefix_invalid"] };
  }
  const unsigned = input.token.slice("aobe_".length);
  const [payload, signature] = unsigned.split(".", 2);
  if (!payload || !signature) {
    return { ok: false, failureReason: "editor_token_invalid", diagnostics: ["airship_online_builder_editor_token_shape_invalid"] };
  }
  const expectedSignature = hmacSha256Base64url(input.config.signingSecret, payload);
  if (!safeEqualText(signature, expectedSignature)) {
    return { ok: false, failureReason: "editor_token_invalid", diagnostics: ["airship_online_builder_editor_token_signature_invalid"] };
  }

  let claims: AirshipOnlineBuilderEditorGatewayTokenClaims;
  try {
    claims = JSON.parse(base64urlDecode(payload)) as AirshipOnlineBuilderEditorGatewayTokenClaims;
  } catch {
    return { ok: false, failureReason: "editor_token_invalid", diagnostics: ["airship_online_builder_editor_token_claims_invalid"] };
  }

  if (Date.parse(claims.expiresAt) <= input.now.getTime()) {
    return { ok: false, failureReason: "editor_token_expired", diagnostics: ["airship_online_builder_editor_token_expired"] };
  }
  if (claims.sessionId !== input.expectedSessionId) {
    return { ok: false, failureReason: "editor_token_wrong_session", diagnostics: ["airship_online_builder_editor_token_wrong_session"] };
  }
  if (claims.requestedByUserId !== input.expectedRequestedByUserId || claims.ownerOrganizationId !== input.expectedOwnerOrganizationId) {
    return { ok: false, failureReason: "editor_token_wrong_owner", diagnostics: ["airship_online_builder_editor_token_wrong_owner"] };
  }
  if (claims.allowedOrigin !== input.origin || !input.config.allowedOrigins.includes(input.origin)) {
    return { ok: false, failureReason: "editor_token_origin_not_allowed", diagnostics: ["airship_online_builder_editor_token_origin_not_allowed"] };
  }
  if (claims.migrationId !== input.expectedMigrationId) {
    return { ok: false, failureReason: "editor_token_migration_mismatch", diagnostics: ["airship_online_builder_editor_token_migration_mismatch"] };
  }
  if (claims.siteKey !== input.expectedSiteKey) {
    return { ok: false, failureReason: "editor_token_site_mismatch", diagnostics: ["airship_online_builder_editor_token_site_mismatch"] };
  }
  return { ok: true, claims, tokenHash: hashAirshipOnlineBuilderEditorGatewayToken(input.token) };
}
