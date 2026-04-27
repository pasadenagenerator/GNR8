import assert from "node:assert/strict";
import test from "node:test";

import { buildVercelUrl, getVercelConfig } from "@/src/lib/vercel/vercel-api";
import { addDomainToVercel, checkDomainStatus } from "@/src/lib/vercel/vercel-domain-client";

type MutableGlobal = typeof globalThis & {
  fetch: typeof fetch;
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("buildVercelUrl omits teamId when VERCEL_TEAM_ID is missing", () => {
  const out = buildVercelUrl("/v10/projects/project_123/domains", undefined, {
    VERCEL_API_TOKEN: "token",
    VERCEL_PROJECT_ID_PLATFORM: "project_123",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(out, "https://api.vercel.com/v10/projects/project_123/domains");
  assert.equal(new URL(out).searchParams.has("teamId"), false);
});

test("buildVercelUrl omits teamId when VERCEL_TEAM_ID is blank", () => {
  const out = buildVercelUrl("/v10/projects/project_123/domains", undefined, {
    VERCEL_API_TOKEN: "token",
    VERCEL_PROJECT_ID_PLATFORM: "project_123",
    VERCEL_TEAM_ID: "   ",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(out, "https://api.vercel.com/v10/projects/project_123/domains");
  assert.equal(new URL(out).searchParams.has("teamId"), false);
});

test("buildVercelUrl includes teamId when configured", () => {
  const out = buildVercelUrl("/v10/projects/project_123/domains", undefined, {
    VERCEL_API_TOKEN: "token",
    VERCEL_PROJECT_ID_PLATFORM: "project_123",
    VERCEL_TEAM_ID: "team_123",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(out, "https://api.vercel.com/v10/projects/project_123/domains?teamId=team_123");
});

test("buildVercelUrl combines teamId and additional query params without duplicates", () => {
  const out = buildVercelUrl(
    "/v10/projects/project_123/domains",
    {
      page: "2",
      search: "  beauty-clinic ",
      empty: "   ",
      ignored: undefined,
    },
    {
      VERCEL_API_TOKEN: "token",
      VERCEL_PROJECT_ID_PLATFORM: "project_123",
      VERCEL_TEAM_ID: "team_123",
    } as unknown as NodeJS.ProcessEnv,
  );

  const url = new URL(out);
  assert.equal(url.searchParams.get("teamId"), "team_123");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("search"), "beauty-clinic");
  assert.equal(url.searchParams.has("empty"), false);
  assert.equal(url.searchParams.getAll("teamId").length, 1);
});

test("getVercelConfig throws when API token is missing", () => {
  assert.throws(
    () =>
      getVercelConfig({
        VERCEL_PROJECT_ID_PLATFORM: "project_123",
      } as unknown as NodeJS.ProcessEnv),
    (error: unknown) => {
      assert.equal((error as Error).message, "VERCEL_CONFIG_MISSING_API_TOKEN");
      return true;
    },
  );
});

test("getVercelConfig throws when project id is missing", () => {
  assert.throws(
    () =>
      getVercelConfig({
        VERCEL_API_TOKEN: "token",
      } as unknown as NodeJS.ProcessEnv),
    (error: unknown) => {
      assert.equal((error as Error).message, "VERCEL_CONFIG_MISSING_PROJECT_ID");
      return true;
    },
  );
});

test("addDomainToVercel returns added outcome on success", async () => {
  const global = globalThis as MutableGlobal;
  const previousFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "https://api.vercel.com/v10/projects/project_123/domains?teamId=team_123");
    assert.equal(init?.method, "POST");
    assert.equal(String(init?.body), '{"name":"beauty-clinic.example.com"}');
    assert.equal((init?.headers as Record<string, string>)?.Authorization, "Bearer token");
    return jsonResponse(200, { id: "dom_1" });
  }) as typeof fetch;

  try {
    const out = await addDomainToVercel("https://beauty-clinic.example.com/path", {
      VERCEL_API_TOKEN: "token",
      VERCEL_PROJECT_ID_PLATFORM: "project_123",
      VERCEL_TEAM_ID: "team_123",
    } as unknown as NodeJS.ProcessEnv);

    assert.deepEqual(out, {
      outcome: "added",
      domainId: "dom_1",
    });
  } finally {
    global.fetch = previousFetch;
  }
});

test("addDomainToVercel personal mode keeps URL free of teamId", async () => {
  const global = globalThis as MutableGlobal;
  const previousFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), "https://api.vercel.com/v10/projects/project_123/domains");
    return jsonResponse(200, { id: "dom_2" });
  }) as typeof fetch;

  try {
    const out = await addDomainToVercel("beauty-clinic.example.com", {
      VERCEL_API_TOKEN: "token",
      VERCEL_PROJECT_ID_PLATFORM: "project_123",
      VERCEL_TEAM_ID: "   ",
    } as unknown as NodeJS.ProcessEnv);

    assert.equal(out.domainId, "dom_2");
  } finally {
    global.fetch = previousFetch;
  }
});

test("addDomainToVercel treats already-exists as success", async () => {
  const global = globalThis as MutableGlobal;
  const previousFetch = global.fetch;

  global.fetch = (async () => jsonResponse(409, { error: "Domain already exists" })) as typeof fetch;

  try {
    const out = await addDomainToVercel("beauty-clinic.example.com", {
      VERCEL_API_TOKEN: "token",
      VERCEL_PROJECT_ID_PLATFORM: "project_123",
    } as unknown as NodeJS.ProcessEnv);

    assert.equal(out.outcome, "already_exists");
  } finally {
    global.fetch = previousFetch;
  }
});

test("checkDomainStatus maps verification details for cname", async () => {
  const global = globalThis as MutableGlobal;
  const previousFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), "https://api.vercel.com/v9/projects/project_123/domains/beauty-clinic.example.com");
    return jsonResponse(200, {
      id: "dom_1",
      apexName: "example.com",
      verified: false,
      verification: [
        {
          type: "CNAME",
          domain: "beauty-clinic.example.com",
          value: "cname.vercel-dns.com",
        },
      ],
    });
  }) as typeof fetch;

  try {
    const out = await checkDomainStatus("beauty-clinic.example.com", {
      VERCEL_API_TOKEN: "token",
      VERCEL_PROJECT_ID_PLATFORM: "project_123",
    } as unknown as NodeJS.ProcessEnv);

    assert.equal(out.status, "verifying");
    assert.equal(out.verification?.type, "cname");
    assert.equal(out.verification?.host, "beauty-clinic");
    assert.equal(out.verification?.value, "cname.vercel-dns.com");
  } finally {
    global.fetch = previousFetch;
  }
});

test("checkDomainStatus returns active when verified", async () => {
  const global = globalThis as MutableGlobal;
  const previousFetch = global.fetch;

  global.fetch = (async () =>
    jsonResponse(200, {
      id: "dom_1",
      verified: true,
      verification: [],
    })) as typeof fetch;

  try {
    const out = await checkDomainStatus("beauty-clinic.example.com", {
      VERCEL_API_TOKEN: "token",
      VERCEL_PROJECT_ID_PLATFORM: "project_123",
    } as unknown as NodeJS.ProcessEnv);

    assert.equal(out.status, "active");
    assert.equal(out.verification, null);
  } finally {
    global.fetch = previousFetch;
  }
});
