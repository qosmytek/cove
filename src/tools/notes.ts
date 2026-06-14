// Cove Notes — encrypted notes on your device (Phase 4's first vault tool, ADR-0012). Notes are
// encrypted in the browser (src/vault.ts) and only ciphertext is persisted (src/vault-store.ts);
// the passphrase, derived keys, and plaintext never leave memory and never hit disk or the network.
// Zero-recovery by design: a forgotten passphrase means the notes are gone, stated up front.
import type { Command } from '../palette';
import type { ToolContext } from '../shell/tool';
import {
  createVault,
  decryptRecord,
  defaultKdf,
  encryptRecord,
  unlockVault,
  type VaultHeader,
} from '../vault';
import {
  deleteNote,
  getHeader,
  getNotes,
  putHeader,
  putNote,
  type StoredNote,
} from '../vault-store';

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

const MIN_PASSPHRASE = 8;

const TEMPLATE = `
  <section id="setup" hidden>
    <h2>Create your vault</h2>
    <p class="warn-box">⚠️ <strong>Zero recovery by design.</strong> If you forget this passphrase your
      notes are gone for good — there is no reset, no recovery code, no backdoor. Choose something
      memorable and write it somewhere safe.</p>
    <div class="settings">
      <label>Passphrase <input id="new-pass" type="password" autocomplete="new-password" /></label>
      <label>Confirm <input id="confirm-pass" type="password" autocomplete="new-password" /></label>
    </div>
    <div class="actions"><button id="create" class="primary" type="button">Create vault</button></div>
    <p id="setup-msg" class="status-msg" role="status" aria-live="polite"></p>
  </section>

  <section id="locked" hidden>
    <h2>Unlock your vault</h2>
    <div class="settings">
      <label>Passphrase <input id="unlock-pass" type="password" autocomplete="current-password" /></label>
    </div>
    <div class="actions"><button id="unlock" class="primary" type="button">Unlock</button></div>
    <p id="locked-msg" class="status-msg" role="status" aria-live="polite"></p>
  </section>

  <section id="vault" hidden>
    <div class="vault-bar">
      <button id="new-note" type="button">+ New note</button>
      <button id="lock" type="button">Lock</button>
    </div>
    <div class="vault-cols">
      <ul id="note-list" class="note-list" aria-label="Notes"></ul>
      <div id="editor" class="editor" hidden>
        <input id="note-title" class="note-title" placeholder="Title" aria-label="Note title" />
        <textarea id="note-body" class="note-body" placeholder="Write…" aria-label="Note body"></textarea>
        <div class="actions">
          <button id="save-note" class="primary" type="button">Save</button>
          <button id="delete-note" type="button">Delete</button>
        </div>
      </div>
    </div>
    <p id="vault-msg" class="status-msg" role="status" aria-live="polite"></p>
  </section>

  <details id="details">
    <summary>Details</summary>
    <p id="status"></p>
  </details>
`;

