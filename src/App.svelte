<script lang="ts">
  import Chart from './components/Chart.svelte';
  import Learn from './components/Learn.svelte';
  import Progress from './components/Progress.svelte';
  import Type from './components/Type.svelte';
  import { VERSIONS } from './layout';
  import { settings } from './settings.svelte';

  const VIEWS = [
    { id: 'learn', label: 'Learn' },
    { id: 'type', label: 'Type' },
    { id: 'chart', label: 'Chart' },
    { id: 'progress', label: 'Progress' },
  ] as const;

  let focused = $state(document.hasFocus());
</script>

<svelte:window onfocus={() => (focused = true)} onblur={() => (focused = false)} />

<header>
  <div class="brand">
    <span class="logo" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
    ARTSEY Trainer
  </div>
  <nav>
    {#each VIEWS as v (v.id)}
      <button class:active={settings.view === v.id} onclick={() => (settings.view = v.id)}>{v.label}</button>
    {/each}
  </nav>
  <div class="opts">
    <div class="seg" role="group" aria-label="Layout version">
      {#each VERSIONS as v (v.id)}
        <button class:active={settings.version === v.id} onclick={() => (settings.version = v.id)}>{v.label}</button>
      {/each}
    </div>
    <div class="seg" role="group" aria-label="Keyboard side">
      <button class:active={settings.side === 'left'} onclick={() => (settings.side = 'left')}>Left</button>
      <button class:active={settings.side === 'right'} onclick={() => (settings.side = 'right')}>Right</button>
    </div>
    {#if settings.view === 'learn' || settings.view === 'type'}
      <label>
        Hints
        <select bind:value={settings.hint}>
          <option value="always">Always</option>
          <option value="delay">After delay</option>
          <option value="never">Never</option>
        </select>
      </label>
      {#if settings.hint === 'delay'}
        <select bind:value={settings.hintDelay} aria-label="Hint delay">
          {#each [800, 1500, 2500, 4000] as ms (ms)}<option value={ms}>{ms / 1000}s</option>{/each}
        </select>
      {/if}
    {/if}
  </div>
</header>

{#if !focused && settings.view !== 'progress'}
  <button class="blur" onclick={() => window.focus()}>Window not focused. Click here, then type on your keyboard.</button>
{/if}

<main>
  {#if settings.view === 'learn'}
    <Learn />
  {:else if settings.view === 'type'}
    <Type />
  {:else if settings.view === 'progress'}
    <Progress />
  {:else}
    <Chart />
  {/if}
</main>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    padding: 14px 20px;
    border-bottom: 1px solid var(--key-edge);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 1.1rem;
  }
  .logo {
    display: grid;
    grid-template-columns: repeat(4, 7px);
    gap: 2px;
  }
  .logo i {
    height: 7px;
    border-radius: 1.5px;
    background: var(--key-edge);
  }
  .logo i:nth-child(1),
  .logo i:nth-child(4),
  .logo i:nth-child(6) {
    background: var(--accent);
  }
  nav,
  .seg {
    display: flex;
    background: var(--panel);
    border-radius: 10px;
    padding: 3px;
  }
  nav button,
  .seg button {
    background: none;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    color: var(--muted);
  }
  nav button.active,
  .seg button.active {
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .opts {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .opts label {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--muted);
  }
  .blur {
    display: block;
    width: 100%;
    border: none;
    border-radius: 0;
    background: var(--hold);
    color: var(--on-accent);
    padding: 8px;
    font-weight: 600;
  }
  main {
    padding: 24px 20px 48px;
    max-width: 1200px;
    margin: 0 auto;
  }
  @media (max-width: 600px) {
    main {
      padding: 16px;
    }
    .opts {
      margin-left: 0;
    }
  }
</style>
