import React from "react";
import { resolveMediaFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderImage({ component }: RenderComponentImplementationProps) {
  const media = resolveMediaFromSlot(component.slots?.image ?? component.slots?.media, "Image");

  return (
    <figure data-gnr8-render-kind="render.image">
      <img src={media.src} alt={media.alt} loading="lazy" />
    </figure>
  );
}
