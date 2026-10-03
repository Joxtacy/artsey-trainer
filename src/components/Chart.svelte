<script lang="ts">
  import { HOLD, ITEM_BY_ID, LAYERS, describeChord, type Layer } from '../layout';
  import { LiveTyping, SHIFT_SETTLE_MS, type LiveEntry } from '../live';
  import { settings } from '../settings.svelte';
  import Chord from './Chord.svelte';

  let live = new LiveTyping(settings.side);
  // LiveTyping mutates entries when Shift resolves, so copy them out for Svelte to see.
  let entries = $state<LiveEntry[]>([]);
  const last = $derived(entries[0]);

  // Keys whose browser default (focus moves, scrolling, back navigation, quick find) would get in the way.
  const SWALLOW = new Set([' ', 'Tab', 'Backspace', "'", '/']);

  function sync() {
    entries = live.entries.map((e) => ({ ...e }));
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    if (!live.keydown(e)) return;
    if (SWALLOW.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
    if (e.key === 'Shift') {
      const current = live;
      setTimeout(() => current.settle() && current === live && sync(), SHIFT_SETTLE_MS);
    }
    sync();
  }

  function onkeyup(e: KeyboardEvent) {
    live.keyup(e);
    sync();
  }

  // Chords depend on the side, so start fresh when it changes.
  $effect(() => {
    live = new LiveTyping(settings.side);
    sync();
  });

  const steps = (e: LiveEntry) =>
    [...e.mods.map((m) => `${m.label} (${describeChord(m.chord)})`), describeChord(e.chord!)].join(', then ');
  const show = (label: string) => (label === ' ' ? '␣' : label);

  const ids = (s: string) => s.split(' ');
  const SECTIONS = [
    { title: 'Letters', items: ids('a b c d e f g h i j k l m n o p q r s t u v w x y z') },
    { title: 'Space & editing', items: ids('space enter backspace delete tab esc') },
    { title: 'Punctuation', items: ids("' . , / !") },
    { title: 'Modifiers (* one-shot)', items: ids('ctrl gui alt shift shiftlock caps') },
    { title: 'System', items: ids('locknav lockmouse btselect clearbt') },
  ];

  const layerLabels = (layer: Layer) =>
    layer.cells[settings.side].map((c) => (c === HOLD ? 'HOLD' : c));
</script>

<svelte:window {onkeydown} {onkeyup} />

<div class="chart">
  <p class="intro">
    {settings.side === 'right' ? 'Right' : 'Left'}-hand layout. <span class="sw press"></span> press together,
    <span class="sw hold"></span> hold for the layer.
  </p>

  <section class="try">
    <h2>Try it</h2>
    <div class="live">
      <Chord side={settings.side} chord={last?.chord} size="lg" labels="keys" />
      <div class="out" aria-live="polite">
        {#if last}
          {#key last.n}
            <div class="pop">
              <div class="glyph" class:long={last.label.length > 2}>{show(last.label)}</div>
              <div class="oname">{last.name}</div>
              {#if last.chord}
                <div class="ochord">{steps(last)}</div>
              {/if}
              {#if last.mods.length || last.options}
                <div class="extra">
                  {#each last.mods as m (m.label)}
                    <span class="chip"><b>{m.label}</b><Chord side={settings.side} chord={m.chord} /></span>
                  {/each}
                  {#each last.options ?? [] as o (o.label)}
                    <span class="chip"><b>{o.label}</b><Chord side={settings.side} chord={o.chord} /></span>
                  {/each}
                </div>
              {/if}
              {#if last.note}<div class="note">{last.note}</div>{/if}
            </div>
          {/key}
        {:else}
          <div class="idle">
            <p>Type on your keyboard. The keys you pressed light up and the result shows here.</p>
            <p>
              One-shot modifiers (Ctrl, Gui, Alt, Shift) only reach the computer together with your next key, so
              press one followed by a letter, e.g. <b>Ctrl + h</b>, to check it.
            </p>
          </div>
        {/if}
      </div>
    </div>
    {#if entries.length > 1}
      <div class="history" aria-label="Recently typed">
        {#each entries.slice(1) as h (h.n)}
          <span class="chip" title={h.name}>
            <b>{show(h.label)}</b>
            {#if h.chord}<Chord side={settings.side} chord={h.chord} />{:else}<span class="q">?</span>{/if}
          </span>
        {/each}
      </div>
    {/if}
  </section>

  {#each SECTIONS as sec (sec.title)}
    <section>
      <h2>{sec.title}</h2>
      <div class="grid">
        {#each sec.items as id (id)}
          {@const it = ITEM_BY_ID.get(id)!}
          {@const c = it.chords[settings.side]}
          <div class="card" title={describeChord(c)}>
            <span class="lbl" class:long={it.label.length > 2}>{it.label}</span>
            <Chord side={settings.side} chord={c} />
            <span class="desc">{it.name ?? describeChord(c)}</span>
          </div>
        {/each}
      </div>
    </section>
  {/each}

  <section>
    <h2>Layers</h2>
    <div class="layers">
      {#each LAYERS as layer (layer.id)}
        <div class="layer">
          <h3>{layer.title}</h3>
          <div class="how">
            {#if layer.hold}
              Hold <b>{layer.hold.toUpperCase()}</b>
            {:else if layer.lockItem}
              {@const lc = ITEM_BY_ID.get(layer.lockItem)!.chords[settings.side]}
              Combo <Chord side={settings.side} chord={lc} /> <span>{describeChord(lc)}</span>
            {/if}
          </div>
          <Chord
            side={settings.side}
            chord={layer.hold ? { press: [], hold: layer.hold } : undefined}
            size="md"
            labels={layerLabels(layer)}
          />
          {#if layer.combos}
            <div class="combos">
              {#each layer.combos as [out] (out)}
                {@const c = ITEM_BY_ID.get(`${layer.id}:${out}`)!.chords[settings.side]}
                <span><b>{out}</b> <Chord side={settings.side} chord={c} /></span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .chart {
    display: flex;
    flex-direction: column;
    gap: 26px;
  }
  .try {
    background: var(--panel);
    border-radius: 16px;
    padding: 18px 20px 20px;
  }
  .live {
    display: flex;
    align-items: center;
    gap: 32px;
    flex-wrap: wrap;
  }
  .out {
    flex: 1;
    min-width: 200px;
    min-height: 150px;
    display: flex;
    align-items: center;
  }
  .pop {
    animation: pop 0.18s ease-out;
  }
  @keyframes pop {
    from {
      transform: scale(0.85);
      opacity: 0.3;
    }
  }
  .glyph {
    font-size: 5rem;
    font-weight: 800;
    line-height: 1;
  }
  .glyph.long {
    font-size: 2.6rem;
  }
  .oname {
    margin-top: 8px;
    font-weight: 600;
  }
  .ochord {
    color: var(--accent);
    font-weight: 600;
  }
  .extra {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .note {
    margin-top: 8px;
    color: var(--muted);
    font-size: 0.85rem;
    max-width: 420px;
  }
  .q {
    color: var(--muted);
  }
  .idle {
    color: var(--muted);
    max-width: 420px;
  }
  .idle p {
    margin: 0 0 8px;
  }
  .history {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--key);
    border-radius: 8px;
    padding: 4px 8px;
    font-size: 0.85rem;
  }
  .history .chip:first-child {
    outline: 1px solid var(--key-edge);
  }
  .intro {
    margin: 0;
    color: var(--muted);
  }
  .sw {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    vertical-align: -1px;
  }
  .sw.press {
    background: var(--accent);
  }
  .sw.hold {
    background: var(--hold);
  }
  h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin: 0 0 10px;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 8px;
  }
  .card {
    background: var(--panel);
    border-radius: 10px;
    padding: 10px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 4px 10px;
  }
  .lbl {
    font-size: 1.5rem;
    font-weight: 800;
    min-width: 1.2em;
  }
  .lbl.long {
    font-size: 0.95rem;
  }
  .desc {
    grid-column: 1 / -1;
    font-size: 0.72rem;
    color: var(--muted);
  }
  .layers {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 12px;
  }
  .layer {
    background: var(--panel);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  .how {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .combos {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 0.85rem;
  }
  .combos span {
    display: flex;
    gap: 6px;
    align-items: center;
  }
</style>
