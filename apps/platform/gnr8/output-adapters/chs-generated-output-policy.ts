import {
  createGeneratedOutputContentManifest,
  type GeneratedOutputContentManifest,
} from "./generated-output-eligibility";
import {
  CHS_ASTRO_ASSET_INVENTORY,
  CHS_ASTRO_EXPORT_VERIFICATION,
  CHS_ASTRO_ROUTE_INVENTORY,
  CHS_ASTRO_SOURCE_LINEAGE,
  chsAstroSourceContent,
} from "./chs-astro-source-content";

export function createChsGeneratedOutputContentManifest(input: {
  sourceRef?: string;
} = {}): GeneratedOutputContentManifest {
  const source = chsAstroSourceContent();
  return createGeneratedOutputContentManifest({
    sourceRef: input.sourceRef ?? `${CHS_ASTRO_SOURCE_LINEAGE.sourceSnapshotId}:${CHS_ASTRO_SOURCE_LINEAGE.sourceRunId}`,
    scope: {
      kind: "homepage_only",
      outputPaths: ["/"],
      allowedPublishStages: ["shadow", "canary", "production"],
      unsupportedCapabilities: [
        "child_route_generation",
        "binary_asset_storage",
      ],
    },
    requiredContent: CHS_ASTRO_EXPORT_VERIFICATION.expectedContent.map((value, index) => ({
      id: index === 0 ? "document_title" : `trusted_content_${index}`,
      value,
      match: index === 0 ? "html" as const : "text" as const,
    })),
    requiredNavigation: [
      { id: "brand_home", kind: "local_route", target: "/" },
      { id: "home_anchor", kind: "local_anchor", target: "#home" },
      { id: "contact_anchor", kind: "local_anchor", target: "#contact" },
      ...CHS_ASTRO_ROUTE_INVENTORY
        .filter((item) => item.path !== "/")
        .map((item) => ({
          id: `original_site_${item.path.slice(1).replaceAll("-", "_")}`,
          kind: "external_url" as const,
          target: new URL(item.path, CHS_ASTRO_SOURCE_LINEAGE.sourceUrl).toString().replace(/\/$/, ""),
        })),
      ...[source.contact.email, ...(source.contact.emails ?? [])]
        .filter((value): value is string => Boolean(value))
        .map((email) => ({ id: `email_${email}`, kind: "mailto" as const, target: `mailto:${email}` })),
    ],
    requiredAssets: [],
  });
}

export const CHS_GENERATED_OUTPUT_DELIVERY_SCOPE = {
  generatedPaths: ["/"],
  childRouteBehavior: "links_resolve_to_original_website",
  originalWebsite: CHS_ASTRO_SOURCE_LINEAGE.sourceUrl,
  binaryAssetsIncluded: false,
  binaryAssetReason: CHS_ASTRO_ASSET_INVENTORY.unsupportedCapability,
} as const;
