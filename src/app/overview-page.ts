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
  AfterViewInit,

} from '@angular/core';
import { BookmarkService, Bookmark } from './bookmark.service';
import { FormsModule } from '@angular/forms';
import { CommonModule} from '@angular/common';
import { Router } from '@angular/router';
import testBookmarks from './data/bookmarks.json'

@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.html',
  styleUrls: ['./overview-page.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class OverviewPage implements OnInit, AfterViewInit {
  bookmarks: Bookmark[] = [];
  paginatedBookmarks: Bookmark[] = [];

  // PHQ spec: 20 per page
  readonly pageSize = 20;
  currentPage = 1;
  totalPages = 1;

  // Edit state
  editingId: string | null = null;
  editingValue = '';

  // Hover/focus/preview state (used by template)
  hoveredId: string | null = null;
  hoveredBookmark: { id: string; url: string } | null = null;
  focusedId: string | null = null;

  // Preview animation toggle (controls .show class)
  previewVisible = false;

  // determines if it is mobile device or not
  isMobileDevice = false;

  // Refs
  @ViewChild('editInput') editInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('addInput') addInputRef!: ElementRef<HTMLInputElement>; // optional; safe-guarded usage

  // -------------------------------------------------------------------------
  // Global listeners to exit edit mode when clicking / focusing out
  // -------------------------------------------------------------------------
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
  // Keyboard navigation (Left/Right across buttons and items)
  // -------------------------------------------------------------------------
  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const listItem = target.closest('.bookmark-item') as HTMLElement | null;

    // Left Arrow on <li> (non-edit mode): move to previous item
    if (
      event.key === 'ArrowLeft' &&
      listItem &&
      !target.closest('.bookmark-buttons') &&
      !target.closest('.edit-mode')
    ) {
      const prevItem = listItem.previousElementSibling as HTMLElement | null;
      if (prevItem) prevItem.focus();
      event.preventDefault();
      return;
    }

    // Inside an <input>: special Left/Right handling
    if (target.tagName === 'INPUT') {
      const input = target as HTMLInputElement;

      // Right arrow at end -> Save
      if (event.key === 'ArrowRight' && input.selectionEnd === input.value.length) {
        const saveBtn = listItem?.querySelector('.edit-mode button') as HTMLButtonElement | null;
        if (saveBtn) {
          saveBtn.focus();
          event.preventDefault();
        }
        return;
      }

      // Left arrow at start -> previous item (or Save fallback)
      if (event.key === 'ArrowLeft' && input.selectionStart === 0) {
        const prevItem = listItem?.previousElementSibling as HTMLElement | null;
        if (prevItem) {
          prevItem.focus();
        } else {
          const saveBtn = listItem?.querySelector('.edit-mode button') as HTMLButtonElement | null;
          saveBtn?.focus();
        }
        event.preventDefault();
        return;
      }

      return; // otherwise let native input behavior continue
    }

    if (event.key === 'ArrowRight') {
      // Case: <li> → first action button (Edit/Open)
      if (listItem && !target.closest('.bookmark-buttons') && !target.closest('.edit-mode')) {
        const editBtn = listItem.querySelector('.bookmark-buttons button') as HTMLButtonElement | null;
        if (editBtn) {
          editBtn.focus();
          event.preventDefault();
        }
        return;
      }

      // Case: within action buttons → next/loop
      if (target.closest('.bookmark-buttons')) {
        const buttons = target.closest('.bookmark-buttons')?.querySelectorAll('button');
        if (!buttons) return;
        const arr = Array.from(buttons);
        const idx = arr.findIndex(b => b === target);
        if (idx < arr.length - 1) {
          (arr[idx + 1] as HTMLElement).focus();
        } else {
          const nextItem = listItem?.nextElementSibling as HTMLElement | null;
          if (nextItem) nextItem.focus();
          else listItem?.focus();
        }
        event.preventDefault();
        return;
      }

      // Case: in edit-mode buttons → Cancel or next item / loop
      if (target.closest('.edit-mode')) {
        const buttons = target.closest('.edit-mode')?.querySelectorAll('button');
        if (!buttons) return;
        const arr = Array.from(buttons);
        const idx = arr.findIndex(b => b === target);
        if (idx < arr.length - 1) {
          (arr[idx + 1] as HTMLElement).focus();
        } else {
          const input = listItem?.querySelector('input') as HTMLInputElement | null;
          const nextItem = listItem?.nextElementSibling as HTMLElement | null;
          if (nextItem) nextItem.focus();
          else {
            input?.focus();
            input?.setSelectionRange(input.value.length, input.value.length);
          }
        }
        event.preventDefault();
        return;
      }
    }

    if (event.key === 'ArrowLeft') {
      // In action buttons: Delete → Edit, Edit → <li>
      if (target.closest('.bookmark-buttons')) {
        const buttons = target.closest('.bookmark-buttons')?.querySelectorAll('button');
        if (!buttons) return;
        const arr = Array.from(buttons);
        const idx = arr.findIndex(b => b === target);
        if (idx > 0) (arr[idx - 1] as HTMLElement).focus();
        else listItem?.focus();
        event.preventDefault();
        return;
      }

      // In edit-mode buttons: Cancel → Save, Save → input
      if (target.closest('.edit-mode')) {
        const buttons = target.closest('.edit-mode')?.querySelectorAll('button');
        if (!buttons) return;
        const arr = Array.from(buttons);
        const idx = arr.findIndex(b => b === target);
        if (idx > 0) (arr[idx - 1] as HTMLElement).focus();
        else {
          const input = listItem?.querySelector('input') as HTMLInputElement | null;
          input?.focus();
          if (input) input.setSelectionRange(input.value.length, input.value.length);
        }
        event.preventDefault();
        return;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  ngAfterViewInit(): void {
    // Focus the add input on first load (safe optional)
    setTimeout(() => this.addInputRef?.nativeElement?.focus());
  }

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { fromThankYou?: boolean } | undefined;

    this.isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);

    if (state?.fromThankYou) {
      setTimeout(() => this.addInputRef?.nativeElement?.focus());
    }

    this.bookmarks = this.bookmarkService.getBookmarks();
    this.refreshFromService();
  }

  constructor(
    private bookmarkService: BookmarkService,
    private router: Router
  ) {}

  // -------------------------------------------------------------------------
  // Preview dock (desktop hover + mobile tap)
  // -------------------------------------------------------------------------
  /** Show preview for a bookmark (works on hover for desktop, tap for mobile). */
  showPreview(bookmark: Bookmark): void {
    if (this.editingId) return; // don’t show while editing

    this.hoveredId = bookmark.id;
    this.hoveredBookmark = { id: bookmark.id, url: bookmark.url };

    // Reset then trigger to ensure CSS transition runs
    this.previewVisible = false;
    setTimeout(() => (this.previewVisible = true), 0);
  }

  /** Hide the preview (mouseleave, blur, or pressing the close button). */
  clearPreview(): void {
    this.previewVisible = false;
    // Let the fade/slide finish before clearing the data
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

    const normalized = this.validateAndNormalize(raw);
    if (!normalized) {
      alert('Invalid URL. Include a valid domain (protocol added automatically).');
      urlInput.focus();
      return;
    }

    const exists = await this.checkUrlExists(normalized);
    if (!exists) {
      const go = confirm('That URL did not respond. Add it anyway?');
      if (!go) {
        urlInput.focus();
        return;
      }
    }

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

    urlInput.value = '';

    // Navigate to Thank You
    await this.router.navigate(['/thank-you'], {
      queryParams: { url: normalized },
      state: { submittedUrl: normalized, fromOverview: true }
    });
  }

  previewUrl(raw: string): string {
    const normalized = raw.replace(/^http:\/\//, 'https://');
    return 'https://s.wordpress.com/mshots/v1/' +
      encodeURIComponent(normalized) +
      '?w=300&h=168';
  }

  /** Begin editing a bookmark and focus to the input. */
  startEditingAndFocusToInput(b: Bookmark): void {
    this.startEditing(b);

    const editingIndex = this.bookmarks.findIndex(x => x.id === this.editingId);
    const bookmarkItem = document.getElementById(`bookmark-item-${editingIndex}`);

    setTimeout(() => {
      const editTextBox = bookmarkItem?.querySelector('input') as HTMLInputElement | null;
      if (editTextBox) {
        editTextBox.focus();
        // place caret at beginning (show user they can type over)
        editTextBox.setSelectionRange(0, 0);
      }
    });
  }

  /** Begin editing a bookmark. */
  startEditing(b: Bookmark): void {
    // Hide preview while editing to avoid overlap
    //this.clearPreview();

    this.editingId = b.id;
    this.editingValue = b.url;
    this.focusedId = b.id;
  }


  /** Save current edit. */
  async save($event: Event): Promise<void>  {
    const target = event?.target as HTMLElement;
    if (!this.editingId) return;
    // stop this event from being consumed by the enter key on Edit
    $event.stopPropagation();
    const editingIndex = this.bookmarks.findIndex(b => b.id === this.editingId);
    const  oldBookmark: Bookmark | undefined = this.bookmarks[editingIndex];
    // do nothing if the value hasn't changed
    if(oldBookmark?.url === this.editingValue) {


       setTimeout( ()=>  this.editNextItem(editingIndex),  )
      return;
    };

    const raw = this.editingValue.trim();
    if (!raw) return;

    const normalized = this.validateAndNormalize(raw);
    if (!normalized) {
      alert('Invalid URL. Include a valid domain (protocol added automatically).');
      // target.focus();
      return;
    }

    const exists = await this.checkUrlExists(normalized);
    if (!exists) {
      const go = confirm('That URL did not respond. Add it anyway?');
      if (!go) {
        // target.focus();
        return;
      }
    }
    const res = this.bookmarkService.updateBookmark(this.editingId, normalized);
    if (!res.ok) {
      if (res.reason === 'duplicate') {
        alert('That URL is already saved.');
        //target.focus();
      } else {
        alert('Could not add that URL.');
      }
      return;
    }

    this.editingId = null;
    this.editingValue = '';
    this.refreshFromService();
    // wait for view mode to be set before setting focus
    setTimeout( ()=>  this.editNextItem(editingIndex -1),  )

  }

  /** Cancel editing. */
  cancelEdit(): void {
    this.editingId = null;
    this.editingValue = '';
    // Ensu re hover states are clean after cancelling (prevents stale UI)
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
  loadTestData(count: number = 100): void {
    this.bookmarkService.clearAll();
    const urls =  testBookmarks;
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
  goToPage(n: number): void {
    if (n < 1 || n > this.totalPages) return;
    this.currentPage = n;
    this.updatePagination();
  }

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
  private focusBookmarkItem(index: number): void {
    // const el = document.getElementById(`bookmark-item-${index}`) as HTMLElement | null;
    // if (el) el.focus();

    this.startEditingAndFocusToInput(this.bookmarks[index]);
  }

  openWindow(b: Bookmark): void {
    window.open(b.url, '_blank', 'noopener');
  }

  // Arrow Down: go to next visible row
  editNextItem(i: number): void {
    if (this.editingId) this.cancelEdit();
    const next = i + 1;
    if (next < this.paginatedBookmarks.length) this.focusBookmarkItem(next);
  }

  // Arrow Up: go to previous visible row
  editPreviousItem(i: number): void {
    if (this.editingId) this.cancelEdit();
    const prev = i - 1;
    if (prev >= 0) this.focusBookmarkItem(prev);
  }

  // Keep track of focus so hover/focus logic stays tidy
  handleItemFocus(i: number): void {
    const b = this.paginatedBookmarks[i];
    this.focusedId = b?.id ?? null;

    // If another item is being edited and user focuses a different row, exit edit mode
    if (this.editingId && this.focusedId !== this.editingId) this.cancelEdit();
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  /** Normalize structure (adds http:// if missing), basic validation. */
  private validateAndNormalize(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const withProtocol = /^[a-zA-Z][\w+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
    try {
      const u = new URL(withProtocol);
      if (!u.hostname.includes('.')) return null;
      u.pathname = u.pathname.replace(/\/$/, ''); // drop trailing slash
      return u.toString();
    } catch {
      return null;
    }
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

  /** Build current page slice. */
  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedBookmarks = this.bookmarks.slice(start, end);
  }

}
