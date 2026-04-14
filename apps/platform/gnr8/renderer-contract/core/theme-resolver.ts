import type { FinalProvenance, FinalStyleRefs } from "../../merge-engine";
import { pushRenderDiagnostic } from "../diagnostics/render-diagnostics";
import type {
  ReactRenderTheme,
  RenderProvenance,
  RendererContractContext,
  ThemeResolutionInput,
} from "../types/renderer-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function normalizeSemanticKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapProvenance(values: FinalProvenance[]): RenderProvenance[] {
  return values
    .slice()
    .sort((a, b) => stringCmp(a.sourceId, b.sourceId) || stringCmp(a.rationale, b.rationale))
    .map((provenance) => ({
      source: provenance.source,
      sourceId: provenance.sourceId,
      rationale: provenance.rationale,
      confidence: provenance.confidence,
    }));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => stringCmp(a, b));
}

export function resolveTheme(input: ThemeResolutionInput & { context: RendererContractContext }): ReactRenderTheme {
  const { tokens, includeProvenance, context } = input;

  const colorTokens = tokens.colors
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .reduce<Record<string, string>>((acc, token) => {
      acc[token.id] = token.valueHex8;
      return acc;
    }, {});

  const typographyTokens = tokens.typography
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .reduce<Record<string, Record<string, string | number | boolean | null>>>((acc, token) => {
      acc[token.id] = {
        family: token.family,
        role: token.role,
        weight: token.weight,
        sizePx: token.sizePx,
        lineHeight: token.lineHeight,
        letterSpacing: token.letterSpacing,
      };
      return acc;
    }, {});

  const spacingTokens = tokens.spacing
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .reduce<Record<string, number>>((acc, token) => {
      acc[token.id] = token.px;
      return acc;
    }, {});

  const gradientTokens = tokens.gradients
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .reduce<Record<string, string>>((acc, gradient) => {
      acc[gradient.id] = gradient.cssValue;
      return acc;
    }, {});

  const semanticTokens: Record<string, string> = {};
  for (const token of tokens.colors.slice().sort((a, b) => stringCmp(a.id, b.id))) {
    const semanticKey = normalizeSemanticKey(token.semanticRole);
    if (semanticKey.length === 0) continue;

    if (!semanticTokens[semanticKey]) {
      semanticTokens[semanticKey] = token.id;
      continue;
    }

    pushRenderDiagnostic(context, {
      code: "RENDER_THEME_SEMANTIC_TOKEN_CONFLICT",
      severity: "info",
      message: `Semantic token '${semanticKey}' had multiple candidates; '${semanticTokens[semanticKey]}' was kept deterministically.`,
      details: {
        kept: semanticTokens[semanticKey],
        dropped: token.id,
      },
    });
  }

  if (Object.keys(colorTokens).length === 0) {
    pushRenderDiagnostic(context, {
      code: "RENDER_THEME_COLOR_TOKENS_EMPTY",
      severity: "warning",
      message: "FinalSiteModel contains no color tokens; renderer theme will rely on fallback semantic token references.",
    });
  }

  const componentThemes = {
    button: {
      cornerStyle: tokens.componentProfile.buttons.cornerStyle,
      prominence: tokens.componentProfile.buttons.prominence,
      variants: tokens.componentProfile.buttons.variants.join(","),
    },
    input: {
      border: tokens.componentProfile.inputs.border,
      cornerStyle: tokens.componentProfile.inputs.cornerStyle,
    },
    media: {
      treatment: tokens.componentProfile.media.treatment,
      saturationHint: tokens.componentProfile.media.saturationHint,
    },
    section: {
      tone: tokens.componentProfile.sectionTone,
    },
  };

  return {
    tokenGroups: {
      colors: {
        tokens: colorTokens,
        ...(includeProvenance
          ? {
              provenance: tokens.colors.reduce<Record<string, RenderProvenance[]>>((acc, token) => {
                acc[token.id] = mapProvenance(token.provenance);
                return acc;
              }, {}),
            }
          : {}),
      },
      typography: {
        tokens: typographyTokens,
        ...(includeProvenance
          ? {
              provenance: tokens.typography.reduce<Record<string, RenderProvenance[]>>((acc, token) => {
                acc[token.id] = mapProvenance(token.provenance);
                return acc;
              }, {}),
            }
          : {}),
      },
      spacing: {
        tokens: spacingTokens,
        ...(includeProvenance
          ? {
              provenance: tokens.spacing.reduce<Record<string, RenderProvenance[]>>((acc, token) => {
                acc[token.id] = mapProvenance(token.provenance);
                return acc;
              }, {}),
            }
          : {}),
      },
      gradients: {
        tokens: gradientTokens,
        ...(includeProvenance
          ? {
              provenance: tokens.gradients.reduce<Record<string, RenderProvenance[]>>((acc, gradient) => {
                acc[gradient.id] = mapProvenance(gradient.provenance);
                return acc;
              }, {}),
            }
          : {}),
      },
      surface: {
        tokens: {
          radiusScalePx: tokens.surface.radiusScalePx,
          borderStyle: tokens.surface.borderStyle,
          shadowStyle: tokens.surface.shadowStyle,
        },
        ...(includeProvenance
          ? {
              provenance: {
                surface: mapProvenance(tokens.surface.provenance),
              },
            }
          : {}),
      },
    },
    semanticTokens,
    componentThemes,
  };
}

export function resolveThemeRefs(styleRefs: FinalStyleRefs): string[] {
  return uniqueSorted([
    ...styleRefs.colorTokenIds.map((id) => `tokens.colors.${id}`),
    ...styleRefs.typographyTokenIds.map((id) => `tokens.typography.${id}`),
    ...styleRefs.spacingTokenIds.map((id) => `tokens.spacing.${id}`),
    ...styleRefs.gradientIds.map((id) => `tokens.gradients.${id}`),
  ]);
}
