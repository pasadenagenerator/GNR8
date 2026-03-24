import type { LayoutNode } from "./layout-node-types";

export type LayoutAnomalyCode =
  | "MISSING_BODY"
  | "EMPTY_BODY"
  | "CHILD_RANGE_OUTSIDE_PARENT"
  | "NON_MONOTONIC_CHILD_ORDER";

export type LayoutAnomaly = {
  code: LayoutAnomalyCode;
  message: string;
  nodeId?: string;
};

export type LayoutGraph = {
  root: LayoutNode;
  nodeIndex: Map<string, LayoutNode>;
  anomalies: LayoutAnomaly[];
};

export type LayoutNodeHint = {
  id: string;
  type: LayoutNode["type"];
  depth: number;
  domIndexStart: number;
  domIndexEnd: number;
  signals: LayoutNode["signals"];
};
