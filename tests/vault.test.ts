import { describe, expect, it } from 'vitest';
import {
  changePassphrase,
  createVault,
  decryptRecord,
  encryptRecord,
  type KdfParams,
  unlockVault,
} from '../src/vault';

// Low-cost KDF params keep the suite fast; crypto correctness is independent of the cost factors.
const ARGON: KdfParams = { memorySize: 8192, iterations: 1, parallelism: 1 };
const PB: KdfParams = { iterations: 1000 };
const NOTE = 'dear diary — the launch is 2026-07-01 🤫';

describe('vault crypto (ADR-0012)', () => {
  it('round-trips a record: create → encrypt → unlock → decrypt', async () => {
    const { header, dek } = await createVault('correct horse', { kdf: 'argon2id', params: ARGON });
    const rec = await encryptRecord(dek, NOTE);
    const dek2 = await unlockVault('correct horse', header);
    expect(await decryptRecord(dek2, rec)).toBe(NOTE);
  });

  it('rejects the wrong passphrase', async () => {
    const { header } = await createVault('right', { kdf: 'argon2id', params: ARGON });
    await expect(unlockVault('wrong', header)).rejects.toThrow();
  });

  it('persists ciphertext only — no plaintext at rest', async () => {
    const { header, dek } = await createVault('pw', { kdf: 'argon2id', params: ARGON });
    const rec = await encryptRecord(dek, NOTE);
    expect(JSON.stringify({ header, rec })).not.toContain('diary');
    const ct = Uint8Array.from(atob(rec.ct), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(ct)).not.toContain('diary');
  });

  it('changes the passphrase without re-encrypting records (envelope)', async () => {
    const { header, dek } = await createVault('old', { kdf: 'argon2id', params: ARGON });
    const rec = await encryptRecord(dek, NOTE);
    const next = await changePassphrase('old', 'new', header, { params: ARGON });
    const dek2 = await unlockVault('new', next);
    expect(await decryptRecord(dek2, rec)).toBe(NOTE);
    await expect(unlockVault('old', next)).rejects.toThrow();
  });

  it('works on the PBKDF2 fallback path', async () => {
    const { header, dek } = await createVault('pw', { kdf: 'pbkdf2', params: PB });
    const rec = await encryptRecord(dek, NOTE);
    const dek2 = await unlockVault('pw', header);
    expect(await decryptRecord(dek2, rec)).toBe(NOTE);
  });
});
