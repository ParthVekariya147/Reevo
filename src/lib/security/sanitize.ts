/**
 * Input sanitization helpers for API route boundaries.
 * Keeps things simple — no external deps, easy to audit.
 */

/** Trim + collapse whitespace + enforce a max length */
export function sanitizeString(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

/** Accept only a valid hex color string like #RRGGBB */
export function sanitizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim()) ? value.trim() : null;
}

/** Accept only known ISO-639-1 language codes */
const ALLOWED_LANGS = new Set(['en','es','fr','de','pt','it','ja','zh','ar','ru','ko','nl','pl','sv','da','fi','nb','tr','hi']);
export function sanitizeLang(value: unknown): string {
  if (typeof value !== 'string') return 'en';
  const v = value.trim().toLowerCase().slice(0, 5);
  return ALLOWED_LANGS.has(v) ? v : 'en';
}

/** 3–5 integer clamped to a range */
export function sanitizeRating(value: unknown, min = 1, max = 5): number {
  const n = Number(value);
  if (!Number.isInteger(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Allow http(s) URLs only; reject data:, javascript: and overly long strings */
export function sanitizeUrl(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  const url = value.trim().slice(0, maxLen);
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : '';
  } catch {
    return '';
  }
}

/** Sanitize a review_platforms array — each entry gets id/url/enabled validated */
const ALLOWED_PLATFORM_IDS = new Set([
  'google','yelp','tripadvisor','trustpilot','facebook',
  'yandex','2gis','flamp','booking','zomato','talabat',
  'productreview','truelocal','checkatrade',
]);

export function sanitizePlatforms(value: unknown): { id: string; url: string; enabled: boolean }[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter(Boolean)
    .slice(0, 20) // hard cap — no business needs >20 platforms
    .map(entry => {
      if (typeof entry !== 'object' || entry === null) return null;
      const e = entry as Record<string, unknown>;
      const id = typeof e.id === 'string' ? e.id.trim() : '';
      if (!ALLOWED_PLATFORM_IDS.has(id)) return null;
      return {
        id,
        url:     sanitizeUrl(e.url),
        enabled: Boolean(e.enabled),
      };
    })
    .filter((e): e is { id: string; url: string; enabled: boolean } => e !== null)
    .filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
}
