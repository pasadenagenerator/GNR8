import { createGnr8Page } from "@/gnr8/core/page-model";
import type { Gnr8Page } from "@/gnr8/types/page";

export const examplePage: Gnr8Page = createGnr8Page({
  id: "page_home_demo",
  slug: "gnr8-test",
  title: "GNR8 Runtime Demo",
  sections: [
    {
      id: "sec_hero_1",
      type: "hero.split",
      props: {
        headline: "Launch pages from a canonical model",
        subheadline: "This page is rendered by the new GNR8 section registry and runtime renderer.",
      },
    },
    {
      id: "sec_logo_1",
      type: "logo.cloud",
      props: {
        logos: ["Acme", "Northstar", "Pioneer", "Vertex", "Bluefin", "Nimbus"],
      },
    },
    {
      id: "sec_feature_1",
      type: "feature.grid",
      props: {
        items: [
          { title: "Typed Model", text: "Pages and sections are defined with explicit TypeScript types." },
          { title: "Registry Driven", text: "Section types resolve through a central section registry." },
          { title: "Runtime Rendering", text: "Renderer composes pages by iterating canonical section JSON." },
        ],
      },
    },
  ],
});

