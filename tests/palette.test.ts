import { describe, expect, it } from 'vitest';
import { type Command, matchCommands } from '../src/palette';

const cmds: Command[] = [
  { id: 'compress', title: 'Compress', run: () => undefined },
  { id: 'q-high', title: 'Quality: High', aliases: ['best'], run: () => undefined },
  { id: 'cancel', title: 'Cancel', run: () => undefined, enabled: () => false },
];

describe('matchCommands', () => {
  it('returns enabled commands for an empty query', () => {
    expect(matchCommands(cmds, '  ').map((c) => c.id)).toEqual(['compress', 'q-high']);
  });
  it('fuzzy-matches titles as a subsequence', () => {
    expect(matchCommands(cmds, 'cmp').map((c) => c.id)).toEqual(['compress']);
  });
  it('matches aliases too', () => {
    expect(matchCommands(cmds, 'best').map((c) => c.id)).toEqual(['q-high']);
  });
  it('excludes disabled commands', () => {
    expect(matchCommands(cmds, 'cancel')).toEqual([]);
  });
});
