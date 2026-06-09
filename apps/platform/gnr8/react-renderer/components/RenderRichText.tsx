import React from "react";
import { resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderRichText({ component }: RenderComponentImplementationProps) {
  const heading = component.slots?.heading ? resolveTextFromSlot(component.slots.heading, "") : "";
  const body = resolveTextFromSlot(component.slots?.body, "[rich text]");

  return (
    <section data-gnr8-render-kind="render.rich_text">
      {heading ? <h2>{heading}</h2> : null}
      <p>{body}</p>
    </section>
  );
}
