// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBackup } from '../src/backup';
import { CODE_SAMPLES } from '../src/code';
import { dayKey, logLearn, logTypeRound } from '../src/history';
import { ITEM_BY_CHAR } from '../src/layout';
import { parseSettings } from '../src/storage';
import Learn from '../src/components/Learn.svelte';
import Progress from '../src/components/Progress.svelte';
import Type from '../src/components/Type.svelte';
import { settings } from '../src/settings.svelte';

// jsdom has no ResizeObserver (used by bind:clientWidth); every browser the app targets does.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const press = (key: string, code: string, shiftKey = false) => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey, bubbles: true, cancelable: true }));
  flushSync();
};
const typeLetter = (ch: string) => press(ch, `Key${ch.toUpperCase()}`);
const text = (sel: string) => document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: ReturnType<typeof mount> | undefined;
const render = (c: typeof Learn | typeof Type | typeof Progress) => {
  app = mount(c, { target: document.body });
  flushSync();
};

beforeEach(() => {
  settings.stats = {};
  settings.confusions = {};
  settings.pairStats = {};
  settings.focusWeak = false;
  settings.history = {};
  settings.code = false;
  settings.codeSamples = 4;
  settings.lesson = 'pairs';
  settings.hint = 'never';
  settings.side = 'right';
});
afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
});

/** A letter that is not the current target. */
const otherThan = (label: string) => (label.toLowerCase() === 'z' ? 'q' : 'z');

