import type { Chord, Item, Match, Side } from './layout';
import { BASE_ITEMS, GRID, ITEM_BY_ID, ITEMS, LAYERS } from './layout';

export interface KeyLike {
  key: string;
  code: string;
  shiftKey: boolean;
}

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'Fn', 'Dead', 'Unidentified', 'Process']);

/** Modifier-only presses (e.g. a one-shot Shift) and dead keys never count as an attempt. */
export function isIgnorable(e: KeyLike): boolean {
  return MODIFIERS.has(e.key);
}

export function matches(e: KeyLike, m: Match): boolean {
  if (e.key === m.key) return true;
  if (/^[a-z]$/.test(m.key) && e.key.toLowerCase() === m.key) return true;
  // Fallback for non-US OS layouts: the firmware sends US keycodes, so trust the physical code.
  return !!m.code && e.code === m.code && (m.shift === undefined || m.shift === e.shiftKey);
}

/** Work out which item the user actually typed, to show them the chord they hit. */
export function identify(e: KeyLike): Item | undefined {
  return BASE_ITEMS.find((i) => i.match && matches(e, i.match)) ?? ITEMS.find((i) => i.match && matches(e, i.match));
}

/** Skip auto-repeat, OS/browser shortcuts, and typing inside form fields. */
export function shouldHandle(e: KeyboardEvent): boolean {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return false;
  const t = e.target;
  return !(t instanceof Element && t.closest('input, textarea, select'));
}

export interface Explained {
  label: string;
  name: string;
  chord: Chord;
  /** A letter, whose case shows whether Shift was applied. */
  letter: boolean;
  /** A character such as ( or ? that already needs Shift to be typed. */
  symbol: boolean;
}

const MODIFIER_ITEM: Record<string, string> = {
  Control: 'ctrl',
  Meta: 'gui',
  Alt: 'alt',
  Shift: 'shift',
  CapsLock: 'caps',
};

const NAV_OUTPUT: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
};

function itemName(item: Item): string {
  if (item.name) return item.name;
  const layer = LAYERS.find((l) => item.id.startsWith(`${l.id}:`));
  return layer ? `${layer.title} layer` : 'Letter';
}

/** Explain any keystroke as the chord that produced it, including modifiers and locked-nav keys. */
export function explain(e: KeyLike, side: Side): Explained | undefined {
  const mod = MODIFIER_ITEM[e.key];
  const item = mod ? ITEM_BY_ID.get(mod) : identify(e);
  if (item) {
    // Case comes from Shift rather than e.key, which Alt on macOS turns into other characters.
    const letter = /^[a-z]$/.test(item.id);
    const label = letter ? (e.shiftKey ? item.id.toUpperCase() : item.id) : item.label;
    const symbol = !letter && !!item.char && item.char !== ' ';
    return { label, name: itemName(item), chord: item.chords[side], letter, symbol };
  }
  const nav = NAV_OUTPUT[e.key];
  if (nav) {
    const pos = LAYERS.find((l) => l.id === 'nav')!.cells[side].indexOf(nav);
    return { label: nav, name: 'Nav layer (locked)', chord: { press: [GRID[side][pos]] }, letter: false, symbol: false };
  }
  return undefined;
}
