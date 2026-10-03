<script lang="ts">
  import { untrack } from 'svelte';
  import { mastery, pick, record } from '../drill';
  import { ITEM_BY_ID, LESSONS, describeChord, type Item } from '../layout';
  import { identify, isIgnorable, matches, shouldHandle } from '../match';
  import { settings } from '../settings.svelte';
  import Chord from './Chord.svelte';

  const lesson = $derived(LESSONS.find((l) => l.id === settings.lesson) ?? LESSONS[0]);

  let currentId = $state<string>();
  let misses = $state(0);
  let showHint = $state(false);
  let wrong = $state<Item>();
  let flash = $state<'ok' | 'bad'>();
  let session = $state({ done: 0, firstTry: 0, streak: 0, best: 0, totalMs: 0 });

  let start = 0;
  let locked = false;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;

  const current = $derived(currentId ? ITEM_BY_ID.get(currentId) : undefined);
  const chord = $derived(current?.chords[settings.side]);

  function scheduleHint() {
    clearTimeout(hintTimer);
    showHint = settings.hint === 'always';
    if (settings.hint === 'delay') hintTimer = setTimeout(() => (showHint = true), settings.hintDelay);
  }

  function next(id?: string) {
    currentId = id ?? pick(lesson.items, settings.stats, currentId);
    misses = 0;
    wrong = undefined;
    locked = false;
    start = performance.now();
    scheduleHint();
  }

  // New lesson or changed hint mode: start a fresh prompt.
  $effect(() => {
    void lesson.id;
    void settings.hint;
    untrack(() => next());
  });
  $effect(() => () => clearTimeout(hintTimer));

  function onkeydown(e: KeyboardEvent) {
    if (!shouldHandle(e) || isIgnorable(e) || !current?.match) return;
    e.preventDefault();
    if (locked) return;

    if (matches(e, current.match)) {
      const ms = performance.now() - start;
      settings.stats[current.id] = record(settings.stats[current.id], misses === 0, ms);
      session.done++;
      session.totalMs += ms;
      if (misses === 0) {
        session.firstTry++;
        session.streak++;
        session.best = Math.max(session.best, session.streak);
      }
      flash = 'ok';
      locked = true;
      clearTimeout(hintTimer);
      setTimeout(() => {
        flash = undefined;
        next();
      }, 140);
    } else {
      misses++;
      session.streak = 0;
      wrong = identify(e);
      if (settings.hint !== 'never') showHint = true;
      flash = 'bad';
      setTimeout(() => (flash = undefined), 300);
    }
  }

  function lessonProgress(items: string[]) {
    const total = items.reduce((sum, id) => sum + mastery(settings.stats[id]), 0);
    return Math.round((total / (items.length * 4)) * 100);
  }

  function resetProgress() {
    if (!confirmingReset) {
      confirmingReset = true;
      return;
    }
    settings.stats = {};
    confirmingReset = false;
    next();
  }
  let confirmingReset = $state(false);

  const accuracy = $derived(session.done ? Math.round((session.firstTry / session.done) * 100) : 0);
  const avgMs = $derived(session.done ? Math.round(session.totalMs / session.done) : 0);
</script>

<svelte:window {onkeydown} />

