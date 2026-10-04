<script lang="ts" module>
  export interface Series {
    name: string;
    /** A CSS colour, e.g. var(--series-learn). */
    color: string;
    values: (number | undefined)[];
  }
</script>

<script lang="ts">
  let {
    title,
    days,
    series,
    yMax,
    unit,
  }: { title: string; days: string[]; series: Series[]; yMax: number; unit: string } = $props();

  let width = $state(0);
  let active = $state<number>();
  let svg = $state<SVGSVGElement>();

  const H = 200;
  const M = { top: 12, right: 64, bottom: 26, left: 40 };
  const w = $derived(Math.max(width || 600, 280));
  const pw = $derived(w - M.left - M.right);
  const ph = H - M.top - M.bottom;

  const x = (i: number) => M.left + (days.length > 1 ? (i * pw) / (days.length - 1) : pw / 2);
  const y = (v: number) => M.top + ph - (Math.min(v, yMax) / yMax) * ph;
  const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax)));

  const parseDay = (d: string) => {
    const [yy, mm, dd] = d.split('-').map(Number);
    return new Date(yy, mm - 1, dd);
  };
  const fmtDay = (d: string, long = false) =>
    parseDay(d).toLocaleDateString(undefined, long ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
  const fmt = (v?: number) => (v === undefined ? '–' : `${v}${unit}`);

  /**
   * Indexes of days with data. The line joins them across days off: breaking it at every gap turns
   * sparse practice into dashes. Days off still read as "–" in the tooltip and the table.
   */
  const defined = (values: (number | undefined)[]) => values.flatMap((v, i) => (v === undefined ? [] : [i]));

  const lastIndex = (values: (number | undefined)[]) => values.findLastIndex((v) => v !== undefined);

  // End labels only when they cannot collide; otherwise the legend and tooltip carry the values.
  const endLabels = $derived.by(() => {
    const ends = series
      .map((s) => ({ s, i: lastIndex(s.values) }))
      .filter((e) => e.i >= 0)
      .map((e) => ({ ...e, v: e.s.values[e.i]! }));
    const ys = ends.map((e) => y(e.v)).sort((a, b) => a - b);
    const collide = ys.some((v, k) => k > 0 && v - ys[k - 1] < 14);
    return collide ? [] : ends;
  });

  const hasData = $derived(series.some((s) => s.values.some((v) => v !== undefined)));

  function indexAt(clientX: number) {
    if (!svg) return undefined;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * w;
    const i = Math.round(((px - M.left) / pw) * (days.length - 1));
    return Math.max(0, Math.min(days.length - 1, i));
  }

  function onkeydown(e: KeyboardEvent) {
    const last = days.length - 1;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in step) active = Math.max(0, Math.min(last, (active ?? last) + step[e.key]));
    else if (e.key === 'Home') active = 0;
    else if (e.key === 'End') active = last;
    else if (e.key === 'Escape') active = undefined;
    else return;
    e.preventDefault();
  }

  const tipLeft = $derived(active === undefined ? 0 : Math.min(Math.max(x(active), 80), w - 80));
</script>

<figure class="chart">
  <figcaption>
    <span class="title">{title}</span>
    {#if series.length > 1}
      <span class="legend">
        {#each series as s (s.name)}
          <span class="key"><svg width="16" height="8" aria-hidden="true"><line x1="0" x2="16" y1="4" y2="4" stroke={s.color} stroke-width="2" stroke-linecap="round" /></svg>{s.name}</span>
        {/each}
      </span>
    {/if}
  </figcaption>

  <div class="plot" bind:clientWidth={width}>
    <!-- Focusable on purpose: arrow keys step through the days, like the hover crosshair. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <svg
      bind:this={svg}
      viewBox="0 0 {w} {H}"
      width="100%"
      height={H}
      role="group"
      aria-label="{title}. Use the left and right arrow keys to read each day."
      tabindex="0"
      onpointermove={(e) => (active = indexAt(e.clientX))}
      onpointerleave={() => (active = undefined)}
      onfocus={() => (active ??= Math.max(...series.map((s) => lastIndex(s.values)), days.length - 1))}
      onblur={() => (active = undefined)}
      {onkeydown}
    >
      {#each ticks as t (t)}
        <line class="grid" x1={M.left} x2={M.left + pw} y1={y(t)} y2={y(t)} />
        <text class="tick" x={M.left - 6} y={y(t) + 4} text-anchor="end">{t}{unit === '%' ? '%' : ''}</text>
      {/each}
      {#each [0, Math.floor((days.length - 1) / 2), days.length - 1] as i (i)}
        <text class="tick" x={x(i)} y={H - 6} text-anchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}>{fmtDay(days[i])}</text>
      {/each}

      {#if active !== undefined}
        <line class="crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + ph} />
      {/if}

      {#each series as s (s.name)}
        {@const pts = defined(s.values)}
        {#if pts.length > 1}
          <polyline
            points={pts.map((i) => `${x(i)},${y(s.values[i]!)}`).join(' ')}
            fill="none"
            stroke={s.color}
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        {/if}
        {@const li = lastIndex(s.values)}
        {#if li >= 0}
          <circle class="dot" cx={x(li)} cy={y(s.values[li]!)} r="4" fill={s.color} />
        {/if}
        {#if active !== undefined && s.values[active] !== undefined}
          <circle class="dot" cx={x(active)} cy={y(s.values[active]!)} r="5" fill={s.color} />
        {/if}
      {/each}

      {#each endLabels as e (e.s.name)}
        <text class="end" x={x(e.i) + 8} y={y(e.v) + 4}>{fmt(e.v)}</text>
      {/each}

      {#if !hasData}
        <text class="tick" x={M.left + pw / 2} y={M.top + ph / 2} text-anchor="middle">No data in this range yet</text>
      {/if}
    </svg>

    {#if active !== undefined}
      <div class="tip" style="left: {tipLeft}px" role="status">
        <div class="tday">{fmtDay(days[active], true)}</div>
        {#each series as s (s.name)}
          <div class="trow">
            <svg width="12" height="8" aria-hidden="true"><line x1="0" x2="12" y1="4" y2="4" stroke={s.color} stroke-width="2" stroke-linecap="round" /></svg>
            <b>{fmt(s.values[active])}</b>
            <span class="muted">{s.name}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</figure>

<style>
  .chart {
    margin: 0;
    background: var(--panel);
    border-radius: 12px;
    padding: 14px 14px 6px;
  }
  figcaption {
    display: flex;
    gap: 16px;
    align-items: baseline;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .title {
    font-weight: 600;
  }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .key {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .plot {
    position: relative;
  }
  svg {
    display: block;
    overflow: visible;
    touch-action: pan-y;
  }
  svg:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
    border-radius: 4px;
  }
  .grid {
    stroke: var(--key);
    stroke-width: 1;
  }
  .crosshair {
    stroke: var(--muted);
    stroke-width: 1;
  }
  .tick {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .end {
    fill: var(--text);
    font-size: 12px;
    font-weight: 600;
  }
  .dot {
    stroke: var(--panel);
    stroke-width: 2;
  }
  .tip {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    pointer-events: none;
    background: var(--bg);
    border: 1px solid var(--key-edge);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 0.82rem;
    white-space: nowrap;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.25);
  }
  .tday {
    color: var(--muted);
    margin-bottom: 2px;
  }
  .trow {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .muted {
    color: var(--muted);
  }
</style>
