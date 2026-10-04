// ARTSEY 0.8.1 layout, transcribed from the reference card.

export type Side = 'left' | 'right';
export type Key = 'a' | 'r' | 't' | 's' | 'e' | 'y' | 'i' | 'o';

// Physical positions as seen from above: top row left→right, then bottom row.
export const GRID: Record<Side, Key[]> = {
  right: ['a', 'r', 't', 's', 'e', 'y', 'i', 'o'],
  left: ['s', 't', 'r', 'a', 'o', 'i', 'y', 'e'],
};

export interface Chord {
  press: Key[];
  hold?: Key;
  /** Press one-shot Shift (R + T + S + E) first, then this chord. */
  shift?: boolean;
}

/** How a keystroke is recognised: by `key`, or by US physical `code` (+ shift) as a fallback for non-US OS layouts. */
export interface Match {
  key: string;
  code?: string;
  shift?: boolean;
}

export interface Item {
  id: string;
  label: string;
  name?: string;
  /** The character this item produces in text, if any. */
  char?: string;
  match?: Match;
  chords: Record<Side, Chord>;
}

const keys = (s: string) => s.split('') as Key[];
const both = (c: Chord): Record<Side, Chord> => ({ left: c, right: c });

// Base-layer combos are a mirror image between sides, so they are defined by key letter.
const BASE: [id: string, label: string, press: string, name?: string][] = [
  ['a', 'A', 'a'], ['r', 'R', 'r'], ['t', 'T', 't'], ['s', 'S', 's'],
  ['e', 'E', 'e'], ['y', 'Y', 'y'], ['i', 'I', 'i'], ['o', 'O', 'o'],
  ['b', 'B', 'eo'], ['c', 'C', 'ey'], ['d', 'D', 'art'], ['f', 'F', 'ar'],
  ['g', 'G', 'rt'], ['h', 'H', 'ei'], ['j', 'J', 'ts'], ['k', 'K', 'yo'],
  ['l', 'L', 'eyi'], ['m', 'M', 'yio'], ['n', 'N', 'io'], ['p', 'P', 'eio'],
  ['q', 'Q', 'ats'], ['u', 'U', 'yi'], ['v', 'V', 'rs'], ['w', 'W', 'as'],
  ['x', 'X', 'rts'], ['z', 'Z', 'arts'],
  ['space', '␣', 'eyio', 'Space'],
  ['enter', '⏎', 'ae', 'Enter'],
  ['backspace', '⌫', 're', 'Backspace'],
  ['delete', '⌦', 'ri', 'Delete'],
  ['tab', '⇥', 'arto', 'Tab'],
  ['esc', 'Esc', 'aro', 'Escape'],
  ["'", "'", 'ayi', 'Apostrophe'],
  ['.', '.', 'ay', 'Period'],
  [',', ',', 'ai', 'Comma'],
  ['/', '/', 'ao', 'Slash'],
  ['!', '!', 'ti', 'Exclamation'],
  ['ctrl', 'Ctrl', 'se', 'Ctrl (one-shot)'],
  ['gui', 'Gui', 'sy', 'GUI / Cmd (one-shot)'],
  ['alt', 'Alt', 'si', 'Alt (one-shot)'],
  ['shift', 'Shift', 'rtse', 'Shift (one-shot)'],
  ['shiftlock', '⇧ Lock', 'ry', 'Shift lock'],
  ['caps', 'Caps', 'ayio', 'Caps lock'],
  ['clearbt', 'Clr BT', 'rtyi', 'Clear Bluetooth'],
  ['locknav', 'Nav', 'rei', 'Lock nav layer'],
  ['lockmouse', 'Mouse', 'aty', 'Lock mouse layer'],
  ['btselect', 'BT', 'aseo', 'BT profile select'],
];

const SPECIAL_MATCH: Record<string, Match> = {
  space: { key: ' ', code: 'Space' },
  enter: { key: 'Enter', code: 'Enter' },
  backspace: { key: 'Backspace', code: 'Backspace' },
  delete: { key: 'Delete', code: 'Delete' },
  tab: { key: 'Tab', code: 'Tab' },
  esc: { key: 'Escape', code: 'Escape' },
};

// US physical key for each printable character.
const CHAR_CODE: Record<string, [code: string, shift: boolean]> = {
  "'": ['Quote', false], '.': ['Period', false], ',': ['Comma', false],
  '/': ['Slash', false], '!': ['Digit1', true], '?': ['Slash', true],
  '(': ['Digit9', true], ')': ['Digit0', true], '{': ['BracketLeft', true],
  '}': ['BracketRight', true], '[': ['BracketLeft', false], ']': ['BracketRight', false],
  '\\': ['Backslash', false], ';': ['Semicolon', false], '`': ['Backquote', false],
  '-': ['Minus', false], '=': ['Equal', false],
  // Shifted characters, typed with one-shot Shift and then the base key.
  ':': ['Semicolon', true], '"': ['Quote', true], '<': ['Comma', true], '>': ['Period', true],
  '_': ['Minus', true], '+': ['Equal', true], '|': ['Backslash', true], '~': ['Backquote', true],
  '@': ['Digit2', true], '#': ['Digit3', true], '$': ['Digit4', true], '%': ['Digit5', true],
  '^': ['Digit6', true], '&': ['Digit7', true], '*': ['Digit8', true],
};

