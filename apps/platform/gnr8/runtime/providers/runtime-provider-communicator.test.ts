import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRuntimeProviderCommunication,
  resolveRuntimeProviderCommunications,
  type RuntimeProviderCommunicatorRequest,
} from "@/gnr8/runtime/providers/runtime-provider-communicator";

function buildRequest(input: Partial<RuntimeProviderCommunicatorRequest>): RuntimeProviderCommunicatorRequest {
  return {
    providerId: "manual",
    environment: "sandbox",
    operationKind: "upsert_dns_record",
    capability: "dns",
    ...input,
  };
}

test("runtime provider communicator: manual route", () => {
  const result = resolveRuntimeProviderCommunication(
    buildRequest({
      providerId: "manual",
    }),
  );

  assert.equal(result.routeStatus, "manual");
  assert.equal(result.adapterAvailable, true);
  assert.deepEqual(result.warnings, ["manual_provider_selected"]);
  assert.deepEqual(result.blockers, []);
});

test("runtime provider communicator: mock route", () => {
  const result = resolveRuntimeProviderCommunication(
    buildRequest({
      providerId: "mock_provider",
      environment: "sandbox",
    }),
  );

  assert.equal(result.routeStatus, "resolved");
  assert.equal(result.adapterAvailable, true);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.blockers, []);
});

test("runtime provider communicator: openprovider sandbox route resolves", () => {
  const result = resolveRuntimeProviderCommunication(
    buildRequest({
      providerId: "openprovider",
      environment: "sandbox",
    }),
  );

  assert.equal(result.routeStatus, "resolved");
  assert.equal(result.adapterAvailable, true);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.blockers, []);
});

test("runtime provider communicator: live blocked", () => {
  const result = resolveRuntimeProviderCommunication(
    buildRequest({
      providerId: "mock_provider",
      environment: "live",
    }),
  );

  assert.equal(result.routeStatus, "blocked");
  assert.equal(result.adapterAvailable, true);
  assert.deepEqual(result.blockers, ["live_environment_provider_execution_blocked"]);
});

test("runtime provider communicator: deterministic ordering", () => {
  const requests: RuntimeProviderCommunicatorRequest[] = [
    buildRequest({ providerId: "mock_provider", environment: "live", operationKind: "verify_record" }),
    buildRequest({ providerId: "manual", environment: "contract", operationKind: "manual_instruction" }),
    buildRequest({ providerId: "openprovider", environment: "sandbox", operationKind: "upsert_dns_record" }),
    buildRequest({ providerId: "mock_provider", environment: "sandbox", operationKind: "check_domain_availability" }),
  ];

  const left = resolveRuntimeProviderCommunications(requests);
  const right = resolveRuntimeProviderCommunications([...requests].reverse());

  assert.deepEqual(
    left.map((result) => [result.providerId, result.environment, result.operationKind, result.routeStatus]),
    right.map((result) => [result.providerId, result.environment, result.operationKind, result.routeStatus]),
  );
});

test("runtime provider communicator: stable key", () => {
  const first = resolveRuntimeProviderCommunication(
    buildRequest({
      providerId: "manual",
      environment: "sandbox",
      operationKind: "upsert_dns_record",
    }),
  );

  const second = resolveRuntimeProviderCommunication(
    buildRequest({
      providerId: "manual",
      environment: "sandbox",
      operationKind: "upsert_dns_record",
    }),
  );

  assert.equal(first.correlationKey, second.correlationKey);
});