<div class="learn">
  <aside class="lessons">
    <h2>Lessons</h2>
    {#each LESSONS as l (l.id)}
      {@const p = lessonProgress(l.items)}
      <button class="lesson" class:active={l.id === lesson.id} onclick={() => (settings.lesson = l.id)}>
        <span class="lt">{l.title}</span>
        <span class="ld">{l.desc}</span>
        <span class="bar"><span style="width: {p}%"></span></span>
      </button>
    {/each}
    <button class="reset" onclick={resetProgress} onblur={() => (confirmingReset = false)}>
      {confirmingReset ? 'Click again to erase all progress' : 'Reset progress'}
    </button>
  </aside>

  <section class="stage">
    {#if current && chord}
      <div class="target" class:ok={flash === 'ok'} class:bad={flash === 'bad'}>
        <div class="glyph" class:word={current.label.length > 2}>{current.label}</div>
        {#if current.name}<div class="name">{current.name}</div>{/if}
      </div>

      <div class="board">
        <Chord side={settings.side} chord={showHint ? chord : undefined} size="lg" labels="keys" />
      </div>
      <div class="instr">
        {#if showHint}
          {describeChord(chord)}
        {:else if settings.hint === 'never'}
          Hints off
        {:else}
          Think… hint in {(settings.hintDelay / 1000).toFixed(1)}s
        {/if}
      </div>

      <div class="feedback">
        {#if wrong}
          <span>You typed <b>{wrong.label}</b></span>
          <Chord side={settings.side} chord={wrong.chords[settings.side]} />
          <span class="muted">{describeChord(wrong.chords[settings.side])}</span>
        {:else if misses > 0}
          <span>Not that one. Try again</span>
        {/if}
      </div>

      <div class="session">
        <div><b>{session.streak}</b><span>streak</span></div>
        <div><b>{session.best}</b><span>best</span></div>
        <div><b>{accuracy}%</b><span>first-try</span></div>
        <div><b>{avgMs ? `${avgMs}ms` : '–'}</b><span>avg time</span></div>
      </div>

      <div class="tiles" aria-label="Mastery for this lesson">
        {#each lesson.items as id (id)}
          {@const it = ITEM_BY_ID.get(id)!}
          {@const s = settings.stats[id]}
          <button
            class="tile m{mastery(s)}"
            class:cur={id === currentId}
            title="{it.name ?? it.label}: {s ? `${s.ok}/${s.n} first-try, ~${s.ms}ms` : 'not practised yet'}"
            onclick={() => next(id)}
          >
            {it.label}
          </button>
        {/each}
      </div>
      <div class="legend muted">
        <span><i class="m0"></i>new</span><span><i class="m1"></i>struggling</span><span><i class="m2"></i>learning</span><span
          ><i class="m3"></i>good</span
        ><span><i class="m4"></i>mastered</span>
      </div>
    {/if}
  </section>
</div>

<style>
  .learn {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .learn {
      grid-template-columns: 1fr;
    }
    .lessons {
      order: 2;
    }
  }
  h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin: 0 0 8px;
  }
  .lessons {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lesson {
    display: grid;
    gap: 3px;
    text-align: left;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--panel);
    border: 1px solid transparent;
  }
  .lesson.active {
    border-color: var(--accent);
  }
  .lt {
    font-weight: 600;
  }
  .ld {
    font-size: 0.78rem;
    color: var(--muted);
  }
  .bar {
    height: 4px;
    background: var(--key);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 4px;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--ok);
    transition: width 0.3s;
  }
  .reset {
    margin-top: 10px;
    font-size: 0.8rem;
    color: var(--muted);
    background: none;
    border: 1px dashed var(--key-edge);
    padding: 8px;
    border-radius: 8px;
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    background: var(--panel);
    border-radius: 16px;
    padding: 28px 16px;
  }
  .target {
    text-align: center;
    border-radius: 16px;
    padding: 4px 28px;
    transition: background 0.15s;
  }
  .target.ok {
    background: color-mix(in srgb, var(--ok) 25%, transparent);
  }
  .target.bad {
    background: color-mix(in srgb, var(--bad) 25%, transparent);
    animation: shake 0.25s;
  }
  @keyframes shake {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .glyph {
    font-size: clamp(4rem, 14vw, 7rem);
    font-weight: 800;
    line-height: 1.1;
  }
  .glyph.word {
    font-size: clamp(2.5rem, 9vw, 4rem);
    padding: 0.4em 0;
  }
  .name {
    color: var(--muted);
  }
  .instr {
    font-size: 1.1rem;
    font-weight: 600;
    min-height: 1.5em;
    color: var(--accent);
  }
  .feedback {
    min-height: 28px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--bad);
    flex-wrap: wrap;
    justify-content: center;
  }
  .muted {
    color: var(--muted);
  }
  .session {
    display: flex;
    gap: 28px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .session div {
    display: grid;
    text-align: center;
  }
  .session b {
    font-size: 1.4rem;
  }
  .session span {
    font-size: 0.75rem;
    color: var(--muted);
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    max-width: 640px;
  }
  .tile {
    min-width: 40px;
    height: 40px;
    padding: 0 8px;
    border-radius: 8px;
    font-weight: 700;
    border: 2px solid transparent;
  }
  .tile.cur {
    border-color: var(--text);
  }
  .m0 {
    background: var(--key);
  }
  .m1 {
    background: var(--bad);
    color: var(--on-accent);
  }
  .m2 {
    background: var(--hold);
    color: var(--on-accent);
  }
  .m3 {
    background: var(--accent);
    color: var(--on-accent);
  }
  .m4 {
    background: var(--ok);
    color: var(--on-accent);
  }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 5px;
    vertical-align: -1px;
  }
</style>
