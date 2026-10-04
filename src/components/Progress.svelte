<script lang="ts">
  import { overdue } from '../drill';
  import { daily, lessonTrends, type LessonTrend } from '../history';
  import { layout, settings } from '../settings.svelte';
  import LineChart from './LineChart.svelte';

  const L = $derived(layout());
  const RANGES = [14, 30, 90];
  let range = $state(30);

  const points = $derived(daily(settings.history, range));
  const days = $derived(points.map((p) => p.day));
  const practised = $derived(points.filter((p) => p.attempts > 0));
  const today = $derived(points[points.length - 1]);
  const latestWpm = $derived(points.findLast((p) => p.wpm !== undefined)?.wpm);

  const maxWpm = $derived(Math.max(0, ...points.map((p) => p.wpm ?? 0)));
  const wpmScale = $derived(Math.max(20, Math.ceil(maxWpm / 20) * 20));

  const due = $derived(
    Object.entries(settings.stats)
      .filter(([, s]) => overdue(s) > 0)
      .sort(([, a], [, b]) => overdue(b) - overdue(a))
      .map(([id]) => L.byId.get(id)?.label)
      .filter((label): label is string => !!label),
  );

  const trends = $derived(lessonTrends(settings.history));
  const lessonTitle = (id: string) => (id === 'confusions' ? 'My confusions' : (L.lessons.find((l) => l.id === id)?.title ?? id));
  const pct = (t?: { n: number; ok: number }) => (t && t.n ? `${Math.round((t.ok / t.n) * 100)}%` : '–');
  const attempts = (t?: { n: number }) => (t ? t.n : 0);
  const fmtDay = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number);
    return new Date(y, m - 1, dd).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const change = (t: LessonTrend) =>
    t.change === undefined ? undefined : t.change > 0 ? 'up' : t.change < 0 ? 'down' : 'same';
</script>

<div class="progress">
  <div class="filters" role="group" aria-label="Date range">
    {#each RANGES as r (r)}
      <button class:active={range === r} onclick={() => (range = r)}>Last {r} days</button>
    {/each}
  </div>

  {#if !Object.keys(settings.history).length}
    <p class="empty">Practise in <b>Learn</b> or <b>Type</b> and your progress shows up here, day by day.</p>
  {/if}

  <div class="tiles">
    <div class="tile">
      <span class="label">Days practised</span>
      <span class="value">{practised.length}</span>
      <span class="sub">in the last {range} days</span>
    </div>
    <div class="tile">
      <span class="label">Practised today</span>
      <span class="value">{today?.attempts ?? 0}</span>
      <span class="sub">keys and characters</span>
    </div>
    <div class="tile">
      <span class="label">Latest speed</span>
      <span class="value">{latestWpm ?? '–'}</span>
      <span class="sub">words per minute in Type</span>
    </div>
    <div class="tile">
      <span class="label">Due for review</span>
      <span class="value">{due.length}</span>
      <span class="sub">{due.length ? due.slice(0, 8).join(' ') : 'keys you have learned stay fresh'}</span>
    </div>
  </div>

  <div class="charts">
    <LineChart
      title="Typing speed (WPM)"
      {days}
      yMax={wpmScale}
      unit=" wpm"
      series={[{ name: 'Type', color: 'var(--series-type)', values: points.map((p) => p.wpm) }]}
    />
    <LineChart
      title="First-try accuracy"
      {days}
      yMax={100}
      unit="%"
      series={[
        { name: 'Learn', color: 'var(--series-learn)', values: points.map((p) => p.learnAccuracy) },
        { name: 'Type', color: 'var(--series-type)', values: points.map((p) => p.typeAccuracy) },
      ]}
    />
  </div>

  <details>
    <summary>Show the charts as a table</summary>
    {#if practised.length}
      <table>
        <thead><tr><th>Day</th><th>WPM</th><th>Learn accuracy</th><th>Type accuracy</th><th>Practised</th></tr></thead>
        <tbody>
          {#each [...practised].reverse() as p (p.day)}
            <tr>
              <td>{fmtDay(p.day)}</td>
              <td>{p.wpm ?? '–'}</td>
              <td>{p.learnAccuracy === undefined ? '–' : `${p.learnAccuracy}%`}</td>
              <td>{p.typeAccuracy === undefined ? '–' : `${p.typeAccuracy}%`}</td>
              <td>{p.attempts}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="muted">No practice in this range yet.</p>
    {/if}
  </details>

  <section>
    <h2>Lessons: this week vs last week</h2>
    {#if trends.length}
      <table class="trends">
        <thead>
          <tr><th>Lesson</th><th>This week</th><th>Last week</th><th>Change in first-try accuracy</th></tr>
        </thead>
        <tbody>
          {#each trends as t (t.lesson)}
            {@const c = change(t)}
            <tr>
              <td>{lessonTitle(t.lesson)}</td>
              <td>{pct(t.thisWeek)} <span class="muted">({attempts(t.thisWeek)})</span></td>
              <td>{pct(t.lastWeek)} <span class="muted">({attempts(t.lastWeek)})</span></td>
              <td>
                {#if c === 'up'}<span class="up" aria-hidden="true">▲</span> {t.change} points better
                {:else if c === 'down'}<span class="down" aria-hidden="true">▼</span> {-t.change!} points worse
                {:else if c === 'same'}No change
                {:else}<span class="muted">Needs both weeks</span>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="muted note">Percent of keys typed right on the first try. Attempts in brackets.</p>
    {:else}
      <p class="muted">Practise a Learn lesson to see its trend here.</p>
    {/if}
  </section>
</div>

<style>
  .progress {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 1000px;
    margin: 0 auto;
  }
  .filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .filters button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .empty {
    margin: 0;
    color: var(--muted);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
    gap: 10px;
  }
  .tile {
    display: grid;
    gap: 2px;
    background: var(--panel);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .label {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .value {
    font-size: 1.8rem;
    font-weight: 700;
  }
  .sub {
    color: var(--muted);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    gap: 12px;
  }
  details {
    background: var(--panel);
    border-radius: 12px;
    padding: 10px 14px;
  }
  summary {
    cursor: pointer;
    color: var(--muted);
  }
  h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin: 0 0 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--key);
  }
  th {
    color: var(--muted);
    font-weight: 500;
  }
  .trends {
    background: var(--panel);
    border-radius: 12px;
    overflow: hidden;
  }
  .up {
    color: var(--ok);
  }
  .down {
    color: var(--bad);
  }
  .muted {
    color: var(--muted);
  }
  .note {
    font-size: 0.8rem;
    margin: 6px 0 0;
  }
</style>
