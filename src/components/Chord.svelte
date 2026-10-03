<script lang="ts">
  import { GRID, describeChord, type Chord, type Side } from '../layout';

  let {
    side,
    chord,
    size = 'sm',
    labels,
  }: {
    side: Side;
    chord?: Chord;
    size?: 'sm' | 'md' | 'lg';
    /** 'keys' shows key letters; an array gives one label per physical position. */
    labels?: 'keys' | (string | null)[];
  } = $props();
</script>

<div class="chord {size}" role="img" aria-label={chord ? describeChord(chord) : 'Keyboard'}>
  {#each GRID[side] as k, i (i)}
    <div class="ck" class:press={chord?.press.includes(k)} class:hold={chord?.hold === k}>
      {labels === 'keys' ? k.toUpperCase() : (labels?.[i] ?? '')}
    </div>
  {/each}
</div>

<style>
  .chord {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--gap);
    width: max-content;
    --gap: 2px;
    --cell: 9px;
  }
  .md {
    --gap: 4px;
    --cell: 46px;
  }
  .lg {
    --gap: 8px;
    --cell: clamp(52px, 14vw, 84px);
  }
  .ck {
    width: var(--cell);
    height: var(--cell);
    border-radius: calc(var(--cell) / 6);
    background: var(--key);
    border: 1px solid var(--key-edge);
    display: grid;
    place-items: center;
    font-weight: 700;
    color: var(--muted);
    text-align: center;
    line-height: 1.05;
    transition:
      background 0.12s,
      color 0.12s,
      transform 0.12s;
  }
  .sm .ck {
    border-radius: 2px;
  }
  .md .ck {
    font-size: 0.68rem;
    padding: 2px;
  }
  .lg .ck {
    font-size: calc(var(--cell) * 0.36);
  }
  .press {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .lg .press {
    transform: translateY(2px);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .hold {
    background: var(--hold);
    border-color: var(--hold);
    color: var(--on-accent);
  }
</style>
