<script lang="ts">
  import { untrack } from 'svelte';
  import { addConfusion, clearConfusion } from '../confusions';
  import { generateCode } from '../code';
  import { record } from '../drill';
  import { logTypeRound } from '../history';
  import { pairKey, pairLabel, slowestPairs, weakestLetters, wordWeigher } from '../focus';
  import { describeChord, type Item } from '../layout';
  import { identify, isIgnorable, matches, shouldHandle } from '../match';
  import { layout, settings } from '../settings.svelte';
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
  const L = $derived(layout());
  const nextItem = $derived(done ? undefined : L.byChar.get(text[pos]));
  const nextChord = $derived(nextItem?.chords[settings.side]);

  /** Where each code sample starts in `text`, so samples stay together on a line. Empty for words. */
  let sampleStarts = $state<number[]>([]);

  // Group each word with its trailing space so lines only wrap after spaces. In code mode, words are
  // also grouped by sample, so a line only breaks inside a sample that is longer than a whole line.
  const groups = $derived.by(() => {
    const starts = new Set(sampleStarts);
    const out: { ch: string; i: number }[][][] = [];
    for (let i = 0; i < text.length; i++) {
      const newWord = i === 0 || text[i - 1] === ' ';
      if (newWord && (out.length === 0 || starts.has(i) || !starts.size)) out.push([]);
      const group = out[out.length - 1];
      if (newWord) group.push([]);
      group[group.length - 1].push({ ch: text[i], i });
    }
    return out;
  });

  const weakest = $derived(weakestLetters(settings.stats));
  // Transition stats recorded with the other layout version can use ids this version doesn't have.
  const visiblePairs = $derived(
    Object.fromEntries(Object.entries(settings.pairStats).filter(([key]) => key.split('>').every((id) => L.byId.has(id)))),
  );
  const slowPairs = $derived(slowestPairs(visiblePairs, 3));

  const wpm = $derived(pos > 1 && lastTs > startTs ? Math.round(pos / 5 / ((lastTs - startTs) / 60000)) : 0);
  const accuracy = $derived(pos ? Math.round((marks.filter((m) => m === 'ok').length / pos) * 100) : 100);
  const seconds = $derived(startTs ? ((lastTs - startTs) / 1000).toFixed(1) : '0.0');

  function scheduleHint() {
    clearTimeout(hintTimer);
    showHint = settings.hint === 'always';
    if (settings.hint === 'delay') hintTimer = setTimeout(() => (showHint = true), settings.hintDelay);
  }

  function reset(newText: string, starts: number[] = []) {
    sampleStarts = starts;
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
    if (settings.code) {
      const samples = generateCode(settings.codeSamples);
      const starts = samples.map((_, k) => samples.slice(0, k).reduce((n, s) => n + s.length + 1, 0));
      reset(samples.join(' '), starts);
      return;
    }
    reset(
      generateText({
        count: settings.wordCount,
        punctuation: settings.punctuation,
        numbers: settings.numbers,
        weigh: settings.focusWeak ? wordWeigher(settings.stats, visiblePairs, L) : undefined,
      }),
    );
  }

  function restart() {
    if (usingCustom) reset(text, sampleStarts);
    else newText();
  }

  function useCustom() {
    const t = sanitize(custom, L);
    if (!t) return;
    usingCustom = true;
    editing = false;
    reset(t);
  }

  $effect(() => {
    void settings.wordCount;
    void settings.punctuation;
    void settings.numbers;
    void settings.focusWeak;
    void settings.code;
    void settings.codeSamples;
    void settings.version;
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
      if (pos > 0) {
        settings.stats[nextItem.id] = record(settings.stats[nextItem.id], !missHere, now - lastTs);
        // The same gap, filed under the transition from the previous character.
        const prev = L.byChar.get(text[pos - 1]);
        if (prev) {
          const key = pairKey(prev.id, nextItem.id);
          settings.pairStats[key] = record(settings.pairStats[key], !missHere, now - lastTs);
        }
      }
      if (!missHere) {
        const cleared = clearConfusion(settings.confusions, nextItem.id);
        if (cleared !== settings.confusions) settings.confusions = cleared;
      }
      marks[pos] = missHere ? 'err' : 'ok';
      lastTs = now;
      pos++;
      missHere = false;
      missedHere = new Set();
      wrong = undefined;
      if (pos < text.length) scheduleHint();
      else {
        clearTimeout(hintTimer);
        const ok = marks.filter((m) => m === 'ok').length;
        settings.history = logTypeRound(settings.history, text.length, ok, lastTs - startTs);
      }
    } else {
      missHere = true;
      wrong = identify(e, L);
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
    {#if settings.code}
      <label>
        Samples
        <select bind:value={settings.codeSamples}>
          {#each [2, 4, 8, 16] as n (n)}<option value={n}>{n}</option>{/each}
        </select>
      </label>
    {:else}
      <label>
        Words
        <select bind:value={settings.wordCount}>
          {#each [10, 20, 40, 80] as n (n)}<option value={n}>{n}</option>{/each}
        </select>
      </label>
    {/if}
    <label title="Short lines of code that mix letters with the brackets and symbols layers">
      <input type="checkbox" bind:checked={settings.code} /> Code
    </label>
    <label class:off={settings.code}>
      <input type="checkbox" bind:checked={settings.punctuation} disabled={settings.code} /> Punctuation
    </label>
    <label class:off={settings.code}>
      <input type="checkbox" bind:checked={settings.numbers} disabled={settings.code} /> Numbers
    </label>
    <label class:off={settings.code} title="Pick words with the keys and transitions you are weakest at">
      <input type="checkbox" bind:checked={settings.focusWeak} disabled={settings.code} /> Focus on weak keys
    </label>
    <button onclick={newText}>New text</button>
    <button onclick={() => (editing = !editing)}>{editing ? 'Cancel' : 'Custom text…'}</button>
  </div>

  {#if editing}
    <div class="custom">
      <textarea bind:value={custom} rows="4" placeholder="Paste any text. It is lowercased, and characters the layout can't type are dropped."></textarea>
      <button class="primary" onclick={useCustom} disabled={!sanitize(custom, L)}>Practice this text</button>
    </div>
  {/if}

  {#if settings.focusWeak && !settings.code && !editing}
    <p class="focus">
      Weakest keys: <b>{weakest.map((l) => l.toUpperCase()).join(' ')}</b>
      ·
      {#if slowPairs.length}
        Slowest transitions: <b>{slowPairs.map((p) => pairLabel(p.from, p.to, L)).join(', ')}</b>
      {:else}
        <span class="muted">Slow transitions show up after a few rounds.</span>
      {/if}
    </p>
  {/if}

  <div class="text" class:done aria-live="off">
    {#each groups as group, gi (gi)}
      <span class="group">
        {#each group as word, wi (wi)}
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
      {#if slowPairs.length}
        <p class="slow">
          Slowest transitions:
          {#each slowPairs as p (p.key)}
            <span class="chip"><b>{pairLabel(p.from, p.to, L)}</b> {p.ms}ms</span>
          {/each}
        </p>
      {/if}
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
  .controls label.off {
    opacity: 0.5;
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
  .group {
    display: flex;
    flex-wrap: wrap;
    max-width: 100%;
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
  .focus {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .focus b {
    color: var(--text);
  }
  .slow {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }
  .chip {
    background: var(--key);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 0.85rem;
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
