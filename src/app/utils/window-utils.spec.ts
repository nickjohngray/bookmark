import { openWindow } from './window-utils';

describe('openWindow', () => {
  it('calls window.open with noopener in a new tab', () => {
    const spy = spyOn(window, 'open');
    openWindow({ id: '1', url: 'https://example.com' } as any);
    expect(spy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
  });
});
