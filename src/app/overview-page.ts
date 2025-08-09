// OVERVIEW PAGE LOGIC (REPLACE)
// Purpose: add/edit/delete + pagination + clear-all + dev seeding helpers.

import {Component, ChangeDetectionStrategy, HostListener, ViewChild, ElementRef} from '@angular/core';
import { BookmarkService, Bookmark } from './bookmark.service';
import { FormsModule } from '@angular/forms';
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";

@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.html',
  styleUrls: ['./overview-page.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule]
})
export class OverviewPage {
  bookmarks: Bookmark[] = [];
  paginatedBookmarks: Bookmark[] = [];

  // PHQ spec: 20 per page
  readonly pageSize = 20;
  currentPage = 1;
  totalPages = 1;

  // Edit state
  editingId: string | null = null;
  editingValue = '';

  // Hover/focus state (used by template)
  hoveredId: string | null = null;
  hoveredBookmark: { id: string; url: string } | null = null;
  focusedId: string | null = null;

  // determines if it is mobile device or not
  isMobileDevice = false;

  // Reference to the edit input field in the template (for focusing)
  @ViewChild('editInput') editInputRef!: ElementRef<HTMLInputElement>
  @ViewChild('addInput') addInputRef!: ElementRef<HTMLInputElement>

// Cancel edit if clicking outside editable elements
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    this.stopEditIfClickOutSide(target);

  }

  /**
   * Stops editing mode if user clicks outside the currently editing bookmark item
   *
   * @param target The HTML element that was clicked
   * @returns void
   */
  private stopEditIfClickOutSide(target: HTMLElement) {
    // Check if the clicked target is outside the currently editing bookmark item
    const editingIndex = this.bookmarks.findIndex(b => b.id === this.editingId);

    // Get reference to the bookmark item DOM element that's being edited
    const itemEl = document.getElementById(`bookmark-item-${editingIndex}`);

    // If click target is not contained within the editing bookmark item,
    // cancel the edit mode
    if (!itemEl?.contains(target)) {
      this.cancelEdit();
    }
  }

