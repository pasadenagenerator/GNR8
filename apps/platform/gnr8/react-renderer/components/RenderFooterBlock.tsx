import { resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderFooterBlock({ component }: RenderComponentImplementationProps) {
  const heading = resolveTextFromSlot(component.slots?.heading, "Footer");
  const body = resolveTextFromSlot(component.slots?.body, "[footer content]");

  return (
    <footer data-gnr8-render-kind="render.footer_block">
      <h4>{heading}</h4>
      <p>{body}</p>
    </footer>
  );
}
