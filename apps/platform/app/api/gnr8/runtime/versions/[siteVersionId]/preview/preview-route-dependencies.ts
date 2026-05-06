import { renderSiteVersionPreview } from "@/gnr8/runtime/unified-render-preview";
import { requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { injectRuntimeDebugPanel } from "@/src/public-site/raw-template-runtime";
import { canShowContentDebug } from "@/src/public-site/content-debug-access";

export type PreviewRouteDependencies = {
  canShowContentDebug: typeof canShowContentDebug;
  resolveAgencyIdForSiteVersion: typeof resolveAgencyIdForSiteVersion;
  requireAgencyActionContext: typeof requireAgencyActionContext;
  renderSiteVersionPreview: typeof renderSiteVersionPreview;
  injectRuntimeDebugPanel: typeof injectRuntimeDebugPanel;
};

export const previewRouteDependencies: PreviewRouteDependencies = {
  canShowContentDebug,
  resolveAgencyIdForSiteVersion,
  requireAgencyActionContext,
  renderSiteVersionPreview,
  injectRuntimeDebugPanel,
};

export function setPreviewRouteDependenciesForTest(overrides: Partial<PreviewRouteDependencies>): () => void {
  const previous = { ...previewRouteDependencies };
  Object.assign(previewRouteDependencies, overrides);
  return () => {
    Object.assign(previewRouteDependencies, previous);
  };
}
