import type { Confusions } from './confusions';
import type { Stats } from './drill';
import type { History } from './history';
import { parseSettings, type Settings } from './storage';

const FORMAT = 'artsey-trainer-backup';
/** Bump when the backup shape changes in a way older apps can't read. */
export const BACKUP_VERSION = 1;

export interface BackupSummary {
  exportedAt?: string;
  keys: number;
  attempts: number;
  confusions: number;
}

export type BackupResult = { ok: true; settings: Settings; summary: BackupSummary } | { ok: false; error: string };

export function makeBackup(settings: Settings, now = new Date()): string {
  return JSON.stringify({ format: FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), settings }, null, 2);
}

/** artsey-trainer-2026-10-04.json, using the local date. */
export function backupFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `artsey-trainer-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

function validStats(x: unknown): x is Stats {
  return (
    isObject(x) &&
    Object.values(x).every(
      (s) => isObject(s) && isCount(s.n) && isCount(s.ok) && s.ok <= s.n && isCount(s.ms) && (s.t === undefined || isCount(s.t)),
    )
  );
}

const isTotals = (x: unknown) => isObject(x) && isCount(x.n) && isCount(x.ok) && x.ok <= x.n && isCount(x.ms);

function validHistory(x: unknown): x is History {
  return (
    isObject(x) &&
    Object.entries(x).every(
      ([day, log]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        isObject(log) &&
        (log.learn === undefined || isTotals(log.learn)) &&
        (log.type === undefined || (isTotals(log.type) && isObject(log.type) && isCount(log.type.rounds))) &&
        (log.lessons === undefined || (isObject(log.lessons) && Object.values(log.lessons).every(isTotals))),
    )
  );
}

function validConfusions(x: unknown): x is Confusions {
  return isObject(x) && Object.values(x).every((row) => isObject(row) && Object.values(row).every(isCount));
}

/** A bad preference (say, a hand-edited side) falls back to its default instead of breaking the app. */
function withValidPreferences(s: Settings): Settings {
  const d = parseSettings(null);
  const ok = {
    side: s.side === 'left' || s.side === 'right',
    version: s.version === '0.8.1' || s.version === '0.9.0',
    hint: s.hint === 'always' || s.hint === 'delay' || s.hint === 'never',
    hintDelay: isCount(s.hintDelay),
    lesson: typeof s.lesson === 'string',
    view: s.view === 'learn' || s.view === 'type' || s.view === 'chart' || s.view === 'progress',
    punctuation: typeof s.punctuation === 'boolean',
    numbers: typeof s.numbers === 'boolean',
    focusWeak: typeof s.focusWeak === 'boolean',
    code: typeof s.code === 'boolean',
    codeSamples: isCount(s.codeSamples) && s.codeSamples > 0,
    onError: s.onError === 'stop' || s.onError === 'continue',
    wordCount: isCount(s.wordCount) && s.wordCount > 0,
  };
  const fixed = { ...s };
  for (const [key, valid] of Object.entries(ok) as [keyof typeof ok, boolean][]) {
    if (!valid) (fixed as Record<string, unknown>)[key] = d[key];
  }
  return fixed;
}

export function summarize(s: Pick<Settings, 'stats' | 'confusions'>, exportedAt?: string): BackupSummary {
  const stats = Object.values(s.stats);
  return {
    exportedAt,
    keys: stats.length,
    attempts: stats.reduce((sum, st) => sum + st.n, 0),
    confusions: Object.values(s.confusions).reduce((sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0), 0),
  };
}

/**
 * Checks a backup file before anything is replaced. Older backups load with defaults for newer
 * fields; files from a newer app, other files, and damaged progress data are rejected.
 */
export function readBackup(text: string): BackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  if (!isObject(data) || data.format !== FORMAT || !isObject(data.settings)) {
    return { ok: false, error: 'This file is not an ARTSEY Trainer backup.' };
  }
  if (typeof data.version !== 'number') {
    return { ok: false, error: 'This backup file is damaged: it has no version.' };
  }
  if (data.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app. Reload the app and try again.' };
  }
  const settings = withValidPreferences(parseSettings(JSON.stringify(data.settings)));
  if (
    !validStats(settings.stats) ||
    !validStats(settings.pairStats) ||
    !validConfusions(settings.confusions) ||
    !validHistory(settings.history)
  ) {
    return { ok: false, error: 'The progress data in this backup is damaged.' };
  }
  const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : undefined;
  return { ok: true, settings, summary: summarize(settings, exportedAt) };
}