// Cancel edit if focus moves away (e.g. Shift+Tab)
  @HostListener('document:focusin', ['$event'])
  handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    this.stopEditIfClickOutSide(target);
  }

  /**
   * Keyboard Navigation Handler for Bookmark List
   * ---------------------------------------------
   * Handles Left/Right arrow navigation for both normal and edit modes:
   *
   * Input ←/→ Save/Cancel
   * Save ↔ Cancel ↔ next item or loop
   * <li> ←/→ Edit/Delete
   * Edit ↔ Delete ↔ next item or loop
   * Left Arrow from <li> → previous <li>
   * Fully keyboard-accessible, edge-case proof
   */

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const listItem = target.closest('.bookmark-item') as HTMLElement;

    // 🆕 Handle Left Arrow on <li> (non-edit mode) to move to previous item
    if (
      event.key === 'ArrowLeft' &&
      listItem &&
      !target.closest('.bookmark-buttons') &&
      !target.closest('.edit-mode')
    ) {
      const prevItem = listItem.previousElementSibling as HTMLElement;
      if (prevItem) {
        prevItem.focus(); // Focus previous bookmark item
      }
      event.preventDefault();
      return;
    }

    // 🔐 Input field navigation
    if (target.tagName === 'INPUT') {
      const input = target as HTMLInputElement;

      // ➡️ Right arrow at end of input → Save
      if (event.key === 'ArrowRight' && input.selectionEnd === input.value.length) {
        const saveBtn = listItem?.querySelector('.edit-mode button') as HTMLButtonElement;
        if (saveBtn) {
          saveBtn.focus();
          event.preventDefault();
        }
        return;
      }

      // ⬅️ Left arrow at start of input → previous item or Save
      if (event.key === 'ArrowLeft' && input.selectionStart === 0) {
        const prevItem = listItem?.previousElementSibling as HTMLElement;
        if (prevItem) {
          prevItem.focus(); // Previous item
        } else {
          const saveBtn = listItem?.querySelector('.edit-mode button') as HTMLButtonElement;
          saveBtn?.focus(); // Fallback: focus Save
        }
        event.preventDefault();
        return;
      }

      return; // Let native input behavior continue otherwise
    }

    // ➡️ ArrowRight navigation
    if (event.key === 'ArrowRight') {
      // Case: <li> → Edit
      if (listItem && !target.closest('.bookmark-buttons') && !target.closest('.edit-mode')) {
        const editBtn = listItem.querySelector('.bookmark-buttons button') as HTMLButtonElement;
        if (editBtn) {
          editBtn.focus();
          event.preventDefault();
        }
        return;
      }

      // Case: Edit → Delete, or Delete → next/loop
      if (target.closest('.bookmark-buttons')) {
        const buttons = target.closest('.bookmark-buttons')?.querySelectorAll('button');
        if (!buttons) return;

        const buttonsArray = Array.from(buttons);
        const index = buttonsArray.findIndex(b => b === target);

        if (index < buttonsArray.length - 1) {
          (buttonsArray[index + 1] as HTMLElement).focus(); // Edit → Delete
        } else {
          const nextItem = listItem?.nextElementSibling as HTMLElement;
          if (nextItem) {
            nextItem.focus(); // Delete → next item
          } else {
            listItem?.focus(); // Loop back to same item
          }
        }

        event.preventDefault();
        return;
      }

      // Case: Save → Cancel, or Cancel → next/loop/input
      if (target.closest('.edit-mode')) {
        const buttons = target.closest('.edit-mode')?.querySelectorAll('button');
        if (!buttons) return;

        const buttonsArray = Array.from(buttons);
        const index = buttonsArray.findIndex(b => b === target);

        if (index < buttonsArray.length - 1) {
          (buttonsArray[index + 1] as HTMLElement).focus(); // Save → Cancel
        } else {
          const input = listItem?.querySelector('input') as HTMLInputElement;
          const nextItem = listItem?.nextElementSibling as HTMLElement;
          if (nextItem) {
            nextItem.focus(); // Cancel → next item
          } else {
            input?.focus(); // Cancel → input (loop)
            input?.setSelectionRange(input.value.length, input.value.length);
          }
        }

        event.preventDefault();
        return;
      }
    }

    // ⬅️ ArrowLeft navigation (already handled <li> at the top)
    if (event.key === 'ArrowLeft') {
      // Case: Delete → Edit, Edit → <li>
      if (target.closest('.bookmark-buttons')) {
        const buttons = target.closest('.bookmark-buttons')?.querySelectorAll('button');
        if (!buttons) return;

        const buttonsArray = Array.from(buttons);
        const index = buttonsArray.findIndex(b => b === target);

        if (index > 0) {
          (buttonsArray[index - 1] as HTMLElement).focus(); // Delete → Edit
        } else {
          listItem?.focus(); // Edit → <li>
        }

        event.preventDefault();
        return;
      }

      // Case: Cancel → Save, Save → input
      if (target.closest('.edit-mode')) {
        const buttons = target.closest('.edit-mode')?.querySelectorAll('button');
        if (!buttons) return;

        const buttonsArray = Array.from(buttons);
        const index = buttonsArray.findIndex(b => b === target);

        if (index > 0) {
          (buttonsArray[index - 1] as HTMLElement).focus(); // Cancel → Save
        } else {
          const input = listItem?.querySelector('input') as HTMLInputElement;
          input?.focus();
          input?.setSelectionRange(input.value.length, input.value.length); // Place cursor at end
        }

        event.preventDefault();
        return;
      }
    }
  }


  ngAfterViewInit(): void {
    // Focus the add input on first load
    setTimeout(() => this.addInputRef?.nativeElement.focus());
  }

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { fromThankYou?: boolean };
    this.isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
    if (state?.fromThankYou) {
      setTimeout(() => this.addInputRef?.nativeElement.focus());
    }

    this.bookmarks = this.bookmarkService.getBookmarks();
  }

  constructor(private bookmarkService: BookmarkService,
              private router: Router) {
    this.refreshFromService();
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
      queryParams: { url: normalized },         // used to display on the page
      state: { submittedUrl: normalized, fromOverview: true } // internal flow/focus
    });

    // this.refreshFromService(true); // jump to page 1 to see newest at top
  }

  /** Begin editing a bookmark and focus to the input. */
  startEditingAndFocusToInput(b: Bookmark): void {
    this.startEditing(b)
    const editingIndex = this.bookmarks.findIndex(b => b.id === this.editingId);
    const listItem = document.getElementById(`bookmark-item-${editingIndex}`);

    // we need a delay to make sure the list item is rendered before focusing
    // not needed for mobile devices
    if(this.isMobileDevice) return;

    setTimeout( ()=> {
      const textBox = listItem?.querySelector('input') as HTMLInputElement;
      if (textBox) {
        // focus to the input field and set cursor to the beginning
        textBox.focus();
        textBox.setSelectionRange(0, 0);
      }
    })
  }

  /** Begin editing a bookmark. */
  startEditing(b: Bookmark): void {
    this.editingId = b.id;
    this.editingValue = b.url;
    this.focusedId = b.id;
  }

  /** Save current edit. */
  async saveEdit(): Promise<void> {
    if (!this.editingId) return;

    const normalized = this.validateAndNormalize(this.editingValue);
    if (!normalized) {
      alert('Invalid URL.');
      return;
    }

    const res = this.bookmarkService.updateBookmark(this.editingId, normalized);
    if (!res.ok) {
      if (res.reason === 'duplicate') {
        alert('That URL is already saved.');
      } else {
        alert('Could not save that URL.');
      }
      return;
    }

    this.editingId = null;
    this.editingValue = '';
    this.refreshFromService();
  }

  /** Cancel editing. */
  cancelEdit(): void {
    this.editingId = null;
    this.editingValue = '';
  }

  /** Delete a bookmark by ID. */
  delete(id: string): void {
    this.bookmarkService.deleteBookmark(id);
    this.refreshFromService();
  }

  // -------------------------------------------------------------------------
  // DEV: Seeding helpers (used by dev-tools buttons)
  // -------------------------------------------------------------------------

  /**
   * Seed test data (defaults to 100 unique items).
   * Template calls (click)="loadTestData()".
   */
  loadTestData(count: number = 100): void {
    // Start clean to avoid duplicate noise
    this.bookmarkService.clearAll();

    const urls = this.generateTestUrls(count);
    for (const url of urls) {
      this.bookmarkService.addBookmark(url);
    }
    this.refreshFromService(true);
  }

  /**
   * Add a single sample entry with a unique suffix.
   * Template calls (click)="addSample()".
   */
  addSample(): void {
    const url = `https://example.com/sample-${Date.now()}`;
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

  /** Clear everything (storage + memory) and reset pagination/state. */
  clearAll(): void {
    this.bookmarkService.clearAll();
    this.bookmarks = [];
    this.paginatedBookmarks = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.refreshFromService();
  }

  // -------------------------------------------------------------------------
  // Keyboard helpers (optional; template-safe no-ops)
  // -------------------------------------------------------------------------

  // Moves focus to target list item (if it exists)
  private focusBookmarkItem(index: number): void {
    const el = document.getElementById(`bookmark-item-${index}`) as HTMLElement | null;
    if (el) el.focus();
  }

  openUrl(b: Bookmark): void {
      window.open(b.url, '_blank', 'noopener');
  }

// Arrow Down: go to next visible row
  editNextItem(i: number): void {
    // If currently editing a different item, close it first
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
  }

  /** Build current page slice. */
  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedBookmarks = this.bookmarks.slice(start, end);
  }

  /** Generate N unique, normalized test URLs. */
  private generateTestUrls(n: number): string[] {
    const hosts = [
      'example.com', 'alpha.dev', 'bravo.io', 'charlie.net', 'delta.org',
      'echo.app', 'foxtrot.dev', 'golf.site', 'hotel.co', 'india.nz'
    ];
    const paths = ['/', '/home', '/news', '/blog', '/docs', '/products', '/about', '/contact'];
    const qs = ['', '?ref=seed', '?utm=dev', '?src=test'];

    const set = new Set<string>();
    let i = 0;
    while (set.size < n && i < n * 10) {
      i++;
      const h = hosts[Math.floor(Math.random() * hosts.length)];
      const p = paths[Math.floor(Math.random() * paths.length)];
      const q = qs[Math.floor(Math.random() * qs.length)];
      const slug = Math.random().toString(36).slice(2, 8);
      const url = `https://${h}${p}${p.endsWith('/') ? '' : '/'}${slug}${q}`;
      set.add(url);
    }
    return Array.from(set);
  }

  // -------------------------------------------------------------------------
  // Backward-compat aliases (if your older template still calls these)
  // -------------------------------------------------------------------------

  onSubmit(evt?: Event): void {
    evt?.preventDefault();
    const input = document.getElementById('url') as HTMLInputElement | null;
    if (input) void this.add(input);
  }

  deleteBookmark(id: string): void { this.delete(id); }
  updateBookmark(id: string, newUrl: string): void {
    this.editingId = id;
    this.editingValue = newUrl;
    void this.saveEdit();
  }
}
