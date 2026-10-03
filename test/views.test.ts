// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Learn from '../src/components/Learn.svelte';
import Type from '../src/components/Type.svelte';
import { ITEM_BY_ID } from '../src/layout';
import { settings } from '../src/settings.svelte';

const press = (key: string, code: string, shiftKey = false) => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey, bubbles: true, cancelable: true }));
  flushSync();
};
const typeLetter = (ch: string) => press(ch, `Key${ch.toUpperCase()}`);
const text = (sel: string) => document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: ReturnType<typeof mount> | undefined;
const render = (c: typeof Learn | typeof Type) => {
  app = mount(c, { target: document.body });
  flushSync();
};

beforeEach(() => {
  settings.stats = {};
  settings.confusions = {};
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
    const first = text('.glyph');
    expect(['B', 'C']).toContain(first);
    typeLetter(first.toLowerCase());
    await sleep(200);
    flushSync();
    expect(text('.glyph')).toBe(first === 'B' ? 'C' : 'B');

    expect(text('.confusions')).toContain('C when you meant B ×3');
    expect(document.querySelectorAll('.crow .chord')).toHaveLength(2);
  });

  it('falls back to a normal lesson when the confusions are reset', () => {
    settings.confusions = { b: { c: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    const reset = document.querySelector<HTMLButtonElement>('.reset')!;
    reset.click();
    reset.click();
    flushSync();
    expect(settings.confusions).toEqual({});
    expect(document.querySelector('.confusions')).toBeNull();
    expect(ITEM_BY_ID.has(text('.glyph').toLowerCase())).toBe(true);
  });
});

describe('Type: confusions', () => {
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
