// IndexedDB persistence for the vault: the (non-secret) header and ciphertext-only note records.
// Plaintext never touches storage — only what src/vault.ts produced: a wrapped data key in the
// header, and AES-GCM records whose payload (title, body, timestamp) is fully encrypted. The only
// plaintext stored is each record's random id. One database, two stores: 'meta' and 'notes'.
import type { EncryptedRecord, VaultHeader } from './vault';

const DB_NAME = 'cove-vault';
const DB_VERSION = 1;

export interface StoredNote extends EncryptedRecord {
  id: string;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const promised = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Run `fn` against a store inside a transaction, opening/closing a connection each call. Vault
// operations are user-paced (low frequency), so the simplicity beats holding a long-lived handle.
const withStore = async <T>(
  store: 'meta' | 'notes',
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await promised(fn(db.transaction(store, mode).objectStore(store)));
  } finally {
    db.close();
  }
};

export const getHeader = (): Promise<VaultHeader | undefined> =>
  withStore('meta', 'readonly', (s) => s.get('header'));

export const putHeader = async (header: VaultHeader): Promise<void> => {
  await withStore('meta', 'readwrite', (s) => s.put(header, 'header'));
};

export const getNotes = (): Promise<StoredNote[]> =>
  withStore('notes', 'readonly', (s) => s.getAll());

export const putNote = async (note: StoredNote): Promise<void> => {
  await withStore('notes', 'readwrite', (s) => s.put(note));
};

export const deleteNote = async (id: string): Promise<void> => {
  await withStore('notes', 'readwrite', (s) => s.delete(id));
};
