function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function readTeamId(env: NodeJS.ProcessEnv): string | null {
  const teamId = normalizeText(env.VERCEL_TEAM_ID);
  return teamId || null;
}

export function buildVercelUrl(
  path: string,
  query?: Record<string, string | undefined>,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base = `https://api.vercel.com${path}`;
  const params = new URLSearchParams();

  const teamId = readTeamId(env);
  if (teamId) {
    params.set("teamId", teamId);
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      const normalizedValue = normalizeText(value);
      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    }
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getVercelConfig(env: NodeJS.ProcessEnv = process.env): {
  token: string;
  projectId: string;
  teamId: string | null;
} {
  const token = normalizeText(env.VERCEL_API_TOKEN);
  const projectId = normalizeText(env.VERCEL_PROJECT_ID_PLATFORM);
  const teamId = readTeamId(env);

  if (!token) {
    throw new Error("VERCEL_CONFIG_MISSING_API_TOKEN");
  }

  if (!projectId) {
    throw new Error("VERCEL_CONFIG_MISSING_PROJECT_ID");
  }

  console.info("VERCEL_CONFIG_RESOLVED", {
    hasProjectId: Boolean(projectId),
    teamIdConfigured: Boolean(teamId),
  });

  if (teamId) {
    console.info("VERCEL_MODE_TEAM");
  } else {
    console.info("VERCEL_MODE_PERSONAL");
  }

  return {
    token,
    projectId,
    teamId,
  };
}

export async function vercelFetch(
  url: string,
  options: RequestInit = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<Response> {
  const { token } = getVercelConfig(env);

  console.info("VERCEL_API_REQUEST", {
    url,
    method: options.method ?? "GET",
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    console.info("VERCEL_API_RESPONSE", {
      url,
      method: options.method ?? "GET",
      status: response.status,
      ok: response.ok,
    });

    return response;
  } catch (error) {
    console.error("VERCEL_API_ERROR", {
      url,
      method: options.method ?? "GET",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
