export type Gnr8OutputAdapterId = "astro-static-site" | "html-static-artifact";

export type Gnr8SupportedSiteClass =
  | "static-business-site"
  | "marketing-site"
  | "service-business-site"
  | "content-site"
  | "ecommerce-site"
  | "web-app"
  | "custom";

export type Gnr8SourceWorkspaceShape = "source-project" | "runtime-artifact-bundle";

export type Gnr8AdapterFileRole = "source" | "config" | "style" | "manifest" | "artifact";

export interface Gnr8OutputAdapterFile {
  path: string;
  role: Gnr8AdapterFileRole;
  contents: string;
}

export interface Gnr8OutputAdapterFileManifest {
  files: Gnr8OutputAdapterFile[];
}

export interface Gnr8OutputAdapterCommand {
  command: string;
  cwdHint: "workspace-root" | "artifact-root";
}

export interface Gnr8OutputAdapterExportOutput {
  kind: "static-dist" | "runtime-html-artifact";
  outputPath: string;
}

export type Gnr8SupportedEditCategory =
  | "copy"
  | "navigation"
  | "theme"
  | "layout"
  | "sections"
  | "cards"
  | "contact"
  | "assets";

export interface Gnr8MutationBoundaryFlags {
  mutatesRuntimeArtifact: boolean;
  mutatesPublishedOutput: boolean;
  mutatesLivePointer: boolean;
  mutatesDns: boolean;
  mutatesProvider: boolean;
  mutatesBilling: boolean;
  writesSourceWorkspace: boolean;
  requiresGitBaseline: boolean;
}

export interface Gnr8AirshipIntegrationReadback {
  prepareWorkspace: string;
  gitBaseline: string;
  devServer: string;
  airshipTarget: string;
  captureDiffs: string;
  mapAndApply: string;
  buildCandidate: string;
}

export interface Gnr8OutputAdapterDescriptor {
  id: Gnr8OutputAdapterId;
  label: string;
  supportedSiteClasses: Gnr8SupportedSiteClass[];
  sourceWorkspaceShape: Gnr8SourceWorkspaceShape;
  projectFileReadback: string[];
  buildCommand: Gnr8OutputAdapterCommand | null;
  devCommand: Gnr8OutputAdapterCommand | null;
  previewTargetPort: number | null;
  exportOutput: Gnr8OutputAdapterExportOutput;
  supportedEditCategories: Gnr8SupportedEditCategory[];
  limitations: string[];
  mutationBoundary: Gnr8MutationBoundaryFlags;
  airshipIntegrationReadback?: Gnr8AirshipIntegrationReadback;
}

export interface Gnr8OutputAdapter<TInput> {
  descriptor: Gnr8OutputAdapterDescriptor;
  createProjectManifest(input: TInput): Gnr8OutputAdapterFileManifest;
}

export const htmlStaticArtifactAdapterDescriptor: Gnr8OutputAdapterDescriptor = {
  id: "html-static-artifact",
  label: "HTML/static runtime artifact fallback",
  supportedSiteClasses: ["static-business-site", "marketing-site", "service-business-site", "content-site", "custom"],
  sourceWorkspaceShape: "runtime-artifact-bundle",
  projectFileReadback: ["runtime artifact htmlByPath", "compiled token styles", "asset fingerprint map", "artifact manifest"],
  buildCommand: null,
  devCommand: null,
  previewTargetPort: null,
  exportOutput: {
    kind: "runtime-html-artifact",
    outputPath: "gnr8_runtime_artifacts",
  },
  supportedEditCategories: ["copy", "navigation", "theme", "layout", "sections", "cards", "contact", "assets"],
  limitations: [
    "Fallback path is artifact-backed rather than source-workspace-backed.",
    "Airship source diffs require a future source adapter or mapping bridge.",
    "This descriptor does not change current runtime rendering or publishing behavior.",
  ],
  mutationBoundary: {
    mutatesRuntimeArtifact: false,
    mutatesPublishedOutput: false,
    mutatesLivePointer: false,
    mutatesDns: false,
    mutatesProvider: false,
    mutatesBilling: false,
    writesSourceWorkspace: false,
    requiresGitBaseline: false,
  },
};
