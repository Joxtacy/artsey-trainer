// ARTSEY layouts: 0.8.1 transcribed from the reference card, 0.9.0 from the beta diagram and checked
// against the official QMK firmware (artseyio/qmk-artsey, "Firmware Files/Version 0.9.0").

export type Side = 'left' | 'right';
export type Key = 'a' | 'r' | 't' | 's' | 'e' | 'y' | 'i' | 'o';
export type Version = '0.8.1' | '0.9.0';

export const VERSIONS: { id: Version; label: string }[] = [
  { id: '0.8.1', label: '0.8.1' },
  { id: '0.9.0', label: '0.9.0' },
];

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
  /** Stats key. Same as `base`, except in a later version whose chord differs from 0.8.1 (e.g. ",@0.9"). */
  id: string;
  /** Id in the layout definition, the same in every version (e.g. "," or "locknav"). */
  base: string;
  label: string;
  name?: string;
  /** The character this item produces in text, if any. */
  char?: string;
  match?: Match;
  chords: Record<Side, Chord>;
}

// Layers are not always mirrored, so each side lists its outputs by physical position (GRID order).
// HOLD marks the key held to reach the layer; null is an unused key.
export const HOLD = Symbol('hold');
type Cell = string | null | typeof HOLD;

export interface Layer {
  id: string;
  title: string;
  /** 'hold' layers are momentary; 'lock' layers are toggled by a combo. */
  kind: 'hold' | 'lock';
  hold?: Key;
  /** Base id of the combo that locks the layer. */
  lockItem?: string;
  cells: Record<Side, Cell[]>;
  /** Extra outputs reached by pressing two layer keys together. */
  combos?: [output: string, press: string][];
  drill: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  desc: string;
  /** Item ids (stats keys) for this version. */
  items: string[];
}

export interface Layout {
  version: Version;
  baseItems: Item[];
  layerItems: Item[];
  shiftedItems: Item[];
  items: Item[];
  layers: Layer[];
  lessons: Lesson[];
  /** By stats key (`Item.id`). */
  byId: Map<string, Item>;
  /** Best way to type a character: base combos win over layer keys (e.g. '!'), and both over Shift. */
  byChar: Map<string, Item>;
  /** By definition id (`Item.base`), for code that names a specific combo such as "shift". */
  item(base: string): Item | undefined;
}

const keys = (s: string) => s.split('') as Key[];
const both = (c: Chord): Record<Side, Chord> => ({ left: c, right: c });

type BaseDef = [id: string, label: string, press: string, name?: string];

// Base-layer combos are a mirror image between sides, so they are defined by key letter.
const LETTERS: BaseDef[] = [
  ['a', 'A', 'a'], ['r', 'R', 'r'], ['t', 'T', 't'], ['s', 'S', 's'],
  ['e', 'E', 'e'], ['y', 'Y', 'y'], ['i', 'I', 'i'], ['o', 'O', 'o'],
  ['b', 'B', 'eo'], ['c', 'C', 'ey'], ['d', 'D', 'art'], ['f', 'F', 'ar'],
  ['g', 'G', 'rt'], ['h', 'H', 'ei'], ['j', 'J', 'ts'], ['k', 'K', 'yo'],
  ['l', 'L', 'eyi'], ['m', 'M', 'yio'], ['n', 'N', 'io'], ['p', 'P', 'eio'],
  ['q', 'Q', 'ats'], ['u', 'U', 'yi'], ['v', 'V', 'rs'], ['w', 'W', 'as'],
  ['x', 'X', 'rts'], ['z', 'Z', 'arts'],
];

const EDITING: BaseDef[] = [
  ['space', '␣', 'eyio', 'Space'],
  ['enter', '⏎', 'ae', 'Enter'],
  ['backspace', '⌫', 're', 'Backspace'],
  ['delete', '⌦', 'ri', 'Delete'],
  ['tab', '⇥', 'arto', 'Tab'],
  ['esc', 'Esc', 'aro', 'Escape'],
];

