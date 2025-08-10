// Keyboard navigation & focus logic for the list row and its buttons (keeps exact logic).
export function handleKeyDown(event: KeyboardEvent): void {
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
