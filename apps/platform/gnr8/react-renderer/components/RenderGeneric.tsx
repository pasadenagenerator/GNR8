import { renderGenericSlotValue, slotKeysSorted, stringifyDeterministic } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderGeneric({ component }: RenderComponentImplementationProps) {
  const slotKeys = slotKeysSorted(component.slots);

  return (
    <section data-gnr8-render-kind="render.generic" aria-label="Generic component fallback">
      <p>Generic component fallback</p>
      <dl>
        <dt>componentId</dt>
        <dd>{component.componentId}</dd>
        <dt>renderKind</dt>
        <dd>{component.renderKind}</dd>
        <dt>fallbackReason</dt>
        <dd>{component.fallback?.reason ?? "none"}</dd>
      </dl>

      <details>
        <summary>Props</summary>
        <pre>{stringifyDeterministic(component.props)}</pre>
      </details>

      <div>
        {slotKeys.length === 0 ? <p>[no-slots]</p> : null}
        {slotKeys.map((slotKey) => (
          <div key={`slot-${slotKey}`} data-gnr8-slot-key={slotKey}>
            <strong>{slotKey}</strong>
            {renderGenericSlotValue(component.slots?.[slotKey])}
          </div>
        ))}
      </div>
    </section>
  );
}
