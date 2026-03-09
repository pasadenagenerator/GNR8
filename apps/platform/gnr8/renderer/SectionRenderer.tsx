import { sectionRegistry } from "@/gnr8/core/section-registry";
import type { Gnr8Section } from "@/gnr8/types/section";

type SectionRendererProps = {
  section: Gnr8Section;
};

export function SectionRenderer({ section }: SectionRendererProps) {
  const SectionComponent = sectionRegistry[section.type];

  if (!SectionComponent) {
    return (
      <section style={{ padding: "1rem 1.5rem", border: "1px solid #fca5a5", borderRadius: 8, margin: "1rem auto", maxWidth: 960 }}>
        <strong>Unknown section type:</strong> <code>{section.type}</code>
      </section>
    );
  }

  return <SectionComponent {...(section.props ?? {})} />;
}

