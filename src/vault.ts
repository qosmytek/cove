// Vault crypto core — client-side encryption for data-keeping tools (ADR-0012). Zero egress, zero
// recovery. A passphrase-derived key-encryption key (Argon2id via hash-wasm, or a PBKDF2 fallback)
// wraps a random per-vault data key; records are encrypted with the data key (AES-256-GCM). Only the
// header (KDF metadata + the wrapped data key) and ciphertext records are ever persisted — never the
// passphrase, the derived keys, or plaintext. Params come from the vault spike
// (docs/engineering/phase-4-vault-spike.md); a lost passphrase is unrecoverable by design.
import { argon2id } from 'hash-wasm';

export type KdfId = 'argon2id' | 'pbkdf2';

export interface KdfParams {
  /** Argon2 memory cost in KiB (Argon2id only). */
  memorySize?: number;
  /** Iterations / time cost. */
  iterations: number;
  /** Argon2 lanes (Argon2id only). */
  parallelism?: number;
}

/** Tuned on the reference device (phase-4-vault-spike.md): Argon2id 46 MiB / t1 / p1. */
export const ARGON2_DEFAULTS: Required<KdfParams> = {
  memorySize: 47104,
  iterations: 1,
  parallelism: 1,
};
/** PBKDF2-HMAC-SHA-256 fallback count (above the OWASP 600k floor). */
export const PBKDF2_DEFAULTS: KdfParams = { iterations: 1_000_000 };

/** Persisted, non-secret vault header: how to re-derive the KEK + the wrapped data key. */
export interface VaultHeader {
  v: 1;
  kdf: KdfId;
  params: KdfParams;
  salt: string; // base64
  wrapIv: string; // base64
  wrappedDek: string; // base64 — the data key, AES-GCM-wrapped by the passphrase KEK
}

/** A persisted ciphertext record. */
export interface EncryptedRecord {
  iv: string; // base64
  ct: string; // base64
}

export interface CreatedVault {
  header: VaultHeader;
  dek: CryptoKey;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const fromB64 = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const randomBytes = (n: number): Uint8Array<ArrayBuffer> =>
  crypto.getRandomValues(new Uint8Array(n));

/** Argon2id where WebAssembly is available (preferred), else the PBKDF2 fallback. */
export const defaultKdf = (): KdfId => (typeof WebAssembly === 'undefined' ? 'pbkdf2' : 'argon2id');

const defaultParams = (kdf: KdfId): KdfParams =>
  kdf === 'argon2id' ? { ...ARGON2_DEFAULTS } : { ...PBKDF2_DEFAULTS };

// Derive the key-encryption key (AES-256-GCM, used only to (un)wrap the data key) from the passphrase.
const deriveKek = async (
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  kdf: KdfId,
  params: KdfParams,
): Promise<CryptoKey> => {
  if (kdf === 'argon2id') {
    const raw = (await argon2id({
      password: passphrase,
      salt,
      parallelism: params.parallelism ?? ARGON2_DEFAULTS.parallelism,
      iterations: params.iterations,
      memorySize: params.memorySize ?? ARGON2_DEFAULTS.memorySize,
      hashLength: 32,
      outputType: 'binary',
    })) as Uint8Array<ArrayBuffer>;
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['wrapKey', 'unwrapKey']);
  }
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: params.iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
};

// Unwrap the data key from a header. `extractable` is true only for re-wrapping (passphrase change);
// a normal unlock keeps the data key non-extractable.
const unwrapDek = async (
  passphrase: string,
  header: VaultHeader,
  extractable: boolean,
): Promise<CryptoKey> => {
  const kek = await deriveKek(passphrase, fromB64(header.salt), header.kdf, header.params);
  return crypto.subtle.unwrapKey(
    'raw',
    fromB64(header.wrappedDek),
    kek,
    { name: 'AES-GCM', iv: fromB64(header.wrapIv) },
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
};

/** Create a new vault: a random data key, wrapped by the passphrase-derived KEK. */
export const createVault = async (
  passphrase: string,
  opts: { kdf?: KdfId; params?: KdfParams } = {},
): Promise<CreatedVault> => {
  const kdf = opts.kdf ?? defaultKdf();
  const params = opts.params ?? defaultParams(kdf);
  const salt = randomBytes(16);
  const kek = await deriveKek(passphrase, salt, kdf, params);
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const wrapIv = randomBytes(12);
  const wrappedDek = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv: wrapIv });
  return {
    header: {
      v: 1,
      kdf,
      params,
      salt: toB64(salt),
      wrapIv: toB64(wrapIv),
      wrappedDek: toB64(wrappedDek),
    },
    dek,
  };
};

/** Unlock a vault. Rejects if the passphrase is wrong (the wrap's GCM tag fails to verify). */
export const unlockVault = (passphrase: string, header: VaultHeader): Promise<CryptoKey> =>
  unwrapDek(passphrase, header, false);

/** Re-wrap the same data key under a new passphrase — existing records stay valid. */
export const changePassphrase = async (
  oldPassphrase: string,
  newPassphrase: string,
  header: VaultHeader,
  opts: { kdf?: KdfId; params?: KdfParams } = {},
): Promise<VaultHeader> => {
  const dek = await unwrapDek(oldPassphrase, header, true);
  const kdf = opts.kdf ?? header.kdf;
  const params = opts.params ?? header.params;
  const salt = randomBytes(16);
  const kek = await deriveKek(newPassphrase, salt, kdf, params);
  const wrapIv = randomBytes(12);
  const wrappedDek = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv: wrapIv });
  return {
    v: 1,
    kdf,
    params,
    salt: toB64(salt),
    wrapIv: toB64(wrapIv),
    wrappedDek: toB64(wrappedDek),
  };
};

/** Encrypt a plaintext string with the vault's data key. */
export const encryptRecord = async (
  dek: CryptoKey,
  plaintext: string,
): Promise<EncryptedRecord> => {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc.encode(plaintext));
  return { iv: toB64(iv), ct: toB64(ct) };
};

/** Decrypt a record. Rejects if the data was tampered with or the key is wrong (GCM tag fails). */
export const decryptRecord = async (dek: CryptoKey, rec: EncryptedRecord): Promise<string> => {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(rec.iv) },
    dek,
    fromB64(rec.ct),
  );
  return dec.decode(pt);
};
