import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, backupFilename, makeBackup, readBackup } from '../src/backup';
import { parseSettings } from '../src/storage';

const progress = () => ({
  ...parseSettings(null),
  side: 'left' as const,
  lesson: 'pairs',
  stats: { b: { n: 10, ok: 8, ms: 700 }, c: { n: 5, ok: 5, ms: 500 } },
  confusions: { b: { c: 2, n: 1 } },
});
const backup = (settings: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ format: 'artsey-trainer-backup', version: BACKUP_VERSION, exportedAt: '2026-10-04T10:00:00.000Z', settings, ...extra });

describe('backup', () => {
  it('round-trips progress and summarises it', () => {
    const s = progress();
    const result = readBackup(makeBackup(s, new Date('2026-10-04T10:00:00Z')));
    expect(result).toEqual({
      ok: true,
      settings: s,
      summary: { exportedAt: '2026-10-04T10:00:00.000Z', keys: 2, attempts: 15, confusions: 3 },
    });
  });

  it('keeps history and last-practised times', () => {
    const s = {
      ...progress(),
      stats: { b: { n: 10, ok: 8, ms: 700, t: 1_790_000_000_000 } },
      history: { '2026-10-04': { learn: { n: 3, ok: 2, ms: 900 }, type: { n: 50, ok: 48, ms: 30000, rounds: 1 }, lessons: { pairs: { n: 3, ok: 2, ms: 900 } } } },
    };
    const result = readBackup(makeBackup(s));
    expect(result.ok && result.settings.history).toEqual(s.history);
    expect(result.ok && result.settings.stats.b.t).toBe(1_790_000_000_000);
  });

  it('names the file after the local date', () => {
    expect(backupFilename(new Date(2026, 0, 5, 23, 30))).toBe('artsey-trainer-2026-01-05.json');
  });

  it('loads an older backup without newer fields, using defaults', () => {
    const { confusions: _, ...old } = progress();
    const result = readBackup(backup(old));
    expect(result.ok && result.settings.confusions).toEqual({});
    expect(result.ok && result.settings.pairStats).toEqual({});
    expect(result.ok && result.settings.history).toEqual({});
    expect(result.ok && [result.settings.code, result.settings.codeSamples]).toEqual([false, 4]);
    expect(result.ok && result.settings.focusWeak).toBe(false);
    expect(result.ok && result.settings.stats).toEqual(progress().stats);
  });

  it.each([
    ['not JSON', 'nope', 'not valid JSON'],
    ['another JSON file', JSON.stringify({ hello: 'world' }), 'not an ARTSEY Trainer backup'],
    ['a raw settings file', JSON.stringify(progress()), 'not an ARTSEY Trainer backup'],
    ['a newer backup', backup(progress(), { version: BACKUP_VERSION + 1 }), 'newer version'],
    ['a backup without a version', backup(progress(), { version: undefined }), 'damaged'],
    ['negative counts', backup({ ...progress(), stats: { b: { n: -1, ok: 0, ms: 1 } } }), 'damaged'],
    ['more first-try than attempts', backup({ ...progress(), stats: { b: { n: 1, ok: 2, ms: 1 } } }), 'damaged'],
    ['stats that are not objects', backup({ ...progress(), stats: [1, 2] }), 'damaged'],
    ['damaged transition stats', backup({ ...progress(), pairStats: { 't>h': { n: 1, ok: 1, ms: 'slow' } } }), 'damaged'],
    ['history with a bad date', backup({ ...progress(), history: { yesterday: {} } }), 'damaged'],
    ['history with damaged totals', backup({ ...progress(), history: { '2026-10-04': { learn: { n: 1, ok: 5, ms: 1 } } } }), 'damaged'],
    ['text confusion counts', backup({ ...progress(), confusions: { b: { c: 'two' } } }), 'damaged'],
  ])('rejects %s', (_, text, message) => {
    const result = readBackup(text);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(message);
  });

  it('replaces bad preferences with defaults instead of rejecting the file', () => {
    const result = readBackup(backup({ ...progress(), side: 'up', hint: 7, wordCount: -3, code: 'yes', codeSamples: 0 }));
    expect(result.ok && [result.settings.code, result.settings.codeSamples]).toEqual([false, 4]);
    expect(result.ok).toBe(true);
    expect(result.ok && [result.settings.side, result.settings.hint, result.settings.wordCount]).toEqual(['right', 'delay', 20]);
    expect(result.ok && result.settings.lesson).toBe('pairs');
  });
});
