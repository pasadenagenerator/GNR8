import React from "react";

export type RenderEmptyPageProps = {
  pageId: string;
};

export function RenderEmptyPage({ pageId }: RenderEmptyPageProps) {
  return (
    <section data-gnr8-empty-page="true" aria-live="polite">
      <h2>Empty page</h2>
      <p>Page '{pageId}' has no sections to render.</p>
    </section>
  );
}
