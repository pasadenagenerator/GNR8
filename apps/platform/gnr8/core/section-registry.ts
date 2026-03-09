import type { ComponentType } from "react";

import { FeatureGrid } from "@/gnr8/sections/FeatureGrid";
import { HeroSplit } from "@/gnr8/sections/HeroSplit";
import { LegacyHTML } from "@/gnr8/sections/LegacyHTML";
import { LogoCloud } from "@/gnr8/sections/LogoCloud";

export type Gnr8SectionComponent = ComponentType<Record<string, unknown>>;

export const sectionRegistry: Record<string, Gnr8SectionComponent> = {
  "hero.split": HeroSplit as Gnr8SectionComponent,
  "logo.cloud": LogoCloud as Gnr8SectionComponent,
  "feature.grid": FeatureGrid as Gnr8SectionComponent,
  "legacy.html": LegacyHTML as Gnr8SectionComponent,
};