function charMatch(ch: string): Match {
  if (/^[a-z]$/.test(ch)) return { key: ch, code: `Key${ch.toUpperCase()}` };
  if (/^[0-9]$/.test(ch)) return { key: ch, code: `Digit${ch}`, shift: false };
  const [code, shift] = CHAR_CODE[ch];
  return { key: ch, code, shift };
}

const CHAR_OF: Record<string, string> = { space: ' ' };

export const BASE_ITEMS: Item[] = BASE.map(([id, label, press, name]) => {
  const char = id.length === 1 ? id : CHAR_OF[id];
  const match = SPECIAL_MATCH[id] ?? (char ? charMatch(char) : undefined);
  return { id, label, name, char, match, chords: both({ press: keys(press) }) };
});

// Layers are NOT all mirrored, so each side lists its outputs by physical position (GRID order).
// HOLD marks the key held to reach the layer; null is an unused key.
export const HOLD = Symbol('hold');
type Cell = string | null | typeof HOLD;

export interface Layer {
  id: string;
  title: string;
  /** 'hold' layers are momentary; 'lock' layers are toggled by a combo. */
  kind: 'hold' | 'lock';
  hold?: Key;
  lockItem?: string;
  cells: Record<Side, Cell[]>;
  /** Extra outputs reached by pressing two layer keys together. */
  combos?: [output: string, press: string][];
  drill: boolean;
}

export const LAYERS: Layer[] = [
  {
    id: 'numbers', title: 'Numbers', kind: 'hold', hold: 's', drill: true,
    cells: {
      right: ['1', '2', '3', HOLD, '4', '5', '6', null],
      left: [HOLD, '3', '2', '1', null, '6', '5', '4'],
    },
    combos: [['7', 'ar'], ['8', 'rt'], ['9', 'ey'], ['0', 'yi']],
  },
  {
    id: 'brackets', title: 'Brackets', kind: 'hold', hold: 'a', drill: true,
    cells: {
      right: [HOLD, '(', ')', '{', null, '[', ']', '}'],
      left: ['}', '(', ')', HOLD, '{', '[', ']', null],
    },
  },
  {
    id: 'symbols', title: 'Symbols', kind: 'hold', hold: 'e', drill: true,
    cells: {
      right: ['!', '\\', ';', '`', HOLD, '?', '-', '='],
      left: ['`', ';', '\\', '!', '=', '-', '?', HOLD],
    },
  },
  {
    id: 'custom', title: 'Custom', kind: 'hold', hold: 'o', drill: false,
    cells: {
      right: ['Mute', 'Ins', 'Vol Up', null, 'R Shift', 'Print Scr', 'Vol Dn', HOLD],
      left: [null, 'Vol Up', 'Ins', 'Mute', HOLD, 'Vol Dn', 'Print Scr', 'R Shift'],
    },
  },
  {
    id: 'nav', title: 'Nav (lock)', kind: 'lock', lockItem: 'locknav', drill: false,
    cells: {
      right: ['Home', 'Up', 'End', 'PgUp', 'Left', 'Down', 'Right', 'PgDn'],
      left: ['PgUp', 'Home', 'Up', 'End', 'PgDn', 'Left', 'Down', 'Right'],
    },
  },
  {
    id: 'mouse', title: 'Mouse (lock)', kind: 'lock', lockItem: 'lockmouse', drill: false,
    cells: {
      right: ['Btn1', 'Up', 'Btn2', 'Scroll Up', 'Left', 'Down', 'Right', 'Scroll Dn'],
      left: ['Scroll Up', 'Btn2', 'Up', 'Btn1', 'Scroll Dn', 'Left', 'Down', 'Right'],
    },
  },
  {
    id: 'bt', title: 'BT profile select', kind: 'lock', lockItem: 'btselect', drill: false,
    cells: {
      right: ['Profile 1', 'Profile 2', 'Profile 3', 'BT Mode', 'Profile 4', 'Profile 5', 'Profile 6', 'USB Mode'],
      left: ['BT Mode', 'Profile 3', 'Profile 2', 'Profile 1', 'USB Mode', 'Profile 6', 'Profile 5', 'Profile 4'],
    },
  },
];

function layerChord(layer: Layer, side: Side, output: string): Chord | undefined {
  const combo = layer.combos?.find(([o]) => o === output);
  if (combo) return { press: keys(combo[1]), hold: layer.hold };
  const pos = layer.cells[side].indexOf(output);
  if (pos < 0) return undefined;
  return { press: [GRID[side][pos]], hold: layer.hold };
}

