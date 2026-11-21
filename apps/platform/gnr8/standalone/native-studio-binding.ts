import 'server-only';
import { configuration } from '../../../../scripts/stacki/prepare-native-studio.mjs';

/** Deployment-owned bindings only. Never derive an editor host from imported URLs.
 * Callers must first resolve the site through the existing agency/client ownership checks.
 */
export function readNativeStudioBinding(siteId: string, source = process.env.GNR8_NATIVE_STUDIO_SITES) {
  let bindings: Record<string, unknown>;
  try { bindings = JSON.parse(source ?? '{}'); }
  catch { throw Error('native_studio_binding_invalid'); }
  const site = bindings?.[siteId] as Record<string, string> | undefined;
  if (!site || site.siteId !== siteId) throw Error('native_studio_binding_missing');
  try { return configuration(site).site as Record<string, string>; }
  catch { throw Error('native_studio_binding_invalid'); }
}

export function nativeStudioUrl(siteId: string, source = process.env.GNR8_NATIVE_STUDIO_SITES): string | null {
  try { return `${readNativeStudioBinding(siteId, source).studioOrigin}/studio`; }
  catch { return null; }
}
