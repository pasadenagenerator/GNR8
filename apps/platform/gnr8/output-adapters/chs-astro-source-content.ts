import type { NormalizedStaticBusinessSiteContent } from "./astro-static-site-adapter";

export const CHS_ASTRO_SOURCE_LINEAGE = {
  sourceUrl: "https://www.chs.si/",
  sourceSnapshotId: "imported-url-site-6cba4d2b35d630b5",
  sourceRunId: "client-site-import-1787042639018-4478bf08",
  sourceSiteVersionId: "14e6ff38-eef3-4790-8ffb-f72aa5d6cd35",
  sourceRuntimeArtifactId: "6ad7e726-9969-4c0c-9cfc-435a9f9dc7c1",
  sourceRawArtifactId: "02ee3fac-d7c6-4a6e-9e3d-488e994d5b52",
  sourceEvidenceReviewId: "40c0b86c-0349-4b7c-89c2-bfdef7e9fea3",
  capturedAt: "2026-08-18T08:44:12.553Z",
} as const;

export const CHS_ASTRO_ROUTE_INVENTORY = [
  { path: "/", role: "homepage", generation: "generated" },
  { path: "/cohesity", role: "source_discovered", generation: "authoritative_source_link" },
  { path: "/platform9", role: "source_discovered", generation: "authoritative_source_link" },
  { path: "/news", role: "source_discovered_listing", generation: "authoritative_source_link" },
  { path: "/home-hrvoje-org", role: "source_discovered", generation: "authoritative_source_link" },
] as const;

export const CHS_ASTRO_ASSET_INVENTORY = {
  capturedFileCount: 390,
  requiredSourceAssets: [
    "uploads/a2DwTvuE/480x0_320x0/chs-anim-web.gif",
    "uploads/f5URlcoZ/320x0_320x0/chs-logo-w-trp__msi___png.webp",
    "uploads/EcIR1Knd/chs-valovi-bg__msi___png.png",
    "uploads/Rp86HeCY/640x0_480x0/chs_web_Banner_motiv_05-02__msi___png.webp",
    "uploads/gKjkvY5s/538x0_480x0/chs_web_Banner_motiv_08_crop__msi___png.webp",
    "uploads/histrPxu/chs_web_Banner_motiv_10__msi___png.png",
    "uploads/oxCV0dyQ/chs_banner_motiv_05.webp",
    "uploads/xfI9Wywh/chs_web_Banner_motiv_11__msi___png.png",
  ],
  candidateAssetMode: "self_contained_text_and_css",
  unsupportedCapability: "astro_bridge_v1_has_no_binary_asset_storage",
} as const;

export const CHS_ASTRO_EXPORT_VERIFICATION = {
  expectedContent: [
    "<title>Home | CHS</title>",
    "The team that helps you change your IT to fit into every season and technology wave.",
    "VMware pricing change just became your opportunity",
    "Vendor-Neutral yet vendor supported advice",
    "sales@chs.si",
    "Copyright © 2026 CHS d.o.o. - All rights reserved",
  ],
  expectedThemeToken: "--gnr8-astro-accent: #ed7635;",
} as const;