const NUMBERS: Layer = {
  id: 'numbers', title: 'Numbers', kind: 'hold', hold: 's', drill: true,
  cells: {
    right: ['1', '2', '3', HOLD, '4', '5', '6', null],
    left: [HOLD, '3', '2', '1', null, '6', '5', '4'],
  },
  combos: [['7', 'ar'], ['8', 'rt'], ['9', 'ey'], ['0', 'yi']],
};

const NAV: Layer = {
  id: 'nav', title: 'Nav (lock)', kind: 'lock', lockItem: 'locknav', drill: false,
  cells: {
    right: ['Home', 'Up', 'End', 'PgUp', 'Left', 'Down', 'Right', 'PgDn'],
    left: ['PgUp', 'Home', 'Up', 'End', 'PgDn', 'Left', 'Down', 'Right'],
  },
};

const MOUSE: Layer = {
  id: 'mouse', title: 'Mouse (lock)', kind: 'lock', lockItem: 'lockmouse', drill: false,
  cells: {
    right: ['Btn1', 'Up', 'Btn2', 'Scroll Up', 'Left', 'Down', 'Right', 'Scroll Dn'],
    left: ['Scroll Up', 'Btn2', 'Up', 'Btn1', 'Scroll Dn', 'Left', 'Down', 'Right'],
  },
};

interface LayoutDef {
  version: Version;
  base: BaseDef[];
  layers: Layer[];
  /** Base ids for the punctuation lesson. */
  punctuation: string;
}

const V081: LayoutDef = {
  version: '0.8.1',
  base: [
    ...LETTERS,
    ...EDITING,
    // Period and comma follow the 0.8.1 card (confirmed on a Paintbrush board); the official
    // 0.8.1 firmware files have them the other way round.
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
  ],
  layers: [
    NUMBERS,
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
    NAV,
    MOUSE,
    {
      id: 'bt', title: 'BT profile select', kind: 'lock', lockItem: 'btselect', drill: false,
      cells: {
        right: ['Profile 1', 'Profile 2', 'Profile 3', 'BT Mode', 'Profile 4', 'Profile 5', 'Profile 6', 'USB Mode'],
        left: ['BT Mode', 'Profile 3', 'Profile 2', 'Profile 1', 'USB Mode', 'Profile 6', 'Profile 5', 'Profile 4'],
      },
    },
  ],
  punctuation: "' . , / !",
};

const V090: LayoutDef = {
  version: '0.9.0',
  base: [
    ...LETTERS,
    ...EDITING,
    ["'", "'", 'ry', 'Apostrophe'],
    ['.', '.', 'ai', 'Period'],
    [',', ',', 'ay', 'Comma'],
    ['/', '/', 'ao', 'Slash'],
    ['!', '!', 'ti', 'Exclamation'],
    ['?', '?', 'so', 'Question mark'],
    // In 0.9.0, Ctrl, GUI, and Alt stay on until their combo is pressed again.
    ['ctrl', 'Ctrl', 'se', 'Ctrl (lock)'],
    ['gui', 'Gui', 'sy', 'GUI / Cmd (lock)'],
    ['alt', 'Alt', 'si', 'Alt (lock)'],
    ['shift', 'Shift', 'rtse', 'Shift (one-shot)'],
    ['shiftlock', '⇧ Lock', 'ayio', 'Shift lock'],
    ['clear', 'Clear', 'arteyios', 'Release modifiers, back to base'],
    ['locknav', 'Nav', 'rei', 'Lock nav layer'],
    ['lockmouse', 'Mouse', 'aty', 'Lock mouse layer'],
  ],
  layers: [
    NUMBERS,
    {
      id: 'brackets', title: 'Brackets', kind: 'hold', hold: 'a', drill: true,
      cells: {
        right: [HOLD, '(', '[', '{', null, ')', ']', '}'],
        left: ['{', '[', '(', HOLD, '}', ']', ')', null],
      },
    },
    {
      id: 'symbols', title: 'Symbols', kind: 'hold', hold: 'e', drill: true,
      cells: {
        right: ['#', '`', ';', '\\', HOLD, '@', '-', '='],
        left: ['\\', ';', '`', '#', '=', '-', '@', HOLD],
      },
    },
    {
      id: 'custom', title: 'Custom', kind: 'hold', hold: 'o', drill: false,
      cells: {
        right: ['Play', 'Mute', 'Vol Up', null, 'Prev', 'Next', 'Vol Dn', HOLD],
        left: [null, 'Vol Up', 'Mute', 'Play', HOLD, 'Vol Dn', 'Prev', 'Next'],
      },
    },
    NAV,
    MOUSE,
  ],
  punctuation: "' . , / ! ?",
};

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

