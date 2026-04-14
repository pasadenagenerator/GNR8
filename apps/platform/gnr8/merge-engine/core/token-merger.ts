import { pushConflict, pushDiagnostic } from "../diagnostics/merge-diagnostics";
import type {
  FinalColorToken,
  FinalSpacingToken,
  FinalTokenSet,
  FinalTypographyToken,
  MergeContext,
} from "../types/merge-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function normalizeHex8(input: string): string {
  const value = input.trim().toLowerCase();
  if (/^#[0-9a-f]{8}$/.test(value)) return value;
  if (/^#[0-9a-f]{6}$/.test(value)) return `${value}ff`;
  return value;
}

function parseHex8(input: string): [number, number, number, number] | null {
  const hex = normalizeHex8(input);
  if (!/^#[0-9a-f]{8}$/.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    parseInt(hex.slice(7, 9), 16),
  ];
}

function colorDistance(a: string, b: string): number {
  const pa = parseHex8(a);
  const pb = parseHex8(b);
  if (!pa || !pb) return 0;
  return Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) + Math.abs(pa[2] - pb[2]) + Math.abs(pa[3] - pb[3]);
}

export function mergeTokens(context: MergeContext): FinalTokenSet {
  const importedColors: FinalColorToken[] = context.canonicalStyle.colorTokens
    .map((token) => ({
      id: token.id,
      name: token.name,
      semanticRole: token.semanticRole,
      valueHex8: normalizeHex8(token.valueHex8),
      provenance: [
        {
          source: "import" as const,
          sourceId: token.id,
          rationale: "Observed from canonical import style evidence.",
          confidence: token.confidence,
        },
      ],
    }))
    .sort((a, b) => stringCmp(a.id, b.id));

  const importedTypography: FinalTypographyToken[] = context.canonicalStyle.typographyTokens
    .map((token) => ({
      id: token.id,
      role: token.role,
      family: token.family,
      weight: token.weight,
      sizePx: token.sizePx,
      lineHeight: token.lineHeight,
      letterSpacing: token.letterSpacing,
      provenance: [
        {
          source: "import" as const,
          sourceId: token.id,
          rationale: "Observed from canonical import typography evidence.",
          confidence: token.confidence,
        },
      ],
    }))
    .sort((a, b) => stringCmp(a.id, b.id));

  const importedSpacing: FinalSpacingToken[] = context.canonicalStyle.spacingTokens
    .map((token) => ({
      id: token.id,
      name: token.name,
      px: token.px,
      provenance: [
        {
          source: "import" as const,
          sourceId: token.id,
          rationale: "Observed from canonical import spacing evidence.",
          confidence: token.confidence,
        },
      ],
    }))
    .sort((a, b) => stringCmp(a.id, b.id));

  const colorsById = new Map(importedColors.map((token) => [token.id, token]));
  const typographyById = new Map(importedTypography.map((token) => [token.id, token]));
  const spacingById = new Map(importedSpacing.map((token) => [token.id, token]));

  const styleMode = context.options.styleMode;

  for (const patch of context.design.tokens.slice().sort((a, b) => stringCmp(a.tokenId, b.tokenId))) {
    const canApply = styleMode === "prefer_design" || (styleMode === "hybrid" && patch.confidence >= 0.55);
    if (!canApply) {
      pushDiagnostic(context, {
        code: "MERGE_TOKEN_PATCH_SKIPPED",
        severity: "info",
        message: `Skipped design token patch '${patch.tokenId}' in '${styleMode}' mode.`,
        details: {
          patch,
        },
      });
      continue;
    }

    if (patch.tokenType === "color") {
      const existing = colorsById.get(patch.tokenId);
      if (!existing) {
        colorsById.set(patch.tokenId, {
          id: patch.tokenId,
          name: patch.tokenId,
          semanticRole: "unknown",
          valueHex8: normalizeHex8(patch.value),
          provenance: [
            {
              source: "design",
              sourceId: patch.tokenId,
              rationale: "Design patch introduced a new color token.",
              confidence: patch.confidence,
            },
          ],
        });
        continue;
      }

      const distance = colorDistance(existing.valueHex8, patch.value);
      if (distance >= 180) {
        pushConflict(context, {
          type: "token_conflict",
          resolution: styleMode === "prefer_design" ? "used_design" : "merged",
          details: {
            tokenId: patch.tokenId,
            tokenType: patch.tokenType,
            importedValue: existing.valueHex8,
            designValue: patch.value,
            distance,
          },
        });

        pushDiagnostic(context, {
          code: "MERGE_TOKEN_DRIFT_HIGH",
          severity: "warning",
          message: `Color token '${patch.tokenId}' drift is high (${distance}).`,
          details: {
            imported: existing.valueHex8,
            design: patch.value,
            distance,
          },
        });
      }

      existing.valueHex8 = normalizeHex8(patch.value);
      existing.provenance.push({
        source: "design",
        sourceId: patch.tokenId,
        rationale: "Design patch applied to imported color token.",
        confidence: patch.confidence,
      });
      continue;
    }

    if (patch.tokenType === "typography") {
      const existing = typographyById.get(patch.tokenId);
      if (!existing) {
        typographyById.set(patch.tokenId, {
          id: patch.tokenId,
          role: "body",
          family: patch.value,
          weight: 400,
          sizePx: 16,
          lineHeight: 1.5,
          letterSpacing: 0,
          provenance: [
            {
              source: "design",
              sourceId: patch.tokenId,
              rationale: "Design patch introduced a new typography token.",
              confidence: patch.confidence,
            },
          ],
        });
      } else {
        existing.family = patch.value;
        existing.provenance.push({
          source: "design",
          sourceId: patch.tokenId,
          rationale: "Design patch updated typography family.",
          confidence: patch.confidence,
        });
      }
      continue;
    }

    if (patch.tokenType === "spacing") {
      const parsed = Number.parseFloat(patch.value);
      const px = Number.isFinite(parsed) ? parsed : undefined;
      const existing = spacingById.get(patch.tokenId);

      if (!existing) {
        spacingById.set(patch.tokenId, {
          id: patch.tokenId,
          name: "md",
          px: px ?? 16,
          provenance: [
            {
              source: "design",
              sourceId: patch.tokenId,
              rationale: "Design patch introduced a new spacing token.",
              confidence: patch.confidence,
            },
          ],
        });
      } else if (px !== undefined) {
        existing.px = px;
        existing.provenance.push({
          source: "design",
          sourceId: patch.tokenId,
          rationale: "Design patch updated spacing token value.",
          confidence: patch.confidence,
        });
      }
      continue;
    }

    pushDiagnostic(context, {
      code: "MERGE_TOKEN_PATCH_UNSUPPORTED_TYPE",
      severity: "info",
      message: `Token patch '${patch.tokenId}' with type '${patch.tokenType}' was ignored.`,
      details: {
        patch,
      },
    });
  }

  return {
    colors: [...colorsById.values()].sort((a, b) => stringCmp(a.id, b.id)),
    typography: [...typographyById.values()].sort((a, b) => stringCmp(a.id, b.id)),
    spacing: [...spacingById.values()].sort((a, b) => stringCmp(a.id, b.id)),
    surface: {
      radiusScalePx: [...context.canonicalStyle.surfaceProfile.radiusScalePx],
      borderStyle: context.canonicalStyle.surfaceProfile.borderStyle,
      shadowStyle: context.canonicalStyle.surfaceProfile.shadowStyle,
      provenance: [
        {
          source: "import",
          sourceId: "surface_profile",
          rationale: "Baseline surface profile sourced from canonical import.",
          confidence: 1,
        },
      ],
    },
    componentProfile: {
      buttons: context.canonicalStyle.componentProfile.buttons,
      inputs: context.canonicalStyle.componentProfile.inputs,
      media: context.canonicalStyle.componentProfile.media,
      sectionTone:
        styleMode === "prefer_design" || styleMode === "hybrid"
          ? context.design.globalDesign.tone
          : context.canonicalStyle.componentProfile.sectionTone,
      provenance: [
        {
          source: styleMode === "preserve_import" ? "import" : "merged",
          sourceId: "component_profile",
          rationale: "Component profile merged with design tone according to style mode.",
          confidence: 0.8,
        },
      ],
    },
    gradients: context.canonicalStyle.gradients
      .map((gradient) => ({
        id: gradient.id,
        cssValue: gradient.cssValue,
        provenance: [
          {
            source: "import" as const,
            sourceId: gradient.id,
            rationale: "Gradient observed in canonical import.",
            confidence: 1,
          },
        ],
      }))
      .sort((a, b) => stringCmp(a.id, b.id)),
  };
}
