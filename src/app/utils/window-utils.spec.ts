import { openWindow } from './window-utils';
import { Bookmark } from '../bookmark.model'; // <-- add this

describe('openWindow', () => {
  it('calls window.open with noopener in a new tab', () => {
    const spy = spyOn(window, 'open');

    const b: Bookmark = { id: '1', url: 'https://example.com' }; // <-- typed
    openWindow(b);

    expect(spy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
  });
});
