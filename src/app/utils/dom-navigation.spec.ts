import { handleKeyDown } from './dom-navigation';

function setupRow() {
  // <li class="bookmark-item">
  //   <a class="bookmark-link">...</a>
  //   <div class="bookmark-buttons">
  //     <button class="edit-btn"></button>
  //     <button class="delete-btn"></button>
  //   </div>
  // </li>
  const li = document.createElement('li');
  li.className = 'bookmark-item';
  li.tabIndex = 0;

  const link = document.createElement('a');
  link.className = 'bookmark-link';
  link.href = '#';
  link.textContent = 'example';
  li.appendChild(link);

  const buttons = document.createElement('div');
  buttons.className = 'bookmark-buttons';
  const edit = document.createElement('button'); edit.className = 'edit-btn'; edit.textContent = 'Edit';
  const del = document.createElement('button');  del.className  = 'delete-btn'; del.textContent  = 'Delete';
  buttons.appendChild(edit);
  buttons.appendChild(del);
  li.appendChild(buttons);

  // mount in a list with a previous sibling for left-nav test
  const ul = document.createElement('ul');
  const prev = document.createElement('li'); prev.className = 'bookmark-item'; prev.tabIndex = 0;
  ul.appendChild(prev);
  ul.appendChild(li);
  document.body.appendChild(ul);

  return { ul, prev, li, link, edit, del };
}

function key(target: Element, key: string) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true });
  target.dispatchEvent(ev);
  handleKeyDown(ev);
  return ev;
}

describe('handleKeyDown (DOM navigation)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ArrowRight on <li> focuses first action button', () => {
    const { li, edit } = setupRow();
    li.focus();
    const ev = key(li, 'ArrowRight');
    expect(document.activeElement).toBe(edit);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('ArrowLeft on <li> focuses previous list item', () => {
    const { li, prev } = setupRow();
    li.focus();
    const ev = key(li, 'ArrowLeft');
    expect(document.activeElement).toBe(prev);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('ArrowRight inside input at end focuses Save (if present)', () => {
    // Build edit-mode structure
    const { li } = setupRow();
    const input = document.createElement('input');
    input.value = 'abc';
    input.setSelectionRange?.(3, 3); // cursor at end
    const editMode = document.createElement('div');
    editMode.className = 'edit-mode';
    const save = document.createElement('button'); save.textContent = 'Save';
    editMode.appendChild(save);
    li.appendChild(input);
    li.appendChild(editMode);

    input.focus();
    const ev = key(input, 'ArrowRight');
    expect(document.activeElement).toBe(save);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('ArrowLeft inside input at start focuses list item', () => {
    const { li } = setupRow();
    const input = document.createElement('input');
    input.value = 'abc';
    input.setSelectionRange?.(0, 0); // cursor at start
    li.appendChild(input);

    input.focus();
    const ev = key(input, 'ArrowLeft');
    expect(document.activeElement).toBe(li);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('ArrowRight cycles Edit → Delete within action buttons', () => {
    const { li, edit, del } = setupRow();
    edit.focus();
    const ev = key(edit, 'ArrowRight');
    expect(document.activeElement).toBe(del);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('ArrowLeft cycles Delete → Edit within action buttons', () => {
    const { del, edit } = setupRow();
    del.focus();
    const ev = key(del, 'ArrowLeft');
    expect(document.activeElement).toBe(edit);
    expect(ev.defaultPrevented).toBeTrue();
  });
});
