import type { Gnr8Page } from "@/gnr8/types/page";

import { SectionRenderer } from "@/gnr8/renderer/SectionRenderer";

type PageRendererProps = {
  page: Gnr8Page;
};

export function PageRenderer({ page }: PageRendererProps) {
  return (
    <main>
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </main>
  );
}

