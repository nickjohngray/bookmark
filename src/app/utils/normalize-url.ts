// Small, deterministic normalizer for user‑entered URLs.
// - Fixes common scheme typos (http/https).
// - Normalizes slashes after the scheme.
// - Adds a default scheme if missing.
// - Blocks unsafe schemes (javascript:, data:, vbscript:).
export function normalizeUserUrlInput(
  raw: string,
  defaultScheme: 'http' | 'https' = 'http'
): string | null {
  if (!raw) return null;

  // Trim & sanitize obvious junk
  let s = raw.trim().replace(/\\+/g, '/').replace(/\s+/g, '');

  // Block unsafe schemes early
  if (/^(javascript|data|vbscript):/i.test(s)) return null;

  // Extract possible scheme
  const colonIdx = s.indexOf(':');
  let scheme = '';
  let rest = s;

  if (colonIdx > 0) {
    scheme = s.slice(0, colonIdx).toLowerCase();
    rest = s.slice(colonIdx + 1);
  }

  // Common human typos → canonical scheme
  const schemeFixes: Record<string, 'http' | 'https'> = {
    // http variants
    http: 'http',
    htp: 'http',
    htpp: 'http',
    hppt: 'http',
    hhttp: 'http',
    ttp: 'http',       // user missed leading 'h'
    // https variants
    https: 'https',
    httsp: 'https',
    htts: 'https',
    httts: 'https',
    hptts: 'https',
    tttps: 'https',
    ttps: 'https',     // user missed leading 'h'
  };

  // Helper: ensure exactly two slashes after scheme
  const ensureDoubleSlash = (r: string) => {
    // Strip any leading slashes then add exactly two
    const without = r.replace(/^\/+/, '');
    return '//' + without;
  };

  if (scheme) {
    const fixed = schemeFixes[scheme];
    if (fixed === 'http' || fixed === 'https') {
      return `${fixed}:${ensureDoubleSlash(rest)}`;
    }
    if (scheme === 'http' || scheme === 'https') {
      return `${scheme}:${ensureDoubleSlash(rest)}`;
    }
    // Unknown scheme -> reject; we only allow http(s) in this app
    return null;
  }

  // No scheme given: add default
  return `${defaultScheme}://${s.replace(/^\/+/, '')}`;
}
