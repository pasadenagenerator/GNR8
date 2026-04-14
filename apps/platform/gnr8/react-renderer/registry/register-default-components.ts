import { RenderCardGrid } from "@/gnr8/react-renderer/components/RenderCardGrid";
import { RenderCtaGroup } from "@/gnr8/react-renderer/components/RenderCtaGroup";
import { RenderFaq } from "@/gnr8/react-renderer/components/RenderFaq";
import { RenderFooterBlock } from "@/gnr8/react-renderer/components/RenderFooterBlock";
import { RenderGallery } from "@/gnr8/react-renderer/components/RenderGallery";
import { RenderGeneric } from "@/gnr8/react-renderer/components/RenderGeneric";
import { RenderHeading } from "@/gnr8/react-renderer/components/RenderHeading";
import { RenderHero } from "@/gnr8/react-renderer/components/RenderHero";
import { RenderImage } from "@/gnr8/react-renderer/components/RenderImage";
import { RenderPricing } from "@/gnr8/react-renderer/components/RenderPricing";
import { RenderRichText } from "@/gnr8/react-renderer/components/RenderRichText";
import { RenderTestimonial } from "@/gnr8/react-renderer/components/RenderTestimonial";
import { createRenderComponentRegistry } from "@/gnr8/react-renderer/registry/render-component-registry";
import type { RenderComponentRegistry } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function registerDefaultComponents(registry: RenderComponentRegistry = createRenderComponentRegistry()): RenderComponentRegistry {
  registry.register("render.hero", RenderHero);
  registry.register("render.heading", RenderHeading);
  registry.register("render.rich_text", RenderRichText);
  registry.register("render.image", RenderImage);
  registry.register("render.cta_group", RenderCtaGroup);
  registry.register("render.card_grid", RenderCardGrid);
  registry.register("render.gallery", RenderGallery);
  registry.register("render.testimonial", RenderTestimonial);
  registry.register("render.pricing", RenderPricing);
  registry.register("render.faq", RenderFaq);
  registry.register("render.footer_block", RenderFooterBlock);
  registry.register("render.generic", RenderGeneric);

  return registry;
}