export function chsAstroSourceContent(): NormalizedStaticBusinessSiteContent {
  return {
    siteName: "Home | CHS",
    brandName: "CHS d.o.o.",
    navItems: [
      { label: "Home", href: "#home" },
      { label: "Cohesity", href: "https://www.chs.si/cohesity" },
      { label: "Platform9", href: "https://www.chs.si/platform9" },
      { label: "News", href: "https://www.chs.si/news" },
      { label: "Home Hrvoje org", href: "https://www.chs.si/home-hrvoje-org" },
      { label: "Contact us", href: "#contact" },
    ],
    hero: {
      headline: "The team that helps you change your IT to fit into every season and technology wave.",
      body: "The people behind the technology matter more than the technology itself. We bring deep, lived expertise and the rare ability to drive real change — so you can move forward with confidence.",
      ctaLabel: "Contact us",
      ctaHref: "#contact",
    },
    sections: [
      {
        id: "identity",
        eyebrow: "Our identity",
        title: "Two characteristics that rarely exist together hand-in-hand",
        body: "Stabilty and experience tend to create habits. Change disrupts it. Most teams are either seasoned or agile. Rarely both at the same time. So we have built something genuinely rare.",
        cards: [
          {
            title: "Stability - Experience",
            body: "100+ years combined in enterprise IT infrastructure in a small team means each team member is approaching 3 decades of it. We have seen every cycle, every wave of disruption, we’ve been in the change from mainframe to PC-client-server archtecture over cloud - to AI computing. We know what actually works in production, under pressure, at scale.",
          },
          {
            title: "Change",
            body: "We do not protect the status quo. When your IT needs to evolve — infrastructure, tooling, AI, approach and organisation — we work together with you to change and improve it. Not theoretically. Practically.",
          },
        ],
      },
      {
        id: "reach",
        eyebrow: "CHS",
        title: "Experience and the ability to change",
        body: "A team that carries decades of enterprise knowledge and still has the conviction to change what needs to be changed and desire to do so. That duality is not accidental — it is the foundation of everything we do, and the reason our clients succeed with us for nearly 30 years. Established and now headquartered in Slovenia, CHS has been and is active across the region of South-Eastern Europe and beyond in Eastern Europe. We are quite at home in Middle East and Western Europe too – and have actually delivered occasionally on all continents.",
      },
      {
        id: "platform9-example",
        eyebrow: "A real-world example",
        title: "VMware pricing change just became your opportunity",
        body: "The dramatic increase in VMware licensing costs — 300–500% in many cases — has created a crisis for IT infrastructure teams. But within that crisis is a strategic opportunity for those with the experience to navigate it.",
        cards: [
          { title: "The Problem", body: "VMware costs surged 300-500%. Budget pressure is real. Reliability cannot be compromised." },
          { title: "Our Role", body: "We have navigated this migration for real clients, in production. We know where the traps are." },
          { title: "The Outcome", body: "Savings from virtualization become budget for AI tools, modernization, and competitive edge." },
          { title: "The insight", body: "Whoever successfully navigates the virtualization change creates the room to move forward — budget freed from VMware costs becomes investment in AI tools, modernization, and real competitive advantage." },
        ],
      },
      {
        id: "team",
        eyebrow: "The team",
        title: "Humans first, technology second. Always.",
        body: "Our website is not a product catalogue. It is the story of the people who show or stand up for you — with their expertise, judgement and their track record. We don’t get easily defined by the vendors we represent (unless they are great, which they are). We are defined by what we know, what we have seen, and how we help you.",
        cards: [
          { title: "100+ Years of Combined Experience", body: "Deep, individual expertise across enterprise IT infrastructure — each team member brings unique and complementary perspective." },
          { title: "10+ Years of Average Client Relationship", body: "We measure success in long-term partnerships, not transactions. Our goal is to still be working together a decade from now." },
          { title: "Vendor-Neutral yet vendor supported advice", body: "We are not paid to recommend specific products. We recommend what is right for your situation — and our experience tells us the difference." },
          { title: "Unique Combination", body: "Experience and the ability to change. Rare to find both in the same team. We have spent years deliberately building this capability." },
        ],
      },
    ],
    contact: {
      heading: "Ready or waiting to turn your IT challenge into a business advantage?",
      body: "The first conversation is about you — your situation, your constraints, your goals. No slide (unless you demand it …). Maybe a little vendor pitch – but objectivity and criteria come first. Just experienced people who want to understand your world and are there to improve it together with you.",
      email: "sales@chs.si",
      emails: ["change@chs.si", "heritage@chs.si", "horizon@chs.si", "stabillity@chs.si"],
      address: "Parmova ulica 51, Ljubljana, Slovenia",
    },
    footer: {
      text: "Copyright © 2026 CHS d.o.o. - All rights reserved · Website powered by PASADENA GENERATOR",
    },
    theme: {
      accentHex: "#ed7635",
      backgroundHex: "#ffffff",
      textHex: "#231f20",
      mutedHex: "#5f5a5b",
      surfaceHex: "#fce8dd",
      fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
      tone: "technical",
    },
  };
}
