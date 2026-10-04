import type { Confusions } from './confusions';
import type { Stats } from './drill';
import type { History } from './history';
import type { Side } from './layout';

export type HintMode = 'always' | 'delay' | 'never';

export interface Settings {
  side: Side;
  hint: HintMode;
  hintDelay: number;
  lesson: string;
  view: 'learn' | 'type' | 'chart' | 'progress';
  punctuation: boolean;
  numbers: boolean;
  wordCount: number;
  stats: Stats;
  confusions: Confusions;
  /** Timing of each character-to-character transition in Type, keyed "from>to". */
  pairStats: Stats;
  focusWeak: boolean;
  /** Type code samples instead of words. */
  code: boolean;
  codeSamples: number;
  /** Daily practice summaries for the Progress view. */
  history: History;
}

const KEY = 'artsey-trainer:v1';

function defaults(): Settings {
  return {
    side: 'right',
    hint: 'delay',
    hintDelay: 1500,
    lesson: 'home',
    view: 'learn',
    punctuation: false,
    numbers: false,
    wordCount: 20,
    stats: {},
    confusions: {},
    pairStats: {},
    focusWeak: false,
    code: false,
    codeSamples: 4,
    history: {},
  };
}

/** Saved data from older versions lacks newer fields; those fall back to their defaults. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return defaults();
  try {
    const saved = JSON.parse(raw);
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...defaults(), ...saved } : defaults();
  } catch {
    return defaults();
  }
}

export function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(KEY));
  } catch {
    return defaults();
  }
}

export function save(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode etc.) — progress just won't persist.
  }
}
