import React from "react";
import { resolveTextFromSlot, resolveUrlFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderCtaGroup({ component }: RenderComponentImplementationProps) {
  const slots = component.slots ?? {};

  const ctas = [
    {
      label: resolveTextFromSlot(slots["cta.label"] ?? slots.label, "Call to action"),
      href: resolveUrlFromSlot(slots["cta.href"] ?? slots.href),
    },
  ];

  return (
    <nav aria-label="Call to action" data-gnr8-render-kind="render.cta_group">
      <ul>
        {ctas.map((cta, index) => (
          <li key={`cta-${index}`}>
            <a href={cta.href}>{cta.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
