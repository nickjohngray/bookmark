// Purpose: Single source of truth for bookmarks (storage + in‑memory + de‑dup)

import { Injectable } from '@angular/core';

export interface Bookmark {
  id: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly storageKey = 'bookmarks';

  // In‑memory state mirrors localStorage
  private bookmarks: Bookmark[] = [];

  // Fast duplicate detection on *normalized* URLs
  private normalizedUrlSet = new Set<string>();

  constructor() {
    this.loadFromStorage();
  }

  // ---- Public API ----------------------------------------------------------

  /** Return a fresh copy of all bookmarks (keeps callers from mutating state). */
  getBookmarks(): Bookmark[] {
    this.loadFromStorage();
    return [...this.bookmarks];
  }

  /**
   * Try to add a bookmark. Returns { ok: true } on success.
   * Duplicate detection is done on a normalized URL string.
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

  /** Update a bookmark’s URL (keeps ID stable). */
  updateBookmark(id: string, newRawUrl: string): { ok: boolean; reason?: 'duplicate' | 'invalid' } {
    const idx = this.bookmarks.findIndex(b => b.id === id);
    if (idx === -1) return { ok: false, reason: 'invalid' };

    const normalized = this.normalizeUrl(newRawUrl);
    if (!normalized) return { ok: false, reason: 'invalid' };

    // If the URL is unchanged, treat as success
    const currentNormalized = this.normalizeUrl(this.bookmarks[idx].url)!;
    if (normalized !== currentNormalized && this.normalizedUrlSet.has(normalized)) {
      return { ok: false, reason: 'duplicate' };
    }

    // Update sets
    this.normalizedUrlSet.delete(currentNormalized);
    this.bookmarks[idx].url = normalized;
    this.normalizedUrlSet.add(normalized);
    this.saveToStorage();
    return { ok: true };
  }

  /** Remove a bookmark by ID. */
  deleteBookmark(id: string): void {
    const idx = this.bookmarks.findIndex(b => b.id === id);
    if (idx === -1) return;

    const norm = this.normalizeUrl(this.bookmarks[idx].url);
    if (norm) this.normalizedUrlSet.delete(norm);

    this.bookmarks.splice(idx, 1);
    this.saveToStorage();
  }

  /** Clear everything: storage, in‑memory list, and de‑dup set. */
  clearAll(): void {
    localStorage.removeItem(this.storageKey);
    this.bookmarks = [];
    this.normalizedUrlSet.clear();
  }

  // ---- Private helpers -----------------------------------------------------

  /** Normalize a URL and return a canonical string; returns null if invalid. */
  private normalizeUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Add protocol if missing
    const withProtocol = /^[a-zA-Z][\w+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;

    try {
      const u = new URL(withProtocol);

      // Canonicalize: lower-case host, strip default ports, drop trailing slash
      const host = u.hostname.toLowerCase();
      const protocol = u.protocol.toLowerCase();
      const pathname = u.pathname.replace(/\/$/, '');
      const port = (u.port && !this.isDefaultPort(protocol, u.port)) ? `:${u.port}` : '';

      return `${protocol}//${host}${port}${pathname}${u.search}${u.hash}`;
    } catch {
      return null;
    }
  }

  private isDefaultPort(protocol: string, port: string): boolean {
    return (protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443');
  }

  /** Read from localStorage into memory + rebuild de‑dup set. */
  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    this.bookmarks = raw ? JSON.parse(raw) : [];
    this.normalizedUrlSet = new Set(
      this.bookmarks
        .map(b => this.normalizeUrl(b.url))
        .filter((s): s is string => !!s)
    );
  }

  /** Persist current in‑memory list to localStorage. */
  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.bookmarks));
  }

  /** Mobile‑safe UUID: crypto.randomUUID if available, else fallback. */
  private generateSafeUUID(): string {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
    // RFC4122-ish fallback (not perfect, good enough for IDs here)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