describe('Learn: confusions', () => {
  it('records a miss once per prompt, even if the same wrong key repeats', () => {
    render(Learn);
    const target = text('.glyph').toLowerCase();
    const wrong = otherThan(target);
    typeLetter(wrong);
    typeLetter(wrong);
    expect(settings.confusions).toEqual({ [target]: { [wrong]: 1 } });
  });

  it('enables "My confusions" only once there is a confusion', () => {
    render(Learn);
    const btn = () => [...document.querySelectorAll<HTMLButtonElement>('.lesson')].find((b) => b.textContent?.includes('My confusions'))!;
    expect(btn().disabled).toBe(true);
    typeLetter(otherThan(text('.glyph')));
    expect(btn().disabled).toBe(false);
    expect(btn().textContent).toContain('1 pair');
  });

  it('drills a confused pair back to back and lists it with both chords', async () => {
    settings.confusions = { b: { c: 3 } };
    settings.lesson = 'confusions';
    render(Learn);
    expect(text('.confusions')).toContain('C when you meant B ×3');
    expect(document.querySelectorAll('.crow .chord')).toHaveLength(2);

    const first = text('.glyph');
    expect(['B', 'C']).toContain(first);
    typeLetter(first.toLowerCase());
    await sleep(200);
    flushSync();
    expect(text('.glyph')).toBe(first === 'B' ? 'C' : 'B');
    // Typing B right removes one "C for B" mistake; typing C right leaves it.
    expect(text('.confusions')).toContain(`C when you meant B ×${first === 'B' ? 2 : 3}`);
  });

  it('shows "all clear" when the confusions are reset during the drill', () => {
    settings.confusions = { b: { c: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    const reset = document.querySelector<HTMLButtonElement>('.reset')!;
    reset.click();
    reset.click();
    flushSync();
    expect(settings.confusions).toEqual({});
    expect(text('.clear')).toContain('No confusions left');
    expect(document.querySelector('.target')).toBeNull();
  });

  it('removes one mistake for each first-try correct answer, then shows "all clear"', async () => {
    settings.confusions = { b: { c: 1 }, c: { b: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    const first = text('.glyph');
    typeLetter(first.toLowerCase());
    await sleep(200);
    flushSync();
    // One direction of the pair is cleared; the other key is still drilled.
    expect(settings.confusions).toEqual(first === 'B' ? { c: { b: 1 } } : { b: { c: 1 } });
    const second = text('.glyph');
    expect(second).toBe(first === 'B' ? 'C' : 'B');
    typeLetter(second.toLowerCase());
    await sleep(200);
    flushSync();
    expect(settings.confusions).toEqual({});
    expect(text('.clear')).toContain('No confusions left');
  });

  it('does not remove a mistake when the right key comes after a miss', () => {
    settings.confusions = { b: { c: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    // The drill shows B or C; typing B for C (or C for B) records the reverse confusion, then the right key.
    const target = text('.glyph').toLowerCase();
    const wrong = target === 'b' ? 'c' : 'b';
    typeLetter(wrong);
    const afterMiss = settings.confusions[target]?.[wrong];
    expect(afterMiss).toBeGreaterThan(0);
    typeLetter(target);
    expect(settings.confusions[target]?.[wrong]).toBe(afterMiss);
  });
});

describe('Type: weak keys and transitions', () => {
  const typeNext = () => {
    const ch = document.querySelector('.c.cur')!.textContent!;
    if (ch === '·') press(' ', 'Space');
    else typeLetter(ch);
    return ch === '·' ? 'space' : ch;
  };

  it('records the transition between consecutive characters', () => {
    render(Type);
    const a = typeNext();
    const b = typeNext();
    expect(Object.keys(settings.pairStats)).toEqual([`${a}>${b}`]);
    expect(settings.pairStats[`${a}>${b}`]).toMatchObject({ n: 1, ok: 1 });
  });

  it('shows the focus line only with "Focus on weak keys" on', () => {
    settings.stats = { q: { n: 20, ok: 5, ms: 3000 } };
    render(Type);
    expect(document.querySelector('.focus')).toBeNull();
    const box = [...document.querySelectorAll('label')].find((l) => l.textContent?.includes('Focus on weak keys'))!.querySelector('input')!;
    box.click();
    flushSync();
    expect(settings.focusWeak).toBe(true);
    expect(text('.focus')).toMatch(/^Weakest keys: [A-Z ]+/);
    expect(text('.focus')).toContain('Slow transitions show up after a few rounds.');
  });

  it('lists the slowest transitions once there is enough data', () => {
    settings.focusWeak = true;
    settings.pairStats = { 'a>b': { n: 5, ok: 5, ms: 300 }, 'b>c': { n: 5, ok: 5, ms: 300 }, 't>h': { n: 5, ok: 5, ms: 900 } };
    render(Type);
    expect(text('.focus')).toContain('Slowest transitions: T→H');
  });
});

describe('Type: code mode', () => {
  /** Sends the key event the layout produces for a character (US key + Shift where needed). */
  const typeChar = (ch: string) => {
    const m = ITEM_BY_CHAR.get(ch)!.match!;
    press(m.key, m.code ?? '', m.shift ?? false);
  };
  const currentText = () => [...document.querySelectorAll('.text .c')].map((c) => (c.textContent === '·' ? ' ' : c.textContent)).join('');
  const toggleCode = () => {
    [...document.querySelectorAll('label')].find((l) => l.textContent?.trim() === 'Code')!.querySelector('input')!.click();
    flushSync();
  };

  it('switches the text to code samples and swaps the word options for a sample count', () => {
    render(Type);
    toggleCode();
    expect(settings.code).toBe(true);
    const t = currentText();
    expect(CODE_SAMPLES.some((c) => t.startsWith(c))).toBe(true);
    const labels = [...document.querySelectorAll('.controls label')].map((l) => l.textContent?.trim().split(/\s+/)[0]);
    expect(labels).toContain('Samples');
    expect(labels).not.toContain('Words');
    for (const name of ['Punctuation', 'Numbers', 'Focus on weak keys']) {
      const box = [...document.querySelectorAll('label')].find((l) => l.textContent?.trim() === name)!.querySelector('input')!;
      expect(box.disabled, name).toBe(true);
    }
  });

  it('keeps each sample together, so lines only break between samples', () => {
    settings.code = true;
    settings.codeSamples = 8;
    render(Type);
    const groups = [...document.querySelectorAll('.text .group')].map((g) => g.textContent!.replace(/·/g, ' ').trimEnd());
    expect(groups).toHaveLength(8);
    for (const g of groups) expect(CODE_SAMPLES).toContain(g);
  });

  it('can be typed from start to end, with layer hints along the way', () => {
    settings.code = true;
    settings.codeSamples = 16;
    settings.hint = 'always';
    render(Type);
    const t = currentText();
    let sawLayerHint = false;
    for (const ch of t) {
      if (ch === '(') {
        expect(text('.hint .instr')).toBe('Hold A, then R');
        sawLayerHint = true;
      }
      typeChar(ch);
    }
    expect(text('.result')).toContain('Done!');
    expect(settings.history[dayKey(new Date())].type).toMatchObject({ n: t.length, ok: t.length, rounds: 1 });
    // 16 samples practically always include a "(", but only assert it if one came up.
    if (t.includes('(')) expect(sawLayerHint).toBe(true);
  });

  it('accepts every code sample, typed with the real key events', () => {
    render(Type);
    [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Custom text'))!.click();
    flushSync();
    const area = document.querySelector('textarea')!;
    area.value = CODE_SAMPLES.join(' ');
    area.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    document.querySelector<HTMLButtonElement>('.custom .primary')!.click();
    flushSync();
    expect(currentText()).toBe(CODE_SAMPLES.join(' '));
    for (const ch of currentText()) typeChar(ch);
    expect(text('.result')).toContain('100% accuracy');
  });

  it('goes back to words when code mode is turned off', () => {
    settings.code = true;
    render(Type);
    toggleCode();
    expect(settings.code).toBe(false);
    expect(CODE_SAMPLES.some((c) => currentText().startsWith(c))).toBe(false);
  });
});

describe('Type: confusions', () => {
  it('removes one mistake when the next character is typed right first time', () => {
    render(Type);
    const next = document.querySelector('.c.cur')!.textContent!;
    settings.confusions = { [next]: { z: 2 } };
    typeLetter(next);
    expect(settings.confusions).toEqual({ [next]: { z: 1 } });
  });

  it('records a miss against the next character, once per position', () => {
    render(Type);
    const next = document.querySelector('.c.cur')!.textContent!;
    const target = next === '·' ? 'space' : next;
    const wrong = otherThan(next);
    typeLetter(wrong);
    typeLetter(wrong);
    expect(settings.confusions).toEqual({ [target]: { [wrong]: 1 } });
  });
});

describe('Learn: export and import', () => {
  const chooseFile = async (content: string) => {
    const input = document.querySelector<HTMLInputElement>('.backup input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File([content], 'backup.json')], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(10);
    flushSync();
  };
  const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;

  it('exports the current progress as a dated JSON file', async () => {
    settings.stats = { b: { n: 3, ok: 2, ms: 800 } };
    render(Learn);
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:x'));
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/^artsey-trainer-\d{4}-\d{2}-\d{2}\.json$/);
    });
    button('Export').click();
    flushSync();
    expect(click).toHaveBeenCalledOnce();
    const saved = JSON.parse(await blob!.text());
    expect(saved.format).toBe('artsey-trainer-backup');
    expect(saved.settings.stats).toEqual({ b: { n: 3, ok: 2, ms: 800 } });
    expect(text('.backup')).toContain('Progress exported.');
    click.mockRestore();
  });

  it('asks before replacing progress, then imports it but keeps the current tab', async () => {
    settings.stats = { a: { n: 1, ok: 1, ms: 500 } };
    settings.view = 'learn';
    render(Learn);
    const imported = { ...parseSettings(null), view: 'chart' as const, side: 'left' as const, stats: { q: { n: 9, ok: 7, ms: 900 } }, confusions: { q: { z: 2 } } };
    await chooseFile(makeBackup(imported));

    expect(text('.confirm')).toContain('Now: 1 keys practised, 0 confusions');
    expect(text('.confirm')).toContain('9 attempts, 2 confusions');
    expect(settings.stats).toEqual({ a: { n: 1, ok: 1, ms: 500 } });

    button('Replace').click();
    flushSync();
    expect(settings.stats).toEqual({ q: { n: 9, ok: 7, ms: 900 } });
    expect(settings.confusions).toEqual({ q: { z: 2 } });
    expect(settings.side).toBe('left');
    expect(settings.view).toBe('learn');
    expect(text('.backup')).toContain('Progress imported.');
    settings.side = 'right';
  });

  it('cancelling an import changes nothing', async () => {
    settings.stats = { a: { n: 1, ok: 1, ms: 500 } };
    render(Learn);
    await chooseFile(makeBackup({ ...parseSettings(null), stats: {} }));
    button('Cancel').click();
    flushSync();
    expect(document.querySelector('.confirm')).toBeNull();
    expect(settings.stats).toEqual({ a: { n: 1, ok: 1, ms: 500 } });
  });

  it('rejects a bad file with a message and keeps the progress', async () => {
    settings.stats = { a: { n: 1, ok: 1, ms: 500 } };
    render(Learn);
    await chooseFile('{"hello": "world"}');
    expect(text('.backup .error')).toContain('not an ARTSEY Trainer backup');
    expect(text('.backup .error')).toContain('Your progress was not changed.');
    expect(document.querySelector('.confirm')).toBeNull();
    expect(settings.stats).toEqual({ a: { n: 1, ok: 1, ms: 500 } });
  });
});

describe('Progress', () => {
  const today = dayKey(new Date());
  const DAY = 24 * 60 * 60 * 1000;

  it('logs each Learn answer under today and the current lesson', () => {
    render(Learn);
    typeLetter(text('.glyph').toLowerCase());
    expect(settings.history[today]).toMatchObject({ learn: { n: 1, ok: 1 }, lessons: { pairs: { n: 1, ok: 1 } } });
  });

  it('logs a completed Type round', () => {
    render(Type);
    [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Custom text'))!.click();
    flushSync();
    const area = document.querySelector('textarea')!;
    area.value = 'hi';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    document.querySelector<HTMLButtonElement>('.custom .primary')!.click();
    flushSync();
    typeLetter('h');
    typeLetter('x');
    typeLetter('i');
    expect(settings.history[today].type).toMatchObject({ n: 2, ok: 1, rounds: 1 });
  });

  it('shows an empty state before any practice', () => {
    render(Progress);
    expect(text('.empty')).toContain('progress shows up here');
    expect(text('.tiles')).toContain('Days practised 0');
  });

  it('shows tiles, both charts, the table, and lesson trends', () => {
    const now = Date.now();
    let h = {};
    for (let i = 0; i < 4; i++) h = logLearn(h, 'pairs', i < 2, 500, now - 9 * DAY);
    for (let i = 0; i < 4; i++) h = logLearn(h, 'pairs', i < 3, 500, now - 1 * DAY);
    h = logTypeRound(h, 100, 90, 60_000, now);
    settings.history = h;
    settings.stats = { b: { n: 20, ok: 20, ms: 400, t: now - 30 * DAY } };
    render(Progress);

    expect(text('.tiles')).toContain('Days practised 3');
    expect(text('.tiles')).toContain('Latest speed 20');
    expect(text('.tiles')).toContain('Due for review 1');
    expect(document.querySelectorAll('figure.chart')).toHaveLength(2);
    const legends = [...document.querySelectorAll('figure.chart')].map((f) => [...f.querySelectorAll('.legend .key')].map((k) => k.textContent));
    // One series needs no legend; two series always get one.
    expect(legends).toEqual([[], ['Learn', 'Type']]);
    expect(document.querySelectorAll('details tbody tr')).toHaveLength(3);
    expect(text('.trends tbody')).toContain('Two-key letters');
    expect(text('.trends tbody')).toContain('▲ 25 points better');
  });

  it('reads chart values with the keyboard', () => {
    settings.history = logTypeRound({}, 100, 90, 60_000, Date.now());
    render(Progress);
    const svg = document.querySelector<SVGSVGElement>('figure.chart svg')!;
    svg.dispatchEvent(new FocusEvent('focus'));
    flushSync();
    expect(text('.tip')).toContain('20 wpm');
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    flushSync();
    expect(text('.tip')).toContain('– Type');
  });

  it('changes the date range for tiles and charts', () => {
    settings.history = logLearn({}, 'home', true, 500, Date.now() - 20 * DAY);
    render(Progress);
    expect(text('.tiles')).toContain('Days practised 1');
    [...document.querySelectorAll<HTMLButtonElement>('.filters button')].find((b) => b.textContent === 'Last 14 days')!.click();
    flushSync();
    expect(text('.tiles')).toContain('Days practised 0');
  });

  it('is cleared by "Reset progress"', () => {
    settings.history = logLearn({}, 'home', true, 500);
    render(Learn);
    const reset = document.querySelector<HTMLButtonElement>('.reset')!;
    reset.click();
    reset.click();
    flushSync();
    expect(settings.history).toEqual({});
  });
});
