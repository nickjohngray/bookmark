import { normalizeUserUrlInput } from './normalize-url';

describe('normalizeUserUrlInput', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(normalizeUserUrlInput('')).toBeNull();
    expect(normalizeUserUrlInput('   ')).toBeNull();
  });

  it('blocks unsafe schemes', () => {
    expect(normalizeUserUrlInput('javascript:alert(1)')).toBeNull();
    expect(normalizeUserUrlInput('data:text/html,hi')).toBeNull();
    expect(normalizeUserUrlInput('vbscript:msgbox(1)')).toBeNull();
  });

  it('adds default scheme when missing', () => {
    expect(normalizeUserUrlInput('example.com', 'http')).toBe('http://example.com');
    expect(normalizeUserUrlInput('example.com', 'https')).toBe('https://example.com');
  });

  it('normalizes single/multiple slashes after a valid scheme', () => {
    expect(normalizeUserUrlInput('http:/foo.com')).toBe('http://foo.com');
    expect(normalizeUserUrlInput('https:////foo.com')).toBe('https://foo.com');
    expect(normalizeUserUrlInput('HTTP:/Example.com')).toBe('http://Example.com');
  });

  it('repairs common HTTP/HTTPS typos', () => {
    // http variants
    expect(normalizeUserUrlInput('htpp:/foo.com')).toBe('http://foo.com');
    expect(normalizeUserUrlInput('hppt:foo.com')).toBe('http://foo.com');
    expect(normalizeUserUrlInput('htp:foo.com')).toBe('http://foo.com');
    expect(normalizeUserUrlInput('ttp:foo.com')).toBe('http://foo.com'); // missing 'h'

    // https variants
    expect(normalizeUserUrlInput('httsp:/bar.com')).toBe('https://bar.com');
    expect(normalizeUserUrlInput('htts://bar.com')).toBe('https://bar.com');
    expect(normalizeUserUrlInput('httts:////bar.com')).toBe('https://bar.com');
    expect(normalizeUserUrlInput('ttps:bar.com')).toBe('https://bar.com'); // missing 'h'
  });

  it('cleans backslashes and stray whitespace around separators', () => {
    expect(normalizeUserUrlInput('http:\\\\site.com')).toBe('http://site.com');
    expect(normalizeUserUrlInput(' http: // / foo.com ')).toBe('http://foo.com');
  });

  it('keeps host/path case as typed (only scheme is lowercased)', () => {
    expect(normalizeUserUrlInput('Https:/MiXeDCase.com/Path')).toBe('https://MiXeDCase.com/Path');
  });

  it('rejects unknown schemes (e.g., ftp)', () => {
    expect(normalizeUserUrlInput('ftp://example.com')).toBeNull();
    expect(normalizeUserUrlInput('mailto:user@example.com')).toBeNull();
  });

  it('applies defaultScheme parameter correctly (localhost/IP examples)', () => {
    // you’ll typically call with 'http' for localhost/IP in app code,
    // but here we assert the function’s parameter behavior
    expect(normalizeUserUrlInput('127.0.0.1:3000', 'http')).toBe('http://127.0.0.1:3000');
    expect(normalizeUserUrlInput('localhost:4200', 'http')).toBe('http://localhost:4200');
  });

  it('passes through already-correct inputs untouched (aside from slash normalization)', () => {
    expect(normalizeUserUrlInput('http://ok.com')).toBe('http://ok.com');
    expect(normalizeUserUrlInput('https://ok.com/foo')).toBe('https://ok.com/foo');
  });
});
