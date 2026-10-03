import type { Stats } from './drill';
import type { Side } from './layout';

export type HintMode = 'always' | 'delay' | 'never';

export interface Settings {
  side: Side;
  hint: HintMode;
  hintDelay: number;
  lesson: string;
  view: 'learn' | 'type' | 'chart';
  punctuation: boolean;
  numbers: boolean;
  wordCount: number;
  stats: Stats;
}

const KEY = 'artsey-trainer:v1';

const DEFAULTS: Settings = {
  side: 'right',
  hint: 'delay',
  hintDelay: 1500,
  lesson: 'home',
  view: 'learn',
  punctuation: false,
  numbers: false,
  wordCount: 20,
  stats: {},
};

export function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function save(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode etc.) — progress just won't persist.
  }
}
