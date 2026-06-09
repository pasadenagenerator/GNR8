import React from "react";
import { resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderTestimonial({ component }: RenderComponentImplementationProps) {
  const quote = resolveTextFromSlot(component.slots?.body ?? component.slots?.quote, "[testimonial]");
  const author = resolveTextFromSlot(component.slots?.author ?? component.slots?.heading, "[author]");

  return (
    <blockquote data-gnr8-render-kind="render.testimonial">
      <p>{quote}</p>
      <cite>{author}</cite>
    </blockquote>
  );
}
