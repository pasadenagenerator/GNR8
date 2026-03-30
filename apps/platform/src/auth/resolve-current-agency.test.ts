import assert from "node:assert/strict";
import test from "node:test";

import {
  ResolveCurrentAgencyError,
  selectCurrentAgencyMembership,
  type CurrentUserAgencyMembership,
} from "@/src/auth/resolve-current-agency";

const MEMBERSHIP_A: CurrentUserAgencyMembership = {
  agency_id: "00000000-0000-4000-8000-000000000011",
  agency_name: "Agency Alpha",
  role: "owner",
};

const MEMBERSHIP_B: CurrentUserAgencyMembership = {
  agency_id: "00000000-0000-4000-8000-000000000022",
  agency_name: "Agency Bravo",
  role: "admin",
};

test("selectCurrentAgencyMembership resolves single membership automatically", () => {
  const selected = selectCurrentAgencyMembership({
    memberships: [MEMBERSHIP_A],
  });

  assert.deepEqual(selected, MEMBERSHIP_A);
});

test("selectCurrentAgencyMembership fails closed when there are no memberships", () => {
  assert.throws(
    () => {
      selectCurrentAgencyMembership({ memberships: [] });
    },
    (error) => error instanceof ResolveCurrentAgencyError && error.code === "NO_MEMBERSHIP",
  );
});

test("selectCurrentAgencyMembership fails closed when multiple memberships exist but active agency is not selected", () => {
  assert.throws(
    () => {
      selectCurrentAgencyMembership({ memberships: [MEMBERSHIP_A, MEMBERSHIP_B] });
    },
    (error) => error instanceof ResolveCurrentAgencyError && error.code === "ACTIVE_AGENCY_REQUIRED",
  );
});

test("selectCurrentAgencyMembership resolves requested active agency when it is valid", () => {
  const selected = selectCurrentAgencyMembership({
    memberships: [MEMBERSHIP_A, MEMBERSHIP_B],
    activeAgencyId: MEMBERSHIP_B.agency_id,
  });

  assert.deepEqual(selected, MEMBERSHIP_B);
});

test("selectCurrentAgencyMembership fails closed when active agency is invalid", () => {
  assert.throws(
    () => {
      selectCurrentAgencyMembership({
        memberships: [MEMBERSHIP_A, MEMBERSHIP_B],
        activeAgencyId: "00000000-0000-4000-8000-000000000099",
      });
    },
    (error) => error instanceof ResolveCurrentAgencyError && error.code === "ACTIVE_AGENCY_INVALID",
  );
});
