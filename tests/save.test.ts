import { describe, expect, it } from 'vitest';
import { canSaveInPlace } from '../src/save';

describe('canSaveInPlace', () => {
  it('is false without the File System Access API (e.g. Node)', () => {
    expect(canSaveInPlace()).toBe(false);
  });
});
