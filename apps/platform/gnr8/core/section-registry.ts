import type { ComponentType } from "react";

import { CtaSimple } from "@/gnr8/sections/CtaSimple";
import { FeatureGrid } from "@/gnr8/sections/FeatureGrid";
import { FaqBasic } from "@/gnr8/sections/FaqBasic";
import { FooterBasic } from "@/gnr8/sections/FooterBasic";
import { HeroSplit } from "@/gnr8/sections/HeroSplit";
import { LegacyHTML } from "@/gnr8/sections/LegacyHTML";
import { LogoCloud } from "@/gnr8/sections/LogoCloud";
import { NavbarBasic } from "@/gnr8/sections/NavbarBasic";
import { PricingBasic } from "@/gnr8/sections/PricingBasic";

export type Gnr8SectionComponent = ComponentType<Record<string, unknown>>;

export const sectionRegistry: Record<string, Gnr8SectionComponent> = {
  "hero.split": HeroSplit as Gnr8SectionComponent,
  "logo.cloud": LogoCloud as Gnr8SectionComponent,
  "feature.grid": FeatureGrid as Gnr8SectionComponent,
  "legacy.html": LegacyHTML as Gnr8SectionComponent,
  "navbar.basic": NavbarBasic as Gnr8SectionComponent,
  "footer.basic": FooterBasic as Gnr8SectionComponent,
  "cta.simple": CtaSimple as Gnr8SectionComponent,
  "faq.basic": FaqBasic as Gnr8SectionComponent,
  "pricing.basic": PricingBasic as Gnr8SectionComponent,
};
