import { Bookmark } from '../bookmark.model';

// Opens the bookmark URL in a new tab (keeps exact logic).
export function openWindow(b: Bookmark): void {
  window.open(b.url, '_blank', 'noopener');
}
