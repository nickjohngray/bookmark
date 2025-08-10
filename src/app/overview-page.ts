// OVERVIEW PAGE LOGIC (REPLACE)
// Purpose: add/edit/delete + pagination + clear-all + dev seeding helpers.
// Adds mobile/desktop preview dock (showPreview / clearPreview) with slide animation support.

import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
  ElementRef,
  OnInit,
  AfterViewInit, inject,
} from '@angular/core';
import { Bookmark } from './bookmark.model';
import { BookmarkService } from './bookmark.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import testBookmarks from './data/bookmarks.json';
import { normalizeUserUrlInput } from './utils/normalize-url';
import { previewUrl } from './utils/preview';
import { openWindow } from './utils/window-utils';
import { handleKeyDown as handleKeyDownUtil } from './utils/dom-navigation';

@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.html',
  styleUrls: ['./overview-page.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class OverviewPage implements OnInit, AfterViewInit {
  /* -------------------------------------------------------------------------
     Dependency Injection (Angular 16+ `inject` API)

     We pull Router and BookmarkService with `inject(...)` instead of a
     constructor. This keeps the class header minimal and still provides
     typed, private fields accessible anywhere in the component.
  ------------------------------------------------------------------------- */
  private router = inject(Router);
  private bookmarkService = inject(BookmarkService);

  /* -------------------------------------------------------------------------
     Re-expose imported utility functions as component properties.

     Why:
     - These functions (`previewUrl` and `openWindow`) were moved out of the
       component into the `utils/` folder for better code organization,
       reusability, and unit-testability.
     - However, our Angular templates still call them as if they are methods
       of this component (e.g., `(click)="openWindow(bookmark)"` or
       `[src]="previewUrl(bookmark.url)"`).
     - By assigning the imported functions to class properties with the same
       names, we preserve the original template bindings without changing
       any HTML.

     Benefit:
     - Keeps the `OverviewPage` component smaller and easier to read.
     - Allows us to test these utilities in isolation without spinning up
       the whole component.
     - Maintains backwards compatibility with existing template code.

     Note:
     - `handleKeyDown` is *not* re-exposed this way because we need it to be
       decorated with `@HostListener` for global key event handling. If we
       assigned it directly, the `@HostListener` decorator would be bypassed.
  ------------------------------------------------------------------------- */
  previewUrl = previewUrl;
  openWindow = openWindow;
  // handleKeyDown = handleKeyDown; //  intentionally omitted

  /* -------------------------------------------------------------------------
     Global keyboard handling

     We subscribe at the `document` level so arrow-key navigation and other
     shortcuts work regardless of which element is focused. The logic itself
     lives in a shared util (testable and reusable); this method is a thin
     adapter between Angular and our pure function.
  ------------------------------------------------------------------------- */
  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    handleKeyDownUtil(event);
  }

  /* -------------------------------------------------------------------------
     State: source of truth for the template

     - `bookmarks`: all stored items from the service (full dataset).
     - `paginatedBookmarks`: the current visible slice (per page).
     - `pageSize`/`currentPage`/`totalPages`: PHQ spec requires 20 per page.
     - `editingId`/`editingValue`: tracks edit mode.
     - `hoveredId`/`hoveredBookmark`/`focusedId`: UX states for hover/focus.
     - `previewVisible`: toggles CSS class to animate preview dock.
     - `isMobileDevice`: coarse UA check so we can tweak small-screen UX.
  ------------------------------------------------------------------------- */
  bookmarks: Bookmark[] = [];
  paginatedBookmarks: Bookmark[] = [];
  readonly pageSize = 20;
  currentPage = 1;
  totalPages = 1;
  editingId: string | null = null;
  editingValue = '';
  hoveredId: string | null = null;
  hoveredBookmark: { id: string; url: string } | null = null;
  focusedId: string | null = null;
  previewVisible = false;
  isMobileDevice = false;

  /* -------------------------------------------------------------------------
     Template ElementRefs (safe optional focus management)

     - `editInputRef`: edit textbox inside the row (when present).
     - `addInputRef`: the "Add a URL" textbox at the top. Focused on load
       and when returning from Thank You page to keep the flow snappy.
  ------------------------------------------------------------------------- */
  @ViewChild('editInput') editInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('addInput') addInputRef!: ElementRef<HTMLInputElement>;

  /* -------------------------------------------------------------------------
     Global click/focus listeners

     We exit edit mode when the user clicks or tabs away from the editing UI.
     Using both `click` and `focusin` ensures the UX is consistent for mouse
     and keyboard users and improves accessibility.
  ------------------------------------------------------------------------- */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    this.stopEditIfClickOutSide(target);
  }

  @HostListener('document:focusin', ['$event'])
  handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    this.stopEditIfClickOutSide(target);
  }

  /**
   * Stops editing mode if user clicks outside the currently editing bookmark item.
   * This prevents a stale edit UI from lingering when the user shifts attention.
   */
  private stopEditIfClickOutSide(target: HTMLElement): void {
    if (!this.editingId) return;
    const editingIndex = this.bookmarks.findIndex(b => b.id === this.editingId);
    const itemEl = document.getElementById(`bookmark-item-${editingIndex}`);
    if (!itemEl?.contains(target)) {
      this.cancelEdit();
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  ngAfterViewInit(): void {
    /* Focus the add input on first load. Wrapped in setTimeout so the view
       is fully initialized before we attempt to focus, avoiding race issues. */
    setTimeout(() => this.addInputRef?.nativeElement?.focus());
  }

  ngOnInit(): void {
    /* -----------------------------------------------------------------------
       Read navigation state (e.g., came from Thank You page).
       If `fromThankYou` is set, we return focus to the add input so the user
       can continue adding links without extra clicks. */
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { fromThankYou?: boolean } | undefined;

    /* -----------------------------------------------------------------------
       Coarse device detection for mobile/tablet experience tweaks. */
    this.isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);

    /* -----------------------------------------------------------------------
       Restore focus to "Add a URL" when returning from Thank You page. */
    if (state?.fromThankYou) {
      setTimeout(() => this.addInputRef?.nativeElement?.focus());
    }

    /* -----------------------------------------------------------------------
       Load all bookmarks from the service and build the first page. */
    this.bookmarks = this.bookmarkService.getBookmarks();
    this.refreshFromService();
  }

  // -------------------------------------------------------------------------
  // Preview dock (desktop hover + mobile tap)
  // -------------------------------------------------------------------------
  /** Show preview for a bookmark (works on hover for desktop, tap for mobile). */
  showPreview(bookmark: Bookmark): void {
    if (this.editingId) return; // don’t show while editing
    this.hoveredId = bookmark.id;
    this.hoveredBookmark = { id: bookmark.id, url: bookmark.url };
    // Reset then trigger so CSS transition reliably fires
    this.previewVisible = false;
    setTimeout(() => (this.previewVisible = true), 0);
  }

  /** Hide the preview (mouseleave, blur, or pressing the close button). */
  clearPreview(): void {
    this.previewVisible = false;
    // Let the animation complete before clearing data to avoid jank
    setTimeout(() => {
      this.hoveredId = null;
      this.hoveredBookmark = null;
    }, 250);
  }

  // -------------------------------------------------------------------------
  // Add / Edit / Delete
  // -------------------------------------------------------------------------
  /** Add a URL from the input element; validates + (best‑effort) existence check. */
  async add(urlInput: HTMLInputElement): Promise<void> {
    const raw = urlInput.value.trim();
    if (!raw) return;

    // Normalize and validate user input (protocol defaults / typo recovery).
    const normalized = normalizeUserUrlInput(raw);
    if (!normalized) {
      alert('Invalid URL. Include a valid domain (protocol added automatically).');
      urlInput.focus();
      return;
    }

    // Existence check: treat any resolved `no-cors` HEAD as "likely exists".
    const exists = await this.checkUrlExists(normalized);
    if (!exists) {
      const go = confirm('That URL did not respond. Add it anyway?');
      if (!go) {
        urlInput.focus();
        return;
      }
    }

    // Persist via service; handle duplicates and failures gracefully.
    const res = this.bookmarkService.addBookmark(normalized);
    if (!res.ok) {
      if (res.reason === 'duplicate') {
        alert('That URL is already saved.');
        urlInput.focus();
      } else {
        alert('Could not add that URL.');
      }
      return;
    }

    // Clear input then navigate to Thank You page (brief flow confirmation).
    urlInput.value = '';
    await this.router.navigate(['/thank-you'], {
      queryParams: { url: normalized },
      state: { submittedUrl: normalized, fromOverview: true }
    });
  }

  /** Begin editing a bookmark and focus to the input. */
  startEditingAndFocusToInput(b: Bookmark): void {
    // Avoid redundant re-entry if the same item is already in edit mode.
    if (this.editingId === b.id) return;
    this.startEditing(b);
    const editingIndex = this.bookmarks.findIndex(x => x.id === this.editingId);
    const bookmarkItem = document.getElementById(`bookmark-item-${editingIndex}`);
    setTimeout(() => {
      const editTextBox = bookmarkItem?.querySelector('input') as HTMLInputElement | null;
      if (editTextBox) {
        editTextBox.focus();
        // Place caret at beginning to signal “type to replace”
        editTextBox.setSelectionRange(0, 0);
      }
    });
  }

  /** Begin editing a bookmark. */
  startEditing(b: Bookmark): void {
    if (this.editingId === b.id) return;
    this.editingId = b.id;
    this.editingValue = b.url;
    this.focusedId = b.id;
  }

  /** Save current edit. */
  async save($event: Event): Promise<void> {
    if (!this.editingId) return;

    // Prevent Enter bubbling from triggering unintended handlers upstream.
    $event.stopPropagation();

    // If value didn’t change, skip write and move to next item for speed.
    const editingIndex = this.bookmarks.findIndex(b => b.id === this.editingId);
    const oldBookmark: Bookmark | undefined = this.bookmarks[editingIndex];
    if (oldBookmark?.url === this.editingValue) {
      setTimeout(() => this.editNextItem(editingIndex),);
      return;
    }

    // Validate and normalize the new value (same path as Add).
    const raw = this.editingValue.trim();
    if (!raw) return;
    const normalized = normalizeUserUrlInput(raw);
    if (!normalized) {
      alert('Invalid URL. Include a valid domain (protocol added automatically).');
      // target.focus();
      return;
    }

    // Best-effort existence check (same UX as Add).
    const exists = await this.checkUrlExists(normalized);
    if (!exists) {
      const go = confirm('That URL did not respond. Add it anyway?');
      if (!go) {
        // target.focus();
        return;
      }
    }

    // Persist edit via service and handle duplicate collisions.
    const res = this.bookmarkService.updateBookmark(this.editingId, normalized);
    if (!res.ok) {
      if (res.reason === 'duplicate') {
        alert('That URL is already saved.');
        // target.focus();
      } else {
        alert('Could not add that URL.');
      }
      return;
    }

    // Exit edit mode, refresh list, then move focus down one item.
    this.editingId = null;
    this.editingValue = '';
    this.refreshFromService();
    setTimeout(() => this.editNextItem(editingIndex - 1),);
  }

  /** Cancel editing. */
  cancelEdit(): void {
    this.editingId = null;
    this.editingValue = '';
    // Ensure hover states are clean after cancelling (prevents stale UI)
    this.hoveredId = null;
    this.hoveredBookmark = null;
    this.previewVisible = false;
  }

  /** Delete a bookmark by ID. */
  delete(id: string): void {
    this.bookmarkService.deleteBookmark(id);
    // If we just deleted the item being previewed, clear the preview
    if (this.hoveredId === id) this.clearPreview();
    this.refreshFromService();
  }

  // -------------------------------------------------------------------------
  // DEV: Seeding helpers (used by dev-tools buttons)
  // -------------------------------------------------------------------------
  /** Seed test data (defaults to 100 unique items). */
  loadTestData(): void {
    this.bookmarkService.clearAll();
    const urls = testBookmarks;
    for (const { url } of urls) {
      this.bookmarkService.addBookmark(url);
    }
    this.refreshFromService(true);
  }

  /** Add a single sample entry with a unique suffix. */
  addSample(): void {
    const url = `https://google.com/sample-${Date.now()}`;
    const res = this.bookmarkService.addBookmark(url);
    if (!res.ok && res.reason === 'duplicate') {
      alert('That URL is already saved.');
      return;
    }
    this.refreshFromService(true);
  }

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------
  /** Navigate to page `n` if in range and rebuild the visible slice. */
  goToPage(n: number): void {
    if (n < 1 || n > this.totalPages) return;
    this.currentPage = n;
    this.updatePagination();
  }

  /** Convenience helpers for next/previous page controls. */
  nextPage(): void { this.goToPage(this.currentPage + 1); }
  prevPage(): void { this.goToPage(this.currentPage - 1); }

  // -------------------------------------------------------------------------
  // Clear all
  // -------------------------------------------------------------------------
  /** Clear everything (storage + memory) and reset pagination/state). */
  clearAll(): void {
    this.bookmarkService.clearAll();
    this.bookmarks = [];
    this.paginatedBookmarks = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.clearPreview();
    this.cancelEdit();
    this.refreshFromService();
  }

  // -------------------------------------------------------------------------
  // Keyboard helpers (optional; template-safe no-ops)
  // -------------------------------------------------------------------------
  /** Focus helper for moving between rows while editing/navigating. */
  private focusBookmarkItem(index: number): void {
    // const el = document.getElementById(`bookmark-item-${index}`) as HTMLElement | null;
    // if (el) el.focus();
    this.startEditingAndFocusToInput(this.bookmarks[index]);
  }

  /** Arrow Down: go to next visible row (exits edit mode first if active). */
  editNextItem(i: number): void {
    if (this.editingId) this.cancelEdit();
    const next = i + 1;
    if (next < this.paginatedBookmarks.length) this.focusBookmarkItem(next);
  }

  /** Arrow Up: go to previous visible row (exits edit mode first if active). */
  editPreviousItem(i: number): void {
    if (this.editingId) this.cancelEdit();
    const prev = i - 1;
    if (prev >= 0) this.focusBookmarkItem(prev);
  }

  /** Keep track of focus so hover/focus logic stays tidy. */
  handleItemFocus(i: number): void {
    const b = this.paginatedBookmarks[i];
    this.focusedId = b?.id ?? null;
    // If another item is being edited and user focuses a different row, exit edit mode
    if (this.editingId && this.focusedId !== this.editingId) this.cancelEdit();
  }

  /**
   * Best-effort HEAD existence check.
   * With `no-cors`, status is opaque; a resolved fetch is treated as "likely exists".
   */
  private async checkUrlExists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return !!res;
    } catch {
      return false;
    }
  }

  /** Re-sync from service and recalc pagination. */
  private refreshFromService(jumpToFirst = false): void {
    this.bookmarks = this.bookmarkService.getBookmarks();
    if (jumpToFirst) this.currentPage = 1;
    this.totalPages = Math.max(1, Math.ceil(this.bookmarks.length / this.pageSize));
    this.updatePagination();
    // If current preview points to an ID no longer in the page, clear it
    if (this.hoveredId && !this.bookmarks.find(b => b.id === this.hoveredId)) {
      this.clearPreview();
    }
  }

  /** Build current page slice from the full dataset. */
  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedBookmarks = this.bookmarks.slice(start, end);
  }
}
