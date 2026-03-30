import assert from "node:assert/strict";
import test from "node:test";

import { AgencyProvisioningError, buildOrganizationInsertPayload } from "@/gnr8/agency/agency-provisioning-service";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("buildOrganizationInsertPayload creates explicit id for agency organization inserts", () => {
  const payload = buildOrganizationInsertPayload({
    name: "Acme Agency",
    agencyId: AGENCY_ID,
    organizationType: "agency",
  });

  assert.equal(UUID_RE.test(payload.id), true);
  assert.equal(payload.name, "Acme Agency");
  assert.equal(payload.agency_id, AGENCY_ID);
  assert.equal(payload.organization_type, "agency");
});

test("buildOrganizationInsertPayload creates explicit id for client organization inserts", () => {
  const payload = buildOrganizationInsertPayload({
    name: "Client One",
    agencyId: AGENCY_ID,
    organizationType: "client",
  });

  assert.equal(UUID_RE.test(payload.id), true);
  assert.equal(payload.name, "Client One");
  assert.equal(payload.agency_id, AGENCY_ID);
  assert.equal(payload.organization_type, "client");
});

test("buildOrganizationInsertPayload rejects invalid agency ids", () => {
  assert.throws(
    () => {
      buildOrganizationInsertPayload({
        name: "Acme Agency",
        agencyId: "not-a-uuid",
        organizationType: "agency",
      });
    },
    (error) => error instanceof AgencyProvisioningError && error.message === "agencyId must be a valid UUID",
  );
});

test("buildOrganizationInsertPayload rejects blank organization names", () => {
  assert.throws(
    () => {
      buildOrganizationInsertPayload({
        name: "   ",
        agencyId: AGENCY_ID,
        organizationType: "client",
      });
    },
    (error) => error instanceof AgencyProvisioningError && error.message === "organization name is required",
  );
});
