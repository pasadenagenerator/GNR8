import type { CSSProperties, ReactNode } from "react";

import type { ReactRenderTheme } from "@/gnr8/renderer-contract";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sanitizeTokenKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function buildThemeCssVariables(theme: ReactRenderTheme): CSSProperties {
  const vars: Record<string, string | number> = {};

  const colorTokens = (theme.tokenGroups.colors?.tokens ?? {}) as Record<string, unknown>;
  for (const tokenId of Object.keys(colorTokens).sort((a, b) => stringCmp(a, b))) {
    const value = colorTokens[tokenId];
    if (typeof value === "string" && value.trim().length > 0) {
      vars[`--gnr8-color-${sanitizeTokenKey(tokenId)}`] = value;
    }
  }

  const spacingTokens = (theme.tokenGroups.spacing?.tokens ?? {}) as Record<string, unknown>;
  for (const tokenId of Object.keys(spacingTokens).sort((a, b) => stringCmp(a, b))) {
    const value = spacingTokens[tokenId];
    if (typeof value === "number") {
      vars[`--gnr8-space-${sanitizeTokenKey(tokenId)}`] = `${value}px`;
    }
  }

  const gradientTokens = (theme.tokenGroups.gradients?.tokens ?? {}) as Record<string, unknown>;
  for (const tokenId of Object.keys(gradientTokens).sort((a, b) => stringCmp(a, b))) {
    const value = gradientTokens[tokenId];
    if (typeof value === "string") {
      vars[`--gnr8-gradient-${sanitizeTokenKey(tokenId)}`] = value;
    }
  }

  const typographyTokens = (theme.tokenGroups.typography?.tokens ?? {}) as Record<string, unknown>;
  for (const tokenId of Object.keys(typographyTokens).sort((a, b) => stringCmp(a, b))) {
    const value = typographyTokens[tokenId];
    if (!value || typeof value !== "object") continue;

    const token = value as Record<string, unknown>;
    const key = sanitizeTokenKey(tokenId);

    if (typeof token.family === "string") vars[`--gnr8-typography-${key}-family`] = token.family;
    if (typeof token.weight === "number") vars[`--gnr8-typography-${key}-weight`] = token.weight;
    if (typeof token.sizePx === "number") vars[`--gnr8-typography-${key}-size-px`] = `${token.sizePx}px`;
    if (typeof token.lineHeight === "number") vars[`--gnr8-typography-${key}-line-height`] = token.lineHeight;
    if (typeof token.letterSpacing === "number") vars[`--gnr8-typography-${key}-letter-spacing`] = `${token.letterSpacing}px`;
  }

  for (const semanticKey of Object.keys(theme.semanticTokens).sort((a, b) => stringCmp(a, b))) {
    const tokenId = theme.semanticTokens[semanticKey] ?? "";
    const semanticVar = `--gnr8-semantic-${sanitizeTokenKey(semanticKey)}`;
    const colorVar = `--gnr8-color-${sanitizeTokenKey(tokenId)}`;
    vars[semanticVar] = tokenId.trim().length > 0 ? `var(${colorVar})` : tokenId;
  }

  return vars as CSSProperties;
}

export type ThemeProviderProps = {
  theme: ReactRenderTheme;
  children: ReactNode;
};

export function ThemeBoundaryProvider({ theme, children }: ThemeProviderProps) {
  return (
    <div
      data-gnr8-theme-boundary="site"
      data-gnr8-theme-semantic-keys={Object.keys(theme.semanticTokens).sort((a, b) => stringCmp(a, b)).join(",")}
      style={buildThemeCssVariables(theme)}
    >
      {children}
    </div>
  );
}
