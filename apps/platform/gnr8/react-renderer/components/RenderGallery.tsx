import { resolveListFromSlot, resolveMediaFromSlot, resolveTextFromSlot } from "@/gnr8/react-renderer/core/slot-utils";
import type { RenderComponentImplementationProps } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export function RenderGallery({ component }: RenderComponentImplementationProps) {
  const title = resolveTextFromSlot(component.slots?.heading, "Gallery");
  const items = resolveListFromSlot(component.slots?.items ?? component.slots?.images, "Image");
  const fallbackMedia = resolveMediaFromSlot(component.slots?.image ?? component.slots?.media, "Gallery image");

  return (
    <section data-gnr8-render-kind="render.gallery">
      <h3>{title}</h3>
      <ul>
        {(items.length > 0 ? items : [fallbackMedia.alt]).map((item, index) => (
          <li key={`gallery-${index}`}>
            <img src={fallbackMedia.src} alt={item} loading="lazy" />
          </li>
        ))}
      </ul>
    </section>
  );
}
