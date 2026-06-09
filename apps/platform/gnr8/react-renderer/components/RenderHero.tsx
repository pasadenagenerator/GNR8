import React from "react";
import { resolveMediaFromSlot, resolveTextFromSlot, resolveUrlFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderHero({ component }: RenderComponentImplementationProps) {
  const slots = component.slots ?? {};
  const heading = resolveTextFromSlot(slots.heading, "[hero heading]");
  const body = resolveTextFromSlot(slots.body, "[hero body]");
  const media = resolveMediaFromSlot(slots.image ?? slots.media, "Hero media");
  const ctaLabel = resolveTextFromSlot(slots["cta.label"] ?? slots.cta_label, "Learn more");
  const ctaHref = resolveUrlFromSlot(slots["cta.href"] ?? slots.cta_url);

  return (
    <article data-gnr8-render-kind="render.hero">
      <div>
        <h1>{heading}</h1>
        <p>{body}</p>
        <a href={ctaHref}>{ctaLabel}</a>
      </div>
      <div>
        <img src={media.src} alt={media.alt} loading="lazy" />
      </div>
    </article>
  );
}
