import crypto from "node:crypto";

import type {
  EvidenceBoundingBox,
  LayoutGeometryEvidence,
  LayoutGeometryRegion,
} from "./evidence-capture-layout-contract";

export const MAJOR_LAYOUT_REGION_TAG_NAMES = [
  "body",
  "main",
  "header",
  "nav",
  "footer",
  "aside",
  "section",
] as const;

export type MajorLayoutRegionTagName = (typeof MAJOR_LAYOUT_REGION_TAG_NAMES)[number];

type LayoutGeometryRegionInput = Omit<LayoutGeometryRegion, "boundingBox"> & {
  boundingBox: Partial<EvidenceBoundingBox>;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNumber(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(3));
}

function normalizePositiveNumber(value: unknown): number {
  return Math.max(0, normalizeNumber(value));
}

export function isMajorLayoutRegionTagName(value: unknown): value is MajorLayoutRegionTagName {
  const tagName = normalizeText(value).toLowerCase();
  return MAJOR_LAYOUT_REGION_TAG_NAMES.includes(tagName as MajorLayoutRegionTagName);
}

export function normalizeLayoutGeometryBoundingBox(
  box: Partial<EvidenceBoundingBox>,
): EvidenceBoundingBox {
  return {
    x: normalizePositiveNumber(box.x),
    y: normalizePositiveNumber(box.y),
    width: normalizePositiveNumber(box.width),
    height: normalizePositiveNumber(box.height),
  };
}

export function stableLayoutGeometryRegionId(input: {
  routePath: string;
  tagName: string;
  selector: string;
  boundingBox: EvidenceBoundingBox;
}): string {
  const hash = crypto
    .createHash("sha256")
    .update(
      [
        normalizeText(input.routePath) || "/",
        normalizeText(input.tagName).toLowerCase(),
        normalizeText(input.selector),
        input.boundingBox.x,
        input.boundingBox.y,
        input.boundingBox.width,
        input.boundingBox.height,
      ].join(":"),
    )
    .digest("hex")
    .slice(0, 12);
  return `layout-region-${hash}`;
}

export function createLayoutGeometryEvidence(input: {
  routePath: string;
  viewportWidth: number;
  viewportHeight: number;
  documentHeight: number;
  capturedAt: string;
  regions: LayoutGeometryRegionInput[];
}): LayoutGeometryEvidence {
  const routePath = normalizeText(input.routePath) || "/";
  const viewportWidth = Math.max(0, Math.floor(normalizePositiveNumber(input.viewportWidth)));
  const viewportHeight = Math.max(0, Math.floor(normalizePositiveNumber(input.viewportHeight)));
  const documentHeight = Math.max(
    viewportHeight,
    Math.floor(normalizePositiveNumber(input.documentHeight)),
  );
  const capturedAt = normalizeText(input.capturedAt) || new Date(0).toISOString();

  const regions = input.regions
    .map((region) => {
      const tagName = normalizeText(region.tagName).toLowerCase();
      const selector = normalizeText(region.selector);
      const boundingBox = normalizeLayoutGeometryBoundingBox(region.boundingBox);
      return {
        regionId:
          normalizeText(region.regionId) ||
          stableLayoutGeometryRegionId({
            routePath,
            tagName,
            selector,
            boundingBox,
          }),
        tagName,
        role: normalizeText(region.role) || null,
        selector,
        boundingBox,
        childCount: Math.max(0, Math.floor(normalizePositiveNumber(region.childCount))),
      };
    })
    .filter((region) =>
      isMajorLayoutRegionTagName(region.tagName) &&
      region.selector.length > 0 &&
      region.boundingBox.width > 0 &&
      region.boundingBox.height > 0,
    )
    .sort((left, right) => {
      const yDelta = left.boundingBox.y - right.boundingBox.y;
      if (yDelta !== 0) return yDelta;
      const xDelta = left.boundingBox.x - right.boundingBox.x;
      if (xDelta !== 0) return xDelta;
      return left.selector.localeCompare(right.selector);
    });

  return {
    routePath,
    viewportWidth,
    viewportHeight,
    documentHeight,
    regions,
    capturedAt,
  };
}