/**
 * One-shot Shift and then a key gives that key's shifted character, as on a US keyboard. A version
 * only gets a shifted item when it has no direct key for the character (0.9.0 has # and @ keys).
 * Ids use names because ':' '>' and '|' would clash with separators in saved stats.
 */
const SHIFTED: [char: string, base: string, id: string, name: string][] = [
  [':', ';', 'colon', 'Colon'], ['"', "'", 'quote', 'Double quote'], ['<', ',', 'less', 'Less than'],
  ['>', '.', 'greater', 'Greater than'], ['_', '-', 'underscore', 'Underscore'], ['+', '=', 'plus', 'Plus'],
  ['|', '\\', 'pipe', 'Pipe'], ['~', '`', 'tilde', 'Tilde'], ['@', '2', 'at', 'At sign'], ['#', '3', 'hash', 'Hash'],
  ['$', '4', 'dollar', 'Dollar'], ['%', '5', 'percent', 'Percent'], ['^', '6', 'caret', 'Caret'],
  ['&', '7', 'and', 'Ampersand'], ['*', '8', 'star', 'Asterisk'],
];

const CHAR_OF: Record<string, string> = { space: ' ' };

function layerChord(layer: Layer, side: Side, output: string): Chord | undefined {
  const combo = layer.combos?.find(([o]) => o === output);
  if (combo) return { press: keys(combo[1]), hold: layer.hold };
  const pos = layer.cells[side].indexOf(output);
  if (pos < 0) return undefined;
  return { press: [GRID[side][pos]], hold: layer.hold };
}

/** Same keys on both sides, ignoring the order they are listed in. */
const chordKey = (c: Chord) => `${c.shift ? 'shift+' : ''}${c.hold ?? ''}|${[...c.press].sort().join('')}`;
const sameChords = (a: Item, b: Item) =>
  chordKey(a.chords.left) === chordKey(b.chords.left) && chordKey(a.chords.right) === chordKey(b.chords.right);

