import { resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderRichText({ component }: RenderComponentImplementationProps) {
  const body = resolveTextFromSlot(component.slots?.body, "[rich text]");

  return (
    <section data-gnr8-render-kind="render.rich_text">
      <p>{body}</p>
    </section>
  );
}
