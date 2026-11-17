export const WORKING_DOMAIN_SUFFIX = '.app.pasadenagenerator.com';

/** A visible suggestion, never an ownership or availability decision. */
export function suggestWorkingDomain(sourceUrl: string): string {
  try {
    const labels = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '').split('.');
    const stem = labels[0]?.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
    return stem ? `${stem}${WORKING_DOMAIN_SUFFIX}` : '';
  } catch {
    return '';
  }
}

export function normalizeWorkingDomain(value: string): string | null {
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  const stem = host.endsWith(WORKING_DOMAIN_SUFFIX) ? host.slice(0, -WORKING_DOMAIN_SUFFIX.length) : '';
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(stem) ? host : null;
}
