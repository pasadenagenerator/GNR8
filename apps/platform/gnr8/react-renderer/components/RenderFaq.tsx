import React from "react";
import { resolveListFromSlot, resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderFaq({ component }: RenderComponentImplementationProps) {
  const title = resolveTextFromSlot(component.slots?.heading, "FAQ");
  const questions = resolveListFromSlot(component.slots?.items ?? component.slots?.questions, "Question");

  return (
    <section data-gnr8-render-kind="render.faq">
      <h3>{title}</h3>
      <dl>
        {(questions.length > 0 ? questions : ["[faq]"]).map((question, index) => (
          <div key={`faq-${index}`}>
            <dt>{question}</dt>
            <dd>{resolveTextFromSlot(component.slots?.body, "[answer]")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
