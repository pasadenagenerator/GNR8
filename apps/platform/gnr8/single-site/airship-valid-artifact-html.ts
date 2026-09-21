export const AIRSHIP_ARTIFACT_DIAGNOSTIC_MARKERS = [
  /FALLBACK\s+PREVIEW/i,
  /raw-block\s*:/i,
  /\braw-block\b/i,
  /Diagnostics:\s*keys=/i,
  /\bDiagnostics:/i,
  /No CTA action link extracted/i,
  /script\s+diagnostics?/i,
  /raw\s+block\s+diagnostics?/i,
  /CAPTURE_DRIVEN/i,
] as const;

export type AirshipArtifactHtmlValidity = {
  valid: boolean;
  reasons: string[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function markerCount(html: string, marker: RegExp): number {
  return Array.from(html.matchAll(new RegExp(marker.source, marker.flags.includes("g") ? marker.flags : `${marker.flags}g`))).length;
}

function brandedContentMatchesMigration(html: string, migrationId: string | null | undefined): boolean {
  if (migrationId === "682a09fd-8fd5-4f73-93b8-54f5d4067c63") {
    return /\bCHS\b|chs\.si|cybersecurity|hybrid infrastructure|Less risk\. More control\. Better IT\.|The CHS team helps your IT change/i.test(html);
  }
  if (migrationId === "ebf62324-1e51-4435-abd7-004722fb48d6") {
    return /\bARIS\b|aris\.si|Apple|Canton|MacBook|prodaja@aris\.si|Zelim ponudbo|Želim ponudbo/i.test(html);
  }
  return true;
}

export function analyzeAirshipArtifactHtmlValidity(input: {
  html: unknown;
  migrationId?: string | null;
}): AirshipArtifactHtmlValidity {
  const html = text(input.html);
  const reasons: string[] = [];
  if (!html) {
    return { valid: false, reasons: ["html_missing"] };
  }

  if (!/<html\b/i.test(html) || !/<body\b/i.test(html)) {
    reasons.push("root_html_body_missing");
  }
  if (AIRSHIP_ARTIFACT_DIAGNOSTIC_MARKERS.some((marker) => marker.test(html))) {
    reasons.push("diagnostic_fallback_marker");
  }

  const airshipSectionCount = markerCount(html, /data-airship-section\s*=/i);
  if (airshipSectionCount < 1) {
    reasons.push("airship_section_markers_insufficient");
  }
  if (!/data-airship-section\s*=\s*["']hero["']/i.test(html)) {
    reasons.push("airship_hero_section_missing");
  }
  if (!/data-airship-element\s*=\s*["']hero-headline["']/i.test(html)) {
    reasons.push("airship_hero_headline_marker_missing");
  }
  if (!/<(?:main|header|section|article|footer)\b/i.test(html)) {
    reasons.push("page_section_structure_missing");
  }
  if (!brandedContentMatchesMigration(html, input.migrationId)) {
    reasons.push("migration_brand_content_missing");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

export function isValidPolishedAirshipArtifactHtml(input: {
  html: unknown;
  migrationId?: string | null;
}): boolean {
  return analyzeAirshipArtifactHtmlValidity(input).valid;
}
