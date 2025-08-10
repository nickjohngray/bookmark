import { previewUrl } from './preview';

describe('previewUrl', () => {
  it('forces https and builds the mshots URL', () => {
    const out = previewUrl('http://example.com/path?a=1');
    expect(out).toContain('https://s.wordpress.com/mshots/v1/');
    expect(out).toContain(encodeURIComponent('https://example.com/path?a=1'));
    expect(out).toContain('?w=300&h=168');
  });

  it('leaves https as https and encodes correctly', () => {
    const out = previewUrl('https://example.com/ü?q=x y');
    expect(out).toContain(encodeURIComponent('https://example.com/ü?q=x y'));
  });
});
