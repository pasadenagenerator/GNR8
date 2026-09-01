import { renderSiteVersionPreview } from "@/gnr8/runtime/unified-render-preview";
import { requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForPreviewSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { injectRuntimeDebugPanel } from "@/src/public-site/raw-template-runtime";
import { canShowContentDebug } from "@/src/public-site/content-debug-access";
import { getSuperadminPool } from "@/src/superadmin/db";
import type { RuntimeStoreDbClient } from "@/gnr8/runtime/runtime-store";

export type PreviewRouteDependencies = {
  canShowContentDebug: typeof canShowContentDebug;
  resolveAgencyIdForSiteVersion: typeof resolveAgencyIdForPreviewSiteVersion;
  requireAgencyActionContext: typeof requireAgencyActionContext;
  renderSiteVersionPreview: typeof renderSiteVersionPreview;
  injectRuntimeDebugPanel: typeof injectRuntimeDebugPanel;
  acquireRuntimeDbClient: () => Promise<RuntimeStoreDbClient>;
};

export const previewRouteDependencies: PreviewRouteDependencies = {
  canShowContentDebug,
  resolveAgencyIdForSiteVersion: resolveAgencyIdForPreviewSiteVersion,
  requireAgencyActionContext,
  renderSiteVersionPreview,
  injectRuntimeDebugPanel,
  acquireRuntimeDbClient: () => getSuperadminPool().connect(),
};

export function setPreviewRouteDependenciesForTest(overrides: Partial<PreviewRouteDependencies>): () => void {
  const previous = { ...previewRouteDependencies };
  Object.assign(previewRouteDependencies, overrides);
  return () => {
    Object.assign(previewRouteDependencies, previous);
  };
}
