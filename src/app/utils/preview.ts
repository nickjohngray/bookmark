// Builds a preview screenshot URL from a raw URL (keeps exact logic).
export function previewUrl(raw: string): string {
  const normalized = raw.replace(/^http:\/\//, 'https://');
  return 'https://s.wordpress.com/mshots/v1/' +
    encodeURIComponent(normalized) +
    '?w=300&h=168';
}
