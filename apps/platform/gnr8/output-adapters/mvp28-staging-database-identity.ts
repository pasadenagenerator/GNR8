export const MVP28_STAGING_PROJECT_REF = "dpkdxllcxnlytgjbnmvp";

const STAGING_SUPABASE_HOST = `${MVP28_STAGING_PROJECT_REF}.supabase.co`;
const STAGING_POOLER_HOST = "aws-1-eu-central-2.pooler.supabase.com";
const STAGING_DIRECT_HOST = `db.${MVP28_STAGING_PROJECT_REF}.supabase.co`;
const STAGING_DATABASE_NAME = "postgres";
const STAGING_DATABASE_ROLE = "postgres";
const STAGING_POOLER_LOGIN = `${STAGING_DATABASE_ROLE}.${MVP28_STAGING_PROJECT_REF}`;

export type Mvp28StagingConnectionKind = "shared_session_pooler" | "direct";

export function assertMvp28StagingConnectionConfiguration(input: {
  supabaseUrl: string;
  databaseUrl: string;
}): Mvp28StagingConnectionKind {
  let supabaseUrl: URL;
  let databaseUrl: URL;
  try {
    supabaseUrl = new URL(input.supabaseUrl);
    databaseUrl = new URL(input.databaseUrl);
  } catch {
    throw new Error("mvp28_wrong_staging_target");
  }

  if (
    supabaseUrl.protocol !== "https:" ||
    supabaseUrl.hostname !== STAGING_SUPABASE_HOST ||
    supabaseUrl.port !== "" ||
    supabaseUrl.username !== "" ||
    supabaseUrl.password !== ""
  ) {
    throw new Error("mvp28_wrong_staging_target");
  }

  if (
    (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") ||
    databaseUrl.port !== "5432" ||
    databaseUrl.pathname !== `/${STAGING_DATABASE_NAME}` ||
    databaseUrl.search !== "" ||
    databaseUrl.hash !== "" ||
    !databaseUrl.password
  ) {
    throw new Error("mvp28_wrong_staging_target");
  }

  const login = decodeURIComponent(databaseUrl.username);
  if (databaseUrl.hostname === STAGING_POOLER_HOST && login === STAGING_POOLER_LOGIN) {
    return "shared_session_pooler";
  }
  if (databaseUrl.hostname === STAGING_DIRECT_HOST && login === STAGING_DATABASE_ROLE) {
    return "direct";
  }
  throw new Error("mvp28_wrong_staging_target");
}

export function assertMvp28EffectiveDatabaseIdentity(input: {
  databaseName: string | undefined;
  databaseUser: string | undefined;
}): void {
  if (input.databaseName !== STAGING_DATABASE_NAME || input.databaseUser !== STAGING_DATABASE_ROLE) {
    throw new Error("mvp28_database_identity_mismatch");
  }
}
