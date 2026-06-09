import React from "react";
import { resolveListFromSlot, resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderCardGrid({ component }: RenderComponentImplementationProps) {
  const title = resolveTextFromSlot(component.slots?.heading, "Cards");
  const items = resolveListFromSlot(component.slots?.items ?? component.slots?.cards, "Card");

  return (
    <section data-gnr8-render-kind="render.card_grid">
      <h3>{title}</h3>
      <ul>
        {(items.length > 0 ? items : ["[card 1]"]).map((item, index) => (
          <li key={`card-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