export function mount(ctx: ToolContext): () => void {
  const { host } = ctx;
  host.innerHTML = TEMPLATE;

  const byId = <T extends HTMLElement>(id: string): T => {
    const el = host.querySelector<T>(`#${id}`);
    if (!el) throw new Error(`missing #${id}`);
    return el;
  };

  const setupSec = byId<HTMLElement>('setup');
  const lockedSec = byId<HTMLElement>('locked');
  const vaultSec = byId<HTMLElement>('vault');
  const newPass = byId<HTMLInputElement>('new-pass');
  const confirmPass = byId<HTMLInputElement>('confirm-pass');
  const createBtn = byId<HTMLButtonElement>('create');
  const setupMsg = byId<HTMLParagraphElement>('setup-msg');
  const unlockPass = byId<HTMLInputElement>('unlock-pass');
  const unlockBtn = byId<HTMLButtonElement>('unlock');
  const lockedMsg = byId<HTMLParagraphElement>('locked-msg');
  const newNoteBtn = byId<HTMLButtonElement>('new-note');
  const lockBtn = byId<HTMLButtonElement>('lock');
  const noteList = byId<HTMLUListElement>('note-list');
  const editor = byId<HTMLElement>('editor');
  const noteTitle = byId<HTMLInputElement>('note-title');
  const noteBody = byId<HTMLTextAreaElement>('note-body');
  const saveBtn = byId<HTMLButtonElement>('save-note');
  const deleteBtn = byId<HTMLButtonElement>('delete-note');
  const vaultMsg = byId<HTMLParagraphElement>('vault-msg');
  const statusEl = byId<HTMLParagraphElement>('status');

  const supported = typeof indexedDB !== 'undefined' && typeof crypto?.subtle !== 'undefined';
  statusEl.textContent = `engine: Web Crypto + ${defaultKdf()} · storage: IndexedDB (ciphertext only)`;

  let header: VaultHeader | null = null;
  let dek: CryptoKey | null = null;
  let notes: Note[] = [];
  let selectedId: string | null = null;
  let alive = true;

  const show = (which: 'setup' | 'locked' | 'vault'): void => {
    setupSec.hidden = which !== 'setup';
    lockedSec.hidden = which !== 'locked';
    vaultSec.hidden = which !== 'vault';
  };

  const renderList = (): void => {
    noteList.replaceChildren();
    for (const n of notes) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'note-item';
      btn.dataset.id = n.id;
      btn.textContent = n.title.trim() || 'Untitled';
      if (n.id === selectedId) btn.setAttribute('aria-current', 'true');
      li.appendChild(btn);
      noteList.appendChild(li);
    }
  };

  const select = (id: string): void => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    selectedId = id;
    editor.hidden = false;
    noteTitle.value = note.title;
    noteBody.value = note.body;
    renderList();
    noteTitle.focus();
  };

  const enterVault = (): void => {
    show('vault');
    selectedId = null;
    editor.hidden = true;
    renderList();
  };

  const loadNotes = async (key: CryptoKey): Promise<void> => {
    const stored = await getNotes();
    const decrypted = await Promise.all(
      stored.map(async (s) => JSON.parse(await decryptRecord(key, s)) as Omit<Note, 'id'>),
    );
    notes = stored
      .map((s, i) => ({ id: s.id, ...decrypted[i] }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const create = async (): Promise<void> => {
    const pass = newPass.value;
    if (pass.length < MIN_PASSPHRASE) {
      setupMsg.textContent = `Use at least ${MIN_PASSPHRASE} characters.`;
      return;
    }
    if (pass !== confirmPass.value) {
      setupMsg.textContent = 'The passphrases do not match.';
      return;
    }
    createBtn.disabled = true;
    setupMsg.textContent = 'Creating…';
    try {
      const t0 = performance.now();
      const created = await createVault(pass);
      await putHeader(created.header);
      header = created.header;
      dek = created.dek;
      notes = [];
      newPass.value = '';
      confirmPass.value = '';
      statusEl.textContent = `engine: Web Crypto + ${created.header.kdf} · derived in ${Math.round(performance.now() - t0)}ms · storage: IndexedDB (ciphertext only)`;
      enterVault();
    } catch (e) {
      setupMsg.textContent = `Could not create the vault: ${e instanceof Error ? e.message : e}`;
    } finally {
      createBtn.disabled = false;
    }
  };

  const unlock = async (): Promise<void> => {
    if (!header) return;
    unlockBtn.disabled = true;
    lockedMsg.textContent = 'Unlocking…';
    try {
      const t0 = performance.now();
      const key = await unlockVault(unlockPass.value, header);
      await loadNotes(key);
      dek = key;
      unlockPass.value = '';
      lockedMsg.textContent = '';
      statusEl.textContent = `engine: Web Crypto + ${header.kdf} · derived in ${Math.round(performance.now() - t0)}ms · storage: IndexedDB (ciphertext only)`;
      enterVault();
    } catch {
      lockedMsg.textContent = 'Wrong passphrase.';
    } finally {
      unlockBtn.disabled = false;
    }
  };

  const lock = (): void => {
    dek = null;
    notes = [];
    selectedId = null;
    noteTitle.value = '';
    noteBody.value = '';
    editor.hidden = true;
    show('locked');
    unlockPass.focus();
  };

  const newNote = (): void => {
    const note: Note = { id: crypto.randomUUID(), title: '', body: '', updatedAt: Date.now() };
    notes.unshift(note);
    select(note.id);
  };

  const save = async (): Promise<void> => {
    if (!dek || !selectedId) return;
    const note = notes.find((n) => n.id === selectedId);
    if (!note) return;
    note.title = noteTitle.value;
    note.body = noteBody.value;
    note.updatedAt = Date.now();
    saveBtn.disabled = true;
    try {
      const rec = await encryptRecord(
        dek,
        JSON.stringify({ title: note.title, body: note.body, updatedAt: note.updatedAt }),
      );
      const stored: StoredNote = { id: note.id, iv: rec.iv, ct: rec.ct };
      await putNote(stored);
      notes.sort((a, b) => b.updatedAt - a.updatedAt);
      renderList();
      vaultMsg.textContent = 'Saved.';
    } catch (e) {
      vaultMsg.textContent = `Could not save: ${e instanceof Error ? e.message : e}`;
    } finally {
      saveBtn.disabled = false;
    }
  };

  const remove = async (): Promise<void> => {
    if (!selectedId) return;
    const id = selectedId;
    await deleteNote(id);
    notes = notes.filter((n) => n.id !== id);
    selectedId = null;
    editor.hidden = true;
    renderList();
    vaultMsg.textContent = 'Deleted.';
  };

  createBtn.addEventListener('click', () => void create());
  unlockBtn.addEventListener('click', () => void unlock());
  lockBtn.addEventListener('click', lock);
  newNoteBtn.addEventListener('click', newNote);
  saveBtn.addEventListener('click', () => void save());
  deleteBtn.addEventListener('click', () => void remove());
  noteList.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLButtonElement>('.note-item')?.dataset.id;
    if (id) select(id);
  });

  // Initialize: a vault exists → unlock; none yet → set one up. (Disabled if unsupported.)
  if (!supported) {
    ctx.setCapabilityNotice({
      level: 'warn',
      text: 'This browser lacks Web Crypto or IndexedDB, so the encrypted vault can’t run here.',
    });
  } else {
    ctx.setCapabilityNotice({
      level: 'info',
      text: 'Notes are encrypted on your device — nothing is uploaded. Forget the passphrase and they’re gone (no recovery).',
    });
    void getHeader().then((h) => {
      if (!alive) return;
      header = h ?? null;
      if (header) {
        show('locked');
        unlockPass.focus();
      } else {
        show('setup');
        newPass.focus();
      }
    });
  }

  const commands: Command[] = [
    {
      id: 'new-note',
      title: 'New note',
      aliases: ['add'],
      run: newNote,
      enabled: () => !vaultSec.hidden,
    },
    {
      id: 'save-note',
      title: 'Save note',
      aliases: ['write'],
      run: () => saveBtn.click(),
      enabled: () => !editor.hidden,
    },
    { id: 'lock', title: 'Lock vault', run: lock, enabled: () => !vaultSec.hidden },
  ];
  ctx.registerCommands(commands);

  return () => {
    alive = false;
    dek = null;
    notes = [];
    ctx.setCapabilityNotice(null);
  };
}
