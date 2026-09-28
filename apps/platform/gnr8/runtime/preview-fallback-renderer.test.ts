import assert from "node:assert/strict";
import test from "node:test";

import { renderPreviewFallbackSectionHtml } from "@/gnr8/runtime/preview-fallback-renderer";

test("CTA fallback preserves a direct section title ahead of nested link labels", () => {
  const html = renderPreviewFallbackSectionHtml({
    sectionType: "cta.basic",
    sectionProps: {
      title: "Plan your next upgrade",
      body: "Tell us what needs to become safer or easier to operate.",
      links: [
        { href: "mailto:hello@example.test", label: "hello@example.test" },
        { href: "tel:+38615550107", label: "+386 1 555 0107" },
      ],
    },
  });

  assert.match(html, /<h2[^>]*>Plan your next upgrade<\/h2>/);
  assert.doesNotMatch(html, /<h2[^>]*>hello@example\.test<\/h2>/);
});

test("fallback heading selection keeps recursive first-text behavior when direct headings are absent", () => {
  const html = renderPreviewFallbackSectionHtml({
    sectionType: "cta.basic",
    sectionProps: {
      body: "Contact the team.",
      links: [{ href: "mailto:hello@example.test", label: "Email the team" }],
    },
  });

  assert.match(html, /<h2[^>]*>Contact the team\.<\/h2>/);
});

test("fallback heading precedence is title, heading, headline, name, then label", () => {
  const html = renderPreviewFallbackSectionHtml({
    sectionType: "content.basic",
    sectionProps: {
      title: "Direct title",
      heading: "Direct heading",
      headline: "Direct headline",
      name: "Direct name",
      label: "Direct label",
      body: "Body copy.",
    },
  });

  assert.match(html, /<h2[^>]*>Direct title<\/h2>/);
});
