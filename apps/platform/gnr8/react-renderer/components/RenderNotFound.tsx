import React from "react";

export type RenderNotFoundProps = {
  routePath: string;
};

export function RenderNotFound({ routePath }: RenderNotFoundProps) {
  return (
    <main data-gnr8-not-found="true" aria-live="polite">
      <h1>Page not found</h1>
      <p>No page matches route: {routePath}</p>
    </main>
  );
}
