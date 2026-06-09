import React from "react";
import { resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderHeading({ component }: RenderComponentImplementationProps) {
  const heading = resolveTextFromSlot(component.slots?.heading, "[heading]");

  return (
    <header data-gnr8-render-kind="render.heading">
      <h2>{heading}</h2>
    </header>
  );
}
