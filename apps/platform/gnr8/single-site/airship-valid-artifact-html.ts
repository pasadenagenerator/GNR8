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

export type AirshipPolishedArtifactHtmlCompleteness = {
  complete: boolean;
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
  return analyzeAirshipArtifactHtmlValidity(input).valid && analyzeAirshipPolishedArtifactHtmlCompleteness(input).complete;
}

export function analyzeAirshipPolishedArtifactHtmlCompleteness(input: {
  html: unknown;
  migrationId?: string | null;
}): AirshipPolishedArtifactHtmlCompleteness {
  const html = text(input.html);
  const reasons: string[] = [];
  const hasHeaderOrNav = /<(?:header|nav)\b/i.test(html);
  const hasFooter = /<footer\b|data-airship-section\s*=\s*["']footer["']/i.test(html);
  const hasHero = /data-airship-section\s*=\s*["']hero["']/i.test(html);
  const hasPrimaryCta = /data-airship-element\s*=\s*["']hero-cta["']|data-airship-element\s*=\s*["']contact-cta["']/i.test(html);

  if (input.migrationId === "682a09fd-8fd5-4f73-93b8-54f5d4067c63") {
    if (!hasHeaderOrNav || !/\bCHS\b|chs\.si/i.test(html)) reasons.push("chs_branded_header_nav_missing");
    if (!hasHero || !/(#(?:0b|1d|2563eb|0369a1|0f4c81|eef6ff)|blue|hero)/i.test(html)) reasons.push("chs_blue_hero_signal_missing");
    if (!/support|managed support|data-airship-element\s*=\s*["']support-card["']|data-airship-element\s*=\s*["']offer-card["']/i.test(html)) reasons.push("chs_support_card_signal_missing");
    if (!/data-airship-section\s*=\s*["']proof["']|proof|benefit|trust|expertise/i.test(html)) reasons.push("chs_proof_section_signal_missing");
    if (!/data-airship-section\s*=\s*["']approach["']|approach|process|assess|implement/i.test(html)) reasons.push("chs_approach_section_signal_missing");
    if (!hasPrimaryCta || !/contact|sales@chs\.si/i.test(html) || !hasFooter) reasons.push("chs_contact_footer_signal_missing");
  } else if (input.migrationId === "ebf62324-1e51-4435-abd7-004722fb48d6") {
    if (!hasHeaderOrNav || !/\bARIS\b|aris\.si/i.test(html)) reasons.push("aris_branded_header_nav_missing");
    if (!/Apple|MacBook|Mac Studio/i.test(html) || !/data-airship-element\s*=\s*["']offer-card["']|card/i.test(html)) reasons.push("aris_apple_offer_cards_missing");
    if (!/Canton\s+Smart|Canton/i.test(html) || !/data-airship-element\s*=\s*["']offer-card["']|card/i.test(html)) reasons.push("aris_canton_smart_cards_missing");
    if (!hasPrimaryCta || !/Kontaktirajte|Želim ponudbo|Zelim ponudbo|prodaja@aris\.si/i.test(html)) reasons.push("aris_contact_cta_missing");
    if (!hasFooter || !/Internal GNR8 demo preview|external and unchanged|www\.aris\.si/i.test(html)) reasons.push("aris_footer_note_missing");
  }

  return {
    complete: reasons.length === 0,
    reasons,
  };
}
