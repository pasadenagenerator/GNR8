import {
  htmlStaticArtifactAdapterDescriptor,
  type Gnr8OutputAdapterId,
  type Gnr8SupportedSiteClass,
} from "./output-adapter-contract";
import { astroStaticSiteAdapterDescriptor } from "./astro-static-site-adapter";

export const GNR8_OUTPUT_ADAPTER_SELECTION_VERSION = "gnr8-output-adapter-selection:v1" as const;

export type OutputAdapterCapability =
  | "static_pages"
  | "local_assets"
  | "forms"
  | "scripts"
  | "application_state"
  | "checkout"
  | "inventory"
  | "account"
  | "platform_theme_runtime";

export type OutputAdapterSelection =
  | {
      status: "selected";
      adapterId: Gnr8OutputAdapterId;
      adapterVersion: typeof GNR8_OUTPUT_ADAPTER_SELECTION_VERSION;
      reason: "existing_generation_preserved" | "explicit_selection" | "new_supported_default";
    }
  | {
      status: "unsupported";
      adapterId: null;
      adapterVersion: typeof GNR8_OUTPUT_ADAPTER_SELECTION_VERSION;
      reason: "unsupported_capability" | "unsupported_site_class";
      unsupportedCapabilities: OutputAdapterCapability[];
    };

const ASTRO_UNSUPPORTED = new Set<OutputAdapterCapability>([
  "forms",
  "scripts",
  "application_state",
  "checkout",
  "inventory",
  "account",
  "platform_theme_runtime",
]);

export function selectOutputAdapter(input: {
  generationKind: "new" | "regeneration";
  siteClass: Gnr8SupportedSiteClass;
  requiredCapabilities: OutputAdapterCapability[];
  requestedAdapterId?: Gnr8OutputAdapterId | null;
  existingAdapterId?: Gnr8OutputAdapterId | null;
}): OutputAdapterSelection {
  const adapterVersion = GNR8_OUTPUT_ADAPTER_SELECTION_VERSION;
  if (input.generationKind === "regeneration" && !input.requestedAdapterId && input.existingAdapterId) {
    return { status: "selected", adapterId: input.existingAdapterId, adapterVersion, reason: "existing_generation_preserved" };
  }

  if (input.requestedAdapterId === htmlStaticArtifactAdapterDescriptor.id) {
    if (!htmlStaticArtifactAdapterDescriptor.supportedSiteClasses.includes(input.siteClass)) {
      return { status: "unsupported", adapterId: null, adapterVersion, reason: "unsupported_site_class", unsupportedCapabilities: [] };
    }
    return { status: "selected", adapterId: input.requestedAdapterId, adapterVersion, reason: "explicit_selection" };
  }

  const unsupportedCapabilities = [...new Set(input.requiredCapabilities.filter((capability) => ASTRO_UNSUPPORTED.has(capability)))].sort();
  if (unsupportedCapabilities.length > 0) {
    return { status: "unsupported", adapterId: null, adapterVersion, reason: "unsupported_capability", unsupportedCapabilities };
  }
  if (!astroStaticSiteAdapterDescriptor.supportedSiteClasses.includes(input.siteClass)) {
    return { status: "unsupported", adapterId: null, adapterVersion, reason: "unsupported_site_class", unsupportedCapabilities: [] };
  }
  return {
    status: "selected",
    adapterId: astroStaticSiteAdapterDescriptor.id,
    adapterVersion,
    reason: input.requestedAdapterId ? "explicit_selection" : "new_supported_default",
  };
}
