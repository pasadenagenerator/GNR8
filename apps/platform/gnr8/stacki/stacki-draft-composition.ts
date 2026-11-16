import "server-only";
import { requirePublicOutputVersion } from "../output-adapters/public-output-access";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";
import { createStackiPilotAuthorizer } from "./stacki-pilot-access";
import { configuredStackiStore, bootstrapStackiGithub } from './stacki-github-composition';

/**
 * Opt-in only. Reuses the current owner/admin site/version authorization and
 * private candidate bucket; never enables client/member editing implicitly.
 * Service credentials remain exclusively inside the GNR8 server.
 *
 * Activation requires GNR8_STACKI_DRAFTS_ENABLED=1 and the existing private
 * GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET to accept application/json and
 * application/octet-stream. Its policies must prohibit direct anonymous/client
 * access to both checkpoint and file-object prefixes. Before activation verify
 * list metadata.size/eTag for standard binary uploads in the actual bucket.
 * Both formats use the same sequential checkpoint keys; old deployments fail
 * closed after v2. Rollback must retain the dual reader or disable editing.
 * This task does not change bucket settings, policies, or environment values.
 * Pilot limits: 8 MiB decoded per checkpoint, 1 MiB per file, 64 revisions
 * per source version. No pruning, background autosave, or Sandbox launch here.
 */
export const authorizeConfiguredStackiPilot = createStackiPilotAuthorizer(
  scope => requirePublicOutputVersion(scope, scope.siteVersionId),
  () => process.env.GNR8_STACKI_PILOT_USER_ID,
);

export function createConfiguredStackiDraftRoutes() {
  return createStackiDraftRouteHandlers({
    enabled: () => process.env.GNR8_STACKI_DRAFTS_ENABLED === "1",
    authorize: authorizeConfiguredStackiPilot,
    source: async scope => (await import("./stacki-source-composition")).loadConfiguredStackiSource(scope),
    store: configuredStackiStore,
    bootstrap: bootstrapStackiGithub,
  });
}
