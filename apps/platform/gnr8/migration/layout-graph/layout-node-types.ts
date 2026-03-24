export type LayoutNodeType =
  | "header"
  | "nav"
  | "hero"
  | "section"
  | "gallery"
  | "form"
  | "footer"
  | "legal"
  | "unknown";

export type LayoutSignals = {
  textDensity: number;
  imageDensity: number;
  linkDensity: number;
  headingPresence: boolean;
  sectionBreakConfidence: number;
  visualClusterConfidence: number;
};

export type LayoutNode = {
  id: string;
  type: LayoutNodeType;
  depth: number;
  domIndexStart: number;
  domIndexEnd: number;
  children: LayoutNode[];
  signals: LayoutSignals;
};
