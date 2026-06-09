import React from "react";
import { resolveListFromSlot, resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderPricing({ component }: RenderComponentImplementationProps) {
  const title = resolveTextFromSlot(component.slots?.heading, "Pricing");
  const plans = resolveListFromSlot(component.slots?.plans ?? component.slots?.items, "Plan");

  return (
    <section data-gnr8-render-kind="render.pricing">
      <h3>{title}</h3>
      <ul>
        {(plans.length > 0 ? plans : ["[plan]"]).map((plan, index) => (
          <li key={`plan-${index}`}>{plan}</li>
        ))}
      </ul>
    </section>
  );
}
