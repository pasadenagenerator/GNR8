import assert from "node:assert/strict";
import test from "node:test";

import {
  ResolveCurrentClientError,
  selectCurrentClientMembership,
  type CurrentUserClientMembership,
} from "@/src/auth/resolve-current-client";

const CLIENT_ACCESS_A: CurrentUserClientMembership = {
  client_id: "00000000-0000-4000-8000-000000000101",
  client_name: "Client Alpha",
  agency_id: "00000000-0000-4000-8000-000000000011",
  agency_name: "Agency Alpha",
  role: "owner",
};

const CLIENT_ACCESS_B: CurrentUserClientMembership = {
  client_id: "00000000-0000-4000-8000-000000000202",
  client_name: "Client Bravo",
  agency_id: "00000000-0000-4000-8000-000000000011",
  agency_name: "Agency Alpha",
  role: "member",
};

test("selectCurrentClientMembership resolves a single explicit client access automatically", () => {
  const selected = selectCurrentClientMembership({
    memberships: [CLIENT_ACCESS_A],
  });

  assert.deepEqual(selected, CLIENT_ACCESS_A);
});

test("selectCurrentClientMembership fails closed when there is no explicit client access", () => {
  assert.throws(
    () => {
      selectCurrentClientMembership({ memberships: [] });
    },
    (error) => error instanceof ResolveCurrentClientError && error.code === "NO_MEMBERSHIP",
  );
});

test("selectCurrentClientMembership fails closed when multiple clients exist without explicit selection", () => {
  assert.throws(
    () => {
      selectCurrentClientMembership({
        memberships: [CLIENT_ACCESS_A, CLIENT_ACCESS_B],
      });
    },
    (error) => error instanceof ResolveCurrentClientError && error.code === "ACTIVE_CLIENT_REQUIRED",
  );
});

test("selectCurrentClientMembership resolves explicit selected client when valid", () => {
  const selected = selectCurrentClientMembership({
    memberships: [CLIENT_ACCESS_A, CLIENT_ACCESS_B],
    activeClientId: CLIENT_ACCESS_B.client_id,
  });

  assert.deepEqual(selected, CLIENT_ACCESS_B);
});

test("selectCurrentClientMembership fails closed when selected client is invalid", () => {
  assert.throws(
    () => {
      selectCurrentClientMembership({
        memberships: [CLIENT_ACCESS_A, CLIENT_ACCESS_B],
        activeClientId: "00000000-0000-4000-8000-000000000999",
      });
    },
    (error) => error instanceof ResolveCurrentClientError && error.code === "ACTIVE_CLIENT_INVALID",
  );
});
