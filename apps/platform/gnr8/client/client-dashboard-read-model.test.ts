import assert from "node:assert/strict";
import test from "node:test";

import { assertClientOrganizationScope, assertClientScopedSiteRows } from "@/gnr8/client/client-dashboard-read-model";

const AGENCY_ID = "00000000-0000-4000-8000-000000000011";
const CLIENT_ID = "00000000-0000-4000-8000-000000000101";

test("assertClientOrganizationScope allows client linked to the expected agency", () => {
  assert.doesNotThrow(() => {
    assertClientOrganizationScope({
      clientOrg: {
        id: CLIENT_ID,
        agency_id: AGENCY_ID,
        organization_type: "client",
      },
      expectedClientId: CLIENT_ID,
      expectedAgencyId: AGENCY_ID,
    });
  });
});

test("assertClientOrganizationScope fails closed when client is linked to a different agency", () => {
  assert.throws(
    () => {
      assertClientOrganizationScope({
        clientOrg: {
          id: CLIENT_ID,
          agency_id: "00000000-0000-4000-8000-000000000099",
          organization_type: "client",
        },
        expectedClientId: CLIENT_ID,
        expectedAgencyId: AGENCY_ID,
      });
    },
    /resolved parent agency/i,
  );
});

test("assertClientScopedSiteRows allows site rows inside resolved client scope", () => {
  assert.doesNotThrow(() => {
    assertClientScopedSiteRows({
      sites: [
        {
          id: "00000000-0000-4000-8000-000000009001",
          domain: "alpha.example.com",
          status: "live",
          agency_id: AGENCY_ID,
          org_id: CLIENT_ID,
        },
      ],
      expectedClientId: CLIENT_ID,
      expectedAgencyId: AGENCY_ID,
    });
  });
});

test("assertClientScopedSiteRows fails closed on cross-client leakage even inside same agency", () => {
  assert.throws(
    () => {
      assertClientScopedSiteRows({
        sites: [
          {
            id: "00000000-0000-4000-8000-000000009001",
            domain: "alpha.example.com",
            status: "live",
            agency_id: AGENCY_ID,
            org_id: "00000000-0000-4000-8000-000000000202",
          },
        ],
        expectedClientId: CLIENT_ID,
        expectedAgencyId: AGENCY_ID,
      });
    },
    /client scoping violation/i,
  );
});
