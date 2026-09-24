import type { CSSProperties } from "react";

export const gnr8VisualTokens = {
  color: {
    background: "#f6f7f8",
    surface: "#ffffff",
    surfaceMuted: "#f3f4f6",
    panelDark: "#111827",
    panelDarkMuted: "#1f2937",
    border: "#d8dee6",
    borderStrong: "#9ca3af",
    text: "#111827",
    textMuted: "#5f6b7a",
    textInverse: "#f9fafb",
    accentOrange: "#d96c18",
    accentOrangeHover: "#b8550f",
    accentOrangeSoft: "#fff3e8",
    success: "#15803d",
    warning: "#b45309",
    danger: "#b91c1c",
    focusRing: "#f59e0b",
  },
  typography: {
    uiFont: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    monoFont: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    heading: {
      hero: "30px",
      section: "20px",
      compact: "16px",
    },
    body: {
      base: "14px",
      small: "13px",
      micro: "12px",
    },
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    panelPadding: 16,
    toolbarGap: 8,
    sectionRhythm: 22,
  },
  radius: {
    button: 6,
    input: 6,
    panel: 8,
    overlay: 8,
  },
  shadow: {
    panel: "0 14px 36px rgba(17, 24, 39, 0.08)",
    floatingToolbar: "0 10px 24px rgba(17, 24, 39, 0.13)",
    focusRing: "0 0 0 3px rgba(245, 158, 11, 0.28)",
  },
  icon: {
    defaultSize: 18,
    compactSize: 14,
    strokeWidth: 1.75,
  },
} as const;

export const gnr8Styles = {
  canvas: {
    color: gnr8VisualTokens.color.text,
    background: gnr8VisualTokens.color.background,
    fontFamily: gnr8VisualTokens.typography.uiFont,
  },
  panel: {
    border: `1px solid ${gnr8VisualTokens.color.border}`,
    borderRadius: gnr8VisualTokens.radius.panel,
    background: gnr8VisualTokens.color.surface,
    boxShadow: "none",
  },
  darkPanel: {
    border: `1px solid ${gnr8VisualTokens.color.panelDarkMuted}`,
    borderRadius: gnr8VisualTokens.radius.panel,
    background: gnr8VisualTokens.color.panelDark,
    color: gnr8VisualTokens.color.textInverse,
  },
  primaryButton: {
    border: `1px solid ${gnr8VisualTokens.color.accentOrange}`,
    borderRadius: gnr8VisualTokens.radius.button,
    background: gnr8VisualTokens.color.accentOrange,
    color: gnr8VisualTokens.color.textInverse,
  },
  neutralButton: {
    border: `1px solid ${gnr8VisualTokens.color.border}`,
    borderRadius: gnr8VisualTokens.radius.button,
    background: gnr8VisualTokens.color.surface,
    color: gnr8VisualTokens.color.text,
  },
  input: {
    border: `1px solid ${gnr8VisualTokens.color.border}`,
    borderRadius: gnr8VisualTokens.radius.input,
    background: gnr8VisualTokens.color.surface,
    color: gnr8VisualTokens.color.text,
  },
  monoReadback: {
    fontFamily: gnr8VisualTokens.typography.monoFont,
    fontSize: gnr8VisualTokens.typography.body.micro,
    lineHeight: 1.5,
    border: `1px solid ${gnr8VisualTokens.color.border}`,
    borderRadius: gnr8VisualTokens.radius.panel,
    background: gnr8VisualTokens.color.surfaceMuted,
    color: gnr8VisualTokens.color.text,
  },
} satisfies Record<string, CSSProperties>;

export type Gnr8StatusTone = "success" | "warning" | "danger" | "neutral" | "accent";

export function gnr8StatusStyle(tone: Gnr8StatusTone): CSSProperties {
  const palette: Record<Gnr8StatusTone, { border: string; background: string; color: string }> = {
    success: { border: "#86efac", background: "#f0fdf4", color: gnr8VisualTokens.color.success },
    warning: { border: "#fcd34d", background: "#fffbeb", color: gnr8VisualTokens.color.warning },
    danger: { border: "#fecaca", background: "#fef2f2", color: gnr8VisualTokens.color.danger },
    neutral: { border: gnr8VisualTokens.color.border, background: gnr8VisualTokens.color.surfaceMuted, color: gnr8VisualTokens.color.textMuted },
    accent: { border: "#fed7aa", background: gnr8VisualTokens.color.accentOrangeSoft, color: gnr8VisualTokens.color.accentOrangeHover },
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    border: `1px solid ${palette[tone].border}`,
    borderRadius: gnr8VisualTokens.radius.button,
    padding: "4px 8px",
    background: palette[tone].background,
    color: palette[tone].color,
    fontSize: gnr8VisualTokens.typography.body.micro,
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
}
