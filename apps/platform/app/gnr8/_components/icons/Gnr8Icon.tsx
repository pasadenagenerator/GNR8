"use client";

import React from "react";
import {
  AirplaneTilt,
  ArrowsClockwise,
  ArrowsOutSimple,
  ArrowSquareOut,
  Article,
  Browser,
  Buildings,
  CheckCircle,
  CloudArrowUp,
  CloudCheck,
  Compass,
  Crosshair,
  Cursor,
  Database,
  Desktop,
  DeviceMobile,
  Eye,
  FileText,
  FirstAid,
  FloppyDisk,
  FrameCorners,
  Gauge,
  GearSix,
  GlobeHemisphereWest,
  Hand,
  Heartbeat,
  MagicWand,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  MapTrifold,
  PencilSimple,
  Play,
  Pulse,
  RocketLaunch,
  Selection,
  SidebarSimple,
  Stop,
  TextT,
  UploadSimple,
  UsersThree,
  WarningCircle,
  XCircle,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

import { gnr8VisualTokens } from "../../../../gnr8/visual-system/gnr8-visual-system";

export const gnr8IconNames = [
  "airship",
  "agency",
  "apply",
  "article",
  "capture",
  "client",
  "cloud-check",
  "command-center",
  "compass",
  "dashboard",
  "database",
  "diagnostics",
  "draft",
  "edit",
  "expand",
  "external-link",
  "fit",
  "first-aid",
  "generate",
  "health",
  "live",
  "map",
  "mobile",
  "open",
  "pan",
  "preview",
  "publish",
  "refresh",
  "save",
  "select",
  "selection",
  "settings",
  "sidebar",
  "site",
  "start",
  "stop",
  "success",
  "text",
  "view",
  "warning",
  "danger",
  "zoom-in",
  "zoom-out",
] as const;

export type Gnr8IconName = (typeof gnr8IconNames)[number];
export type Gnr8IconSize = "compact" | "default" | "nav";
export type Gnr8IconState = "default" | "active" | "muted" | "danger" | "success";

const iconMap: Record<Gnr8IconName, Icon> = {
  airship: AirplaneTilt,
  agency: Buildings,
  apply: UploadSimple,
  article: Article,
  capture: Crosshair,
  client: UsersThree,
  "cloud-check": CloudCheck,
  "command-center": Gauge,
  compass: Compass,
  dashboard: Gauge,
  database: Database,
  diagnostics: Pulse,
  draft: FileText,
  edit: PencilSimple,
  expand: ArrowsOutSimple,
  "external-link": ArrowSquareOut,
  fit: FrameCorners,
  "first-aid": FirstAid,
  generate: MagicWand,
  health: Heartbeat,
  live: GlobeHemisphereWest,
  map: MapTrifold,
  mobile: DeviceMobile,
  open: Browser,
  pan: Hand,
  preview: Eye,
  publish: CloudArrowUp,
  refresh: ArrowsClockwise,
  save: FloppyDisk,
  select: Cursor,
  selection: Selection,
  settings: GearSix,
  sidebar: SidebarSimple,
  site: Desktop,
  start: Play,
  stop: Stop,
  success: CheckCircle,
  text: TextT,
  view: Eye,
  warning: WarningCircle,
  danger: XCircle,
  "zoom-in": MagnifyingGlassPlus,
  "zoom-out": MagnifyingGlassMinus,
};

const sizeMap: Record<Gnr8IconSize, number> = {
  compact: gnr8VisualTokens.icon.compactSize,
  default: 16,
  nav: gnr8VisualTokens.icon.defaultSize,
};

const colorMap: Record<Gnr8IconState, string | undefined> = {
  default: undefined,
  active: undefined,
  muted: gnr8VisualTokens.color.textMuted,
  danger: gnr8VisualTokens.color.danger,
  success: gnr8VisualTokens.color.success,
};

function iconWeight(state: Gnr8IconState, weight?: IconWeight): IconWeight {
  if (weight) return weight;
  if (state === "active") return "bold";
  return "regular";
}

export type Gnr8IconProps = {
  name: Gnr8IconName;
  label?: string;
  size?: Gnr8IconSize;
  state?: Gnr8IconState;
  weight?: IconWeight;
  className?: string;
  style?: React.CSSProperties;
};

export function Gnr8Icon(props: Gnr8IconProps) {
  const state = props.state ?? "default";
  const Component = iconMap[props.name];
  const accessibleProps = props.label
    ? { role: "img" as const, "aria-label": props.label }
    : { "aria-hidden": true as const };

  return (
    <Component
      {...accessibleProps}
      className={props.className}
      size={sizeMap[props.size ?? "default"]}
      weight={iconWeight(state, props.weight)}
      style={{
        color: colorMap[state] ?? "currentColor",
        flexShrink: 0,
        ...props.style,
      }}
    />
  );
}
