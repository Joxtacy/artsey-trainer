<script lang="ts">
  import { untrack } from 'svelte';
  import { addConfusion } from '../confusions';
  import { record } from '../drill';
  import { ITEM_BY_CHAR, describeChord, type Item } from '../layout';
  import { identify, isIgnorable, matches, shouldHandle } from '../match';
  import { settings } from '../settings.svelte';
  import { generateText, sanitize } from '../words';
  import Chord from './Chord.svelte';

  let text = $state('');
  let pos = $state(0);
  let marks = $state<('ok' | 'err')[]>([]);
  let missHere = $state(false);
  let wrong = $state<Item>();
  let showHint = $state(false);
  let startTs = $state(0);
  let lastTs = $state(0);
  let custom = $state('');
  let editing = $state(false);
  let usingCustom = $state(false);
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  // Wrong keys already recorded at the current position, so repeating one counts once.
  let missedHere = new Set<string>();

  const done = $derived(text.length > 0 && pos >= text.length);
  const nextItem = $derived(done ? undefined : ITEM_BY_CHAR.get(text[pos]));
  const nextChord = $derived(nextItem?.chords[settings.side]);

  // Group each word with its trailing space so lines only wrap after spaces.
  const tokens = $derived.by(() => {
    const out: { ch: string; i: number }[][] = [];
    for (let i = 0; i < text.length; i++) {
      if (i === 0 || text[i - 1] === ' ') out.push([]);
      out[out.length - 1].push({ ch: text[i], i });
    }
    return out;
  });

  const wpm = $derived(pos > 1 && lastTs > startTs ? Math.round(pos / 5 / ((lastTs - startTs) / 60000)) : 0);
  const accuracy = $derived(pos ? Math.round((marks.filter((m) => m === 'ok').length / pos) * 100) : 100);
  const seconds = $derived(startTs ? ((lastTs - startTs) / 1000).toFixed(1) : '0.0');

  function scheduleHint() {
    clearTimeout(hintTimer);
    showHint = settings.hint === 'always';
    if (settings.hint === 'delay') hintTimer = setTimeout(() => (showHint = true), settings.hintDelay);
  }

  function reset(newText: string) {
    text = newText;
    pos = 0;
    marks = [];
    missHere = false;
    missedHere = new Set();
    wrong = undefined;
    startTs = 0;
    lastTs = 0;
    scheduleHint();
  }

  function newText() {
    usingCustom = false;
    reset(generateText({ count: settings.wordCount, punctuation: settings.punctuation, numbers: settings.numbers }));
  }

  function restart() {
    if (usingCustom) reset(text);
    else newText();
  }

  function useCustom() {
    const t = sanitize(custom);
    if (!t) return;
    usingCustom = true;
    editing = false;
    reset(t);
  }

  $effect(() => {
    void settings.wordCount;
    void settings.punctuation;
    void settings.numbers;
    void settings.hint;
    untrack(newText);
  });
  $effect(() => () => clearTimeout(hintTimer));

  function onkeydown(e: KeyboardEvent) {
    if (!shouldHandle(e) || isIgnorable(e) || editing) return;
    if (done) {
      if (e.key === 'Enter') {
        e.preventDefault();
        restart();
      }
      return;
    }
    if (!nextItem?.match) return;
    e.preventDefault();
    const now = performance.now();
    if (matches(e, nextItem.match)) {
      if (!startTs) startTs = now;
      // The first character has no meaningful timing, so only later ones feed Learn stats.
      if (pos > 0) settings.stats[nextItem.id] = record(settings.stats[nextItem.id], !missHere, now - lastTs);
      marks[pos] = missHere ? 'err' : 'ok';
      lastTs = now;
      pos++;
      missHere = false;
      missedHere = new Set();
      wrong = undefined;
      if (pos < text.length) scheduleHint();
      else clearTimeout(hintTimer);
    } else {
      missHere = true;
      wrong = identify(e);
      if (wrong && !missedHere.has(wrong.id)) {
        missedHere.add(wrong.id);
        settings.confusions = addConfusion(settings.confusions, nextItem.id, wrong.id);
      }
      if (settings.hint !== 'never') showHint = true;
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="type">
  <div class="controls">
    <label>
      Words
      <select bind:value={settings.wordCount}>
        {#each [10, 20, 40, 80] as n (n)}<option value={n}>{n}</option>{/each}
      </select>
    </label>
    <label><input type="checkbox" bind:checked={settings.punctuation} /> Punctuation</label>
    <label><input type="checkbox" bind:checked={settings.numbers} /> Numbers</label>
    <button onclick={newText}>New text</button>
    <button onclick={() => (editing = !editing)}>{editing ? 'Cancel' : 'Custom text…'}</button>
  </div>

  {#if editing}
    <div class="custom">
      <textarea bind:value={custom} rows="4" placeholder="Paste any text. It is lowercased, and characters the layout can't type are dropped."></textarea>
      <button class="primary" onclick={useCustom} disabled={!sanitize(custom)}>Practice this text</button>
    </div>
  {/if}

  <div class="text" class:done aria-live="off">
    {#each tokens as word, wi (wi)}
      <span class="word">
        {#each word as { ch, i } (i)}
          <span
            class="c"
            class:sp={ch === ' '}
            class:ok={marks[i] === 'ok'}
            class:err={marks[i] === 'err'}
            class:cur={i === pos}
            class:miss={i === pos && missHere}>{ch === ' ' ? '·' : ch}</span
          >
        {/each}
      </span>
    {/each}
  </div>

  <div class="stats">
    <div><b>{wpm}</b><span>wpm</span></div>
    <div><b>{accuracy}%</b><span>accuracy</span></div>
    <div><b>{seconds}s</b><span>time</span></div>
  </div>

  {#if done}
    <div class="result">
      <p>Done! <b>{wpm} wpm</b> at <b>{accuracy}%</b> accuracy.</p>
      <p class="muted">Press <b>Enter</b> (A + E) or click below for the next round.</p>
      <button class="primary" onclick={restart}>{usingCustom ? 'Again' : 'Next text'}</button>
    </div>
  {:else if nextItem && nextChord}
    <div class="hint">
      <div class="next">
        Next: <b>{nextItem.name ?? nextItem.label}</b>
      </div>
      <Chord side={settings.side} chord={showHint ? nextChord : undefined} size="md" labels="keys" />
      <div class="instr">{showHint ? describeChord(nextChord) : settings.hint === 'never' ? 'Hints off' : '…'}</div>
      {#if wrong}
        <div class="wrong">You typed <b>{wrong.label}</b> ({describeChord(wrong.chords[settings.side])})</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .type {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 900px;
    margin: 0 auto;
  }
  .controls {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }
  .controls label {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--muted);
  }
  .custom {
    display: grid;
    gap: 8px;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--key-edge);
    border-radius: 10px;
    padding: 10px;
    font: inherit;
  }
  .custom button {
    justify-self: start;
  }
  .text {
    background: var(--panel);
    border-radius: 16px;
    padding: 24px;
    font-family: var(--mono);
    font-size: clamp(1.2rem, 3.2vw, 1.7rem);
    line-height: 1.8;
    display: flex;
    flex-wrap: wrap;
    color: var(--muted);
  }
  .text.done {
    opacity: 0.6;
  }
  .word {
    white-space: nowrap;
  }
  .c {
    border-radius: 4px;
    padding: 0 1px;
  }
  .sp {
    color: transparent;
  }
  .ok {
    color: var(--text);
  }
  .err {
    color: var(--bad);
  }
  .cur {
    background: color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--text);
    box-shadow: inset 0 -3px 0 var(--accent);
  }
  .cur.sp {
    color: var(--accent);
  }
  .cur.miss {
    background: color-mix(in srgb, var(--bad) 35%, transparent);
    box-shadow: inset 0 -3px 0 var(--bad);
  }
  .stats {
    display: flex;
    gap: 28px;
    justify-content: center;
  }
  .stats div {
    display: grid;
    text-align: center;
  }
  .stats b {
    font-size: 1.4rem;
  }
  .stats span,
  .muted {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .hint,
  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  .result p {
    margin: 0;
  }
  .instr {
    color: var(--accent);
    font-weight: 600;
    min-height: 1.4em;
  }
  .wrong {
    color: var(--bad);
  }
</style>
