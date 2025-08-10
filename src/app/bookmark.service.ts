// -----------------------------------------------------------------------------
// BookmarkService
// Purpose:
// - Single source of truth for all bookmarks in the app.
// - Manages storage (localStorage), in-memory state, and duplicate prevention.
// - Exposes a clean public API for components to add, update, delete, or read
//   bookmarks without knowing about the underlying persistence logic.
// -----------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { Bookmark } from './bookmark.model';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  /** Key used to store bookmark data in localStorage */
  private readonly storageKey = 'bookmarks';

  /** In-memory list of bookmarks; mirrors what’s in localStorage */
  private bookmarks: Bookmark[] = [];

  /** Fast duplicate detection using normalized URLs as keys */
  private normalizedUrlSet = new Set<string>();

  constructor() {
    // Load initial state from storage into memory
    this.loadFromStorage();
  }

  // ===========================================================================
  // Public API — used by components and other services
  // ===========================================================================

  /**
   * Get all bookmarks (returns a copy so callers can’t mutate internal state).
   * Always reloads from storage in case it was modified elsewhere.
   */
  getBookmarks(): Bookmark[] {
    this.loadFromStorage();
    return [...this.bookmarks];
  }

  /**
   * Add a new bookmark.
   * - Normalizes the URL before storing.
   * - Rejects duplicates or invalid URLs.
   * @returns `{ ok: true }` on success or `{ ok: false, reason }` on failure.
   */
  addBookmark(rawUrl: string): { ok: boolean; reason?: 'duplicate' | 'invalid' } {
    const normalized = this.normalizeUrl(rawUrl);
    if (!normalized) return { ok: false, reason: 'invalid' };

    if (this.normalizedUrlSet.has(normalized)) {
      return { ok: false, reason: 'duplicate' };
    }

    const id = this.generateSafeUUID();
    const bookmark: Bookmark = { id, url: normalized };
    this.bookmarks.unshift(bookmark);
    this.normalizedUrlSet.add(normalized);
    this.saveToStorage();
    return { ok: true };
  }

  /**
   * Update the URL for an existing bookmark (ID stays the same).
   * - Normalizes the new URL.
   * - Detects duplicates against all other bookmarks.
   * - Treats unchanged URLs as a success (no write needed).
   */
  updateBookmark(id: string, newRawUrl: string): { ok: boolean; reason?: 'duplicate' | 'invalid' } {
    const idx = this.bookmarks.findIndex(b => b.id === id);
    if (idx === -1) return { ok: false, reason: 'invalid' };

    const normalized = this.normalizeUrl(newRawUrl);
    if (!normalized) return { ok: false, reason: 'invalid' };

    const currentNormalized = this.normalizeUrl(this.bookmarks[idx].url)!;
    if (normalized !== currentNormalized && this.normalizedUrlSet.has(normalized)) {
      return { ok: false, reason: 'duplicate' };
    }

    // Update in-memory + de-dup set
    this.normalizedUrlSet.delete(currentNormalized);
    this.bookmarks[idx].url = normalized;
    this.normalizedUrlSet.add(normalized);
    this.saveToStorage();
    return { ok: true };
  }

  /** Delete a bookmark by ID. Also removes it from the de-dup set. */
  deleteBookmark(id: string): void {
    const idx = this.bookmarks.findIndex(b => b.id === id);
    if (idx === -1) return;

    const norm = this.normalizeUrl(this.bookmarks[idx].url);
    if (norm) this.normalizedUrlSet.delete(norm);

    this.bookmarks.splice(idx, 1);
    this.saveToStorage();
  }

  /** Clear all bookmarks from both localStorage and memory. */
  clearAll(): void {
    localStorage.removeItem(this.storageKey);
    this.bookmarks = [];
    this.normalizedUrlSet.clear();
  }

  // ===========================================================================
  // Private helpers — internal logic only
  // ===========================================================================

  /**
   * Normalize a URL:
   * - Adds `http://` if protocol is missing.
   * - Lowercases host and protocol.
   * - Strips default ports (80/443).
   * - Removes trailing slash from path.
   * Returns `null` if invalid.
   */
  private normalizeUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Ensure protocol is present; default to http:// if missing
    const withProtocol = /^[a-zA-Z][\w+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;

    try {
      const u = new URL(withProtocol);

      const host = u.hostname.toLowerCase();
      const protocol = u.protocol.toLowerCase();
      const pathname = u.pathname.replace(/\/$/, ''); // strip trailing slash
      const port = (u.port && !this.isDefaultPort(protocol, u.port)) ? `:${u.port}` : '';

      return `${protocol}//${host}${port}${pathname}${u.search}${u.hash}`;
    } catch {
      return null;
    }
  }

  /** Detects if a port is the default for the given protocol. */
  private isDefaultPort(protocol: string, port: string): boolean {
    return (protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443');
  }

  /** Load bookmarks from localStorage and rebuild the normalized URL set. */
  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    this.bookmarks = raw ? JSON.parse(raw) : [];
    this.normalizedUrlSet = new Set(
      this.bookmarks
        .map(b => this.normalizeUrl(b.url))
        .filter((s): s is string => !!s)
    );
  }

  /** Save current bookmarks array to localStorage. */
  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.bookmarks));
  }

  /**
   * Generate a UUID in a mobile-safe way.
   * - Uses `crypto.randomUUID` if available.
   * - Falls back to a RFC4122-ish random string if not.
   */
  private generateSafeUUID(): string {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
