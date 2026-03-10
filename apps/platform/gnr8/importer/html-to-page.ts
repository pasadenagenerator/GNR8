import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";
import { randomUUID } from "crypto";

import {
  detectSectionFromHtmlBlock,
  splitHtmlIntoBlocks,
  tidyTitleFromHtml,
} from "@/gnr8/importer/html-section-detector";

export type HtmlImportInput = {
  slug: string;
  title?: string;
  html: string;
};

export function importHtmlToPage(input: HtmlImportInput): Gnr8Page {
  const slug = String(input.slug ?? "").trim();
  const html = String(input.html ?? "");
  const title = (input.title ?? "").trim() || tidyTitleFromHtml(html);

  const blocks = splitHtmlIntoBlocks(html);
  const sections: Gnr8Section[] =
    blocks.length > 0 ? blocks.map((b) => detectSectionFromHtmlBlock(b)) : [detectSectionFromHtmlBlock(html)];

  return {
    id: randomUUID(),
    slug,
    ...(title ? { title } : {}),
    sections,
  };
}