export const LAYER_ITEMS: Item[] = LAYERS.filter((l) => l.drill).flatMap((layer) => {
  const outputs = [
    ...layer.cells.right.filter((c): c is string => typeof c === 'string'),
    ...(layer.combos ?? []).map(([o]) => o),
  ];
  return outputs.map((out) => ({
    id: `${layer.id}:${out}`,
    label: out,
    char: out,
    match: charMatch(out),
    chords: { left: layerChord(layer, 'left', out)!, right: layerChord(layer, 'right', out)! },
  }));
});

/**
 * One-shot Shift and then a key gives that key's shifted character, as on a US keyboard.
 * Ids use names because ':' '>' and '|' would clash with separators in saved stats.
 */
const SHIFTED: [char: string, base: string, id: string, name: string][] = [
  [':', ';', 'colon', 'Colon'], ['"', "'", 'quote', 'Double quote'], ['<', ',', 'less', 'Less than'],
  ['>', '.', 'greater', 'Greater than'], ['_', '-', 'underscore', 'Underscore'], ['+', '=', 'plus', 'Plus'],
  ['|', '\\', 'pipe', 'Pipe'], ['~', '`', 'tilde', 'Tilde'], ['@', '2', 'at', 'At sign'], ['#', '3', 'hash', 'Hash'],
  ['$', '4', 'dollar', 'Dollar'], ['%', '5', 'percent', 'Percent'], ['^', '6', 'caret', 'Caret'],
  ['&', '7', 'and', 'Ampersand'], ['*', '8', 'star', 'Asterisk'],
];

const UNSHIFTED_BY_CHAR = new Map<string, Item>();
for (const item of [...LAYER_ITEMS, ...BASE_ITEMS]) if (item.char) UNSHIFTED_BY_CHAR.set(item.char, item);

export const SHIFTED_ITEMS: Item[] = SHIFTED.map(([char, base, id, name]) => {
  const b = UNSHIFTED_BY_CHAR.get(base)!;
  return {
    id: `shift:${id}`,
    label: char,
    name,
    char,
    match: charMatch(char),
    chords: { left: { ...b.chords.left, shift: true }, right: { ...b.chords.right, shift: true } },
  };
});

export const ITEMS: Item[] = [...BASE_ITEMS, ...LAYER_ITEMS, ...SHIFTED_ITEMS];
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

/** Best way to type a character: base-layer combos win over layer keys (e.g. '!'), and both over Shift. */
export const ITEM_BY_CHAR = new Map<string, Item>();
for (const item of [...SHIFTED_ITEMS, ...LAYER_ITEMS, ...BASE_ITEMS]) if (item.char) ITEM_BY_CHAR.set(item.char, item);

export interface Lesson {
  id: string;
  title: string;
  desc: string;
  items: string[];
}

const ids = (s: string) => s.split(' ');
const layerIds = (id: string) => LAYER_ITEMS.filter((i) => i.id.startsWith(`${id}:`)).map((i) => i.id);

export const LESSONS: Lesson[] = [
  { id: 'home', title: 'Home keys', desc: 'The eight single keys: A R T S E Y I O', items: ids('a r t s e y i o') },
  { id: 'pairs', title: 'Two-key letters', desc: 'B C F G H J K N U V W', items: ids('b c f g h j k n u v w') },
  { id: 'triples', title: 'Three & four-key letters', desc: 'D L M P Q X Z', items: ids('d l m p q x z') },
  { id: 'alpha', title: 'Full alphabet', desc: 'All 26 letters mixed', items: ids('a b c d e f g h i j k l m n o p q r s t u v w x y z') },
  { id: 'editing', title: 'Space & editing', desc: 'Space, Enter, Backspace, Delete, Tab, Esc', items: ids('space enter backspace delete tab esc') },
  { id: 'punct', title: 'Punctuation', desc: "' . , / !", items: ids("' . , / !") },
  { id: 'numbers', title: 'Numbers layer', desc: 'Hold S. 7 8 9 0 are two-key combos', items: layerIds('numbers') },
  { id: 'brackets', title: 'Brackets layer', desc: 'Hold A: ( ) [ ] { }', items: layerIds('brackets') },
  { id: 'symbols', title: 'Symbols layer', desc: 'Hold E: ! \\ ; ` ? - =', items: layerIds('symbols') },
  {
    id: 'shifted',
    title: 'Shifted symbols',
    desc: 'One-shot Shift, then a key: : " < > _ + | ~ @ # $ % ^ & *',
    items: SHIFTED_ITEMS.map((i) => i.id),
  },
];

export function describeChord(c: Chord): string {
  const press = c.press.map((k) => k.toUpperCase()).join(' + ');
  const main = c.hold ? `Hold ${c.hold.toUpperCase()}, then ${press}` : press;
  return c.shift ? `Shift (R + T + S + E), then ${main.replace(/^Hold/, 'hold')}` : main;
}
