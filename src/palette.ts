// Command palette: ⌘K / Ctrl-K to fuzzy-search and run any registered action. Built on the
// WAI-ARIA combobox + listbox pattern — focus stays on the input and aria-activedescendant
// tracks the highlighted option. It enhances the UI; every command is also a normal control.

export interface Command {
  id: string;
  title: string;
  aliases?: string[];
  run: () => void;
  enabled?: () => boolean;
}

/** Subsequence match: every query char appears in `haystack`, in order. */
function matches(query: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return true;
  }
  return i === query.length;
}

/** Enabled commands whose title/aliases fuzzy-match the query (pure; unit-tested). */
export function matchCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  const available = commands.filter((c) => c.enabled?.() ?? true);
  if (!q) return available;
  return available.filter((c) =>
    matches(q, [c.title, ...(c.aliases ?? [])].join(' ').toLowerCase()),
  );
}

export interface Palette {
  open: () => void;
  close: () => void;
}

const optionId = (i: number): string => `palette-opt-${i}`;

export function createPalette(commands: Command[]): Palette {
  let trigger: HTMLElement | null = null;
  let active = 0;
  let shown: Command[] = [];

  const overlay = document.createElement('div');
  overlay.className = 'palette-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'palette';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Command palette');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'palette-input';
  input.placeholder = 'Type a command…';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', 'palette-list');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-label', 'Search commands');

  const list = document.createElement('ul');
  list.id = 'palette-list';
  list.className = 'palette-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Commands');

  dialog.append(input, list);
  overlay.append(dialog);
  document.body.appendChild(overlay);

  const highlight = (): void => {
    for (let n = 0; n < list.children.length; n++) {
      const li = list.children[n] as HTMLElement;
      const selected = n === active;
      li.setAttribute('aria-selected', String(selected));
      li.classList.toggle('active', selected);
    }
    input.setAttribute('aria-activedescendant', shown.length ? optionId(active) : '');
    (list.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  };

  const render = (): void => {
    shown = matchCommands(commands, input.value);
    if (active >= shown.length) active = Math.max(0, shown.length - 1);
    list.replaceChildren();
    shown.forEach((cmd, i) => {
      const li = document.createElement('li');
      li.id = optionId(i);
      li.className = 'palette-option';
      li.textContent = cmd.title;
      li.setAttribute('role', 'option');
      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus on the input
        run(i);
      });
      list.appendChild(li);
    });
    highlight();
  };

  const setActive = (i: number): void => {
    if (shown.length === 0) return;
    active = (i + shown.length) % shown.length;
    highlight();
  };

  const close = (): void => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    trigger?.focus();
  };

  const run = (i: number): void => {
    const cmd = shown[i];
    close();
    cmd?.run();
  };

  const open = (): void => {
    trigger = document.activeElement as HTMLElement | null;
    overlay.hidden = false;
    input.value = '';
    active = 0;
    render();
    input.focus();
  };

  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(active + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(active - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (shown.length) run(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        e.preventDefault(); // focus trap: the input is the only focusable element
        break;
    }
  });
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close(); // click the backdrop to dismiss
  });

  return { open, close };
}
