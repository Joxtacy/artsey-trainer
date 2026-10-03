import { ITEM_BY_ID, type Chord, type Side } from './layout';
import { explain, type KeyLike } from './match';

export interface LiveKey extends KeyLike {
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
}

export interface ModUse {
  label: string;
  chord: Chord;
}

export interface LiveEntry {
  n: number;
  label: string;
  name: string;
  /** The chord to light on the board; undefined while it is still ambiguous. */
  chord?: Chord;
  /** Modifiers applied to this key, shown alongside the main chord. */
  mods: ModUse[];
  /** Candidate chords when the keystroke alone can't tell which one was used. */
  options?: ModUse[];
  note?: string;
  /** A bare modifier still waiting for the key it applies to. */
  pending?: Mod;
}

type Mod = 'ctrl' | 'gui' | 'alt' | 'shift';

const MOD_OF_KEY: Record<string, Mod> = { Control: 'ctrl', Meta: 'gui', Alt: 'alt', Shift: 'shift' };
const FLAG: Record<Mod, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> = {
  ctrl: 'ctrlKey',
  gui: 'metaKey',
  alt: 'altKey',
  shift: 'shiftKey',
};
const MOD_ORDER: Mod[] = ['ctrl', 'gui', 'alt', 'shift'];

/** How long a bare Shift must stand alone before it counts as Shift lock. */
export const SHIFT_SETTLE_MS = 80;

/**
 * Turns raw keystrokes into "what chord did that" entries, newest first.
 *
 * The firmware holds one-shot modifiers back and sends them together with the next key,
 * so a one-shot is only visible once that key arrives. Shift lock sends Shift on its own
 * straight away, so a Shift with no key right behind it (see settle()) is the lock.
 */
export class LiveTyping {
  entries: LiveEntry[] = [];
  private n = 0;
  private shiftDown = false;
  private shiftKind: 'unknown' | 'oneshot' | 'lock' = 'unknown';
  private shiftPress?: LiveEntry;

  constructor(
    private side: Side,
    private limit = 14,
  ) {}

  private use(id: string): ModUse {
    const item = ITEM_BY_ID.get(id)!;
    return { label: item.label, chord: item.chords[this.side] };
  }

  private push(entry: Omit<LiveEntry, 'n'>): LiveEntry {
    const e = { ...entry, n: ++this.n };
    this.entries = [e, ...this.entries].slice(0, this.limit);
    return e;
  }

  /** Returns true when the key was recognised. */
  keydown(e: LiveKey): boolean {
    if (e.repeat) return false;
    const mod = MOD_OF_KEY[e.key];
    if (mod) {
      this.modifierDown(mod);
      return true;
    }

    const x = explain(e, this.side);
    if (!x) return false;

    // A key arriving with an undecided Shift came with it, so that Shift was a one-shot (or part of a symbol).
    if (this.shiftDown && this.shiftKind === 'unknown') this.shiftKind = 'oneshot';

    // Fold the bare modifier presses that arrived with this key into one entry.
    const held = MOD_ORDER.filter((m) => e[FLAG[m]]);
    while (this.entries[0]?.pending && held.includes(this.entries[0].pending)) this.entries.shift();

    // Characters like ( or ? need Shift anyway, so it only counts as a modifier for letters and named keys.
    const active = held.filter((m) => !(m === 'shift' && x.symbol));
    const mods = active.map((m) => (m === 'shift' ? this.use(this.shiftKind === 'lock' ? 'shiftlock' : 'shift') : this.use(m)));
    const prefix = active.filter((m) => m !== 'shift' || !x.letter).map((m) => this.use(m).label);
    this.push({
      label: [...prefix, x.label].join(' + '),
      name: x.name,
      chord: x.chord,
      mods,
    });
    return true;
  }

  /** Call SHIFT_SETTLE_MS after a Shift keydown. Returns true if the entries changed. */
  settle(): boolean {
    if (!this.shiftDown || this.shiftKind !== 'unknown' || !this.shiftPress) return false;
    this.shiftKind = 'lock';
    const item = ITEM_BY_ID.get('shiftlock')!;
    Object.assign(this.shiftPress, {
      label: item.label,
      name: 'Shift lock on',
      chord: item.chords[this.side],
      options: undefined,
      note: undefined,
      pending: undefined,
    });
    return true;
  }

  keyup(e: Pick<KeyLike, 'key'>): void {
    if (e.key !== 'Shift' || !this.shiftDown) return;
    if (this.shiftKind === 'lock') {
      const lock = this.use('shiftlock');
      this.push({ label: lock.label, name: 'Shift lock off', chord: lock.chord, mods: [] });
    }
    this.shiftDown = false;
    this.shiftKind = 'unknown';
    this.shiftPress = undefined;
  }

  private modifierDown(mod: Mod) {
    if (mod !== 'shift') {
      const item = ITEM_BY_ID.get(mod)!;
      this.push({ label: item.label, name: item.name!, chord: item.chords[this.side], mods: [], pending: mod, note: 'Waiting for the next key…' });
      return;
    }
    if (this.shiftDown) return;
    this.shiftDown = true;
    this.shiftKind = 'unknown';
    const oneShot = this.use('shift');
    const lock = this.use('shiftlock');
    this.shiftPress = this.push({
      label: 'Shift',
      name: 'One-shot or lock?',
      mods: [],
      pending: 'shift',
      options: [
        { label: 'One-shot', chord: oneShot.chord },
        { label: 'Lock', chord: lock.chord },
      ],
    });
  }
}