function buildLayout(def: LayoutDef, reference?: Layout): Layout {
  const baseItems: Item[] = def.base.map(([id, label, press, name]) => {
    const char = id.length === 1 ? id : CHAR_OF[id];
    const match = SPECIAL_MATCH[id] ?? (char ? charMatch(char) : undefined);
    return { id, base: id, label, name, char, match, chords: both({ press: keys(press) }) };
  });

  const layerItems: Item[] = def.layers
    .filter((l) => l.drill)
    .flatMap((layer) => {
      const outputs = [
        ...layer.cells.right.filter((c): c is string => typeof c === 'string'),
        ...(layer.combos ?? []).map(([o]) => o),
      ];
      return outputs.map((out) => ({
        id: `${layer.id}:${out}`,
        base: `${layer.id}:${out}`,
        label: out,
        char: out,
        match: charMatch(out),
        chords: { left: layerChord(layer, 'left', out)!, right: layerChord(layer, 'right', out)! },
      }));
    });

  const unshifted = new Map<string, Item>();
  for (const item of [...layerItems, ...baseItems]) if (item.char) unshifted.set(item.char, item);

  const shiftedItems: Item[] = SHIFTED.filter(([char]) => !unshifted.has(char)).map(([char, base, id, name]) => {
    const b = unshifted.get(base)!;
    return {
      id: `shift:${id}`,
      base: `shift:${id}`,
      label: char,
      name,
      char,
      match: charMatch(char),
      chords: { left: { ...b.chords.left, shift: true }, right: { ...b.chords.right, shift: true } },
    };
  });

  const items = [...baseItems, ...layerItems, ...shiftedItems];

  // Share stats with the reference version only where the chord is the same on both hands.
  if (reference) {
    const suffix = `@${def.version.split('.').slice(0, 2).join('.')}`;
    for (const item of items) {
      const ref = reference.item(item.base);
      if (ref && !sameChords(ref, item)) item.id = `${item.base}${suffix}`;
    }
  }

  const byBase = new Map(items.map((i) => [i.base, i]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const byChar = new Map<string, Item>();
  for (const item of [...shiftedItems, ...layerItems, ...baseItems]) if (item.char) byChar.set(item.char, item);

  const idsOf = (bases: string[]) => bases.map((b) => byBase.get(b)!.id);
  const split = (s: string) => s.split(' ');
  const layerLesson = (id: string, title: string): Lesson => {
    const layer = def.layers.find((l) => l.id === id)!;
    const its = layerItems.filter((i) => i.base.startsWith(`${id}:`));
    const desc =
      id === 'numbers'
        ? `Hold ${layer.hold!.toUpperCase()}. 7 8 9 0 are two-key combos`
        : `Hold ${layer.hold!.toUpperCase()}: ${its.map((i) => i.label).join(' ')}`;
    return { id, title, desc, items: its.map((i) => i.id) };
  };

  const lessons: Lesson[] = [
    { id: 'home', title: 'Home keys', desc: 'The eight single keys: A R T S E Y I O', items: idsOf(split('a r t s e y i o')) },
    { id: 'pairs', title: 'Two-key letters', desc: 'B C F G H J K N U V W', items: idsOf(split('b c f g h j k n u v w')) },
    { id: 'triples', title: 'Three & four-key letters', desc: 'D L M P Q X Z', items: idsOf(split('d l m p q x z')) },
    { id: 'alpha', title: 'Full alphabet', desc: 'All 26 letters mixed', items: idsOf('abcdefghijklmnopqrstuvwxyz'.split('')) },
    { id: 'editing', title: 'Space & editing', desc: 'Space, Enter, Backspace, Delete, Tab, Esc', items: idsOf(split('space enter backspace delete tab esc')) },
    { id: 'punct', title: 'Punctuation', desc: def.punctuation, items: idsOf(split(def.punctuation)) },
    layerLesson('numbers', 'Numbers layer'),
    layerLesson('brackets', 'Brackets layer'),
    layerLesson('symbols', 'Symbols layer'),
    {
      id: 'shifted',
      title: 'Shifted symbols',
      desc: `One-shot Shift, then a key: ${shiftedItems.map((i) => i.label).join(' ')}`,
      items: shiftedItems.map((i) => i.id),
    },
  ];

  return {
    version: def.version,
    baseItems,
    layerItems,
    shiftedItems,
    items,
    layers: def.layers,
    lessons,
    byId,
    byChar,
    item: (base) => byBase.get(base),
  };
}

const L081 = buildLayout(V081);
export const LAYOUTS: Record<Version, Layout> = {
  '0.8.1': L081,
  '0.9.0': buildLayout(V090, L081),
};

export function describeChord(c: Chord): string {
  const press = c.press.map((k) => k.toUpperCase()).join(' + ');
  const main = c.hold ? `Hold ${c.hold.toUpperCase()}, then ${press}` : press;
  return c.shift ? `Shift (R + T + S + E), then ${main.replace(/^Hold/, 'hold')}` : main;
}
