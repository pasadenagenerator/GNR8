import React, { type CSSProperties, type ReactNode } from "react";

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

function findTypographyTokenId(theme: ReactRenderTheme, role: "heading" | "body"): string | null {
  const typographyTokens = (theme.tokenGroups.typography?.tokens ?? {}) as Record<string, unknown>;
  const exact = Object.keys(typographyTokens)
    .sort((a, b) => stringCmp(a, b))
    .find((tokenId) => {
      const token = typographyTokens[tokenId];
      return Boolean(token && typeof token === "object" && (token as Record<string, unknown>).role === role);
    });
  if (exact) return exact;
  return Object.keys(typographyTokens)
    .sort((a, b) => stringCmp(a, b))
    .find((tokenId) => sanitizeTokenKey(tokenId).includes(role)) ?? null;
}

function buildScopedTypographyCss(theme: ReactRenderTheme): string {
  const headingTokenId = findTypographyTokenId(theme, "heading");
  const bodyTokenId = findTypographyTokenId(theme, "body");
  const rules: string[] = [];
  if (bodyTokenId) {
    const key = sanitizeTokenKey(bodyTokenId);
    rules.push(
      `[data-gnr8-theme-boundary="site"] { font-family: var(--gnr8-typography-${key}-family); font-size: var(--gnr8-typography-${key}-size-px); line-height: var(--gnr8-typography-${key}-line-height); }`,
    );
  }
  if (headingTokenId) {
    const key = sanitizeTokenKey(headingTokenId);
    rules.push(
      `[data-gnr8-theme-boundary="site"] :where(h1,h2,h3,h4,h5,h6) { font-family: var(--gnr8-typography-${key}-family); font-weight: var(--gnr8-typography-${key}-weight); line-height: var(--gnr8-typography-${key}-line-height); letter-spacing: var(--gnr8-typography-${key}-letter-spacing); }`,
    );
  }
  return rules.join("\n");
}

export type ThemeProviderProps = {
  theme: ReactRenderTheme;
  children: ReactNode;
};

export function ThemeBoundaryProvider({ theme, children }: ThemeProviderProps) {
  const typographyCss = buildScopedTypographyCss(theme);
  return (
    <div
      data-gnr8-theme-boundary="site"
      data-gnr8-theme-semantic-keys={Object.keys(theme.semanticTokens).sort((a, b) => stringCmp(a, b)).join(",")}
      style={buildThemeCssVariables(theme)}
    >
      {typographyCss ? <style>{typographyCss}</style> : null}
      {children}
    </div>
  );
}
