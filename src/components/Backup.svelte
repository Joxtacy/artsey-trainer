<script lang="ts">
  import { backupFilename, makeBackup, readBackup, summarize, type BackupResult } from '../backup';
  import { settings } from '../settings.svelte';

  let input: HTMLInputElement;
  let pending = $state<Extract<BackupResult, { ok: true }>>();
  let error = $state<string>();
  let message = $state<string>();

  const current = $derived(summarize(settings));

  function exportProgress() {
    const blob = new Blob([makeBackup($state.snapshot(settings))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    error = undefined;
    message = 'Progress exported.';
  }

  async function onchange() {
    const file = input.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    input.value = '';
    if (!file) return;
    const result = readBackup(await file.text());
    message = undefined;
    if (result.ok) {
      pending = result;
      error = undefined;
    } else {
      pending = undefined;
      error = result.error;
    }
  }

  function confirmImport() {
    if (!pending) return;
    // Keep the tab you're on; everything else comes from the backup.
    const { view: _, ...rest } = pending.settings;
    Object.assign(settings, rest);
    pending = undefined;
    message = 'Progress imported.';
  }

  const when = (iso?: string) => (iso ? ` from ${new Date(iso).toLocaleString()}` : '');
</script>

<div class="backup">
  <div class="row">
    <button onclick={exportProgress}>Export</button>
    <button onclick={() => input.click()}>Import</button>
    <input bind:this={input} type="file" accept="application/json,.json" hidden {onchange} />
  </div>

  {#if pending}
    {@const b = pending.summary}
    <div class="confirm" role="alertdialog" aria-label="Confirm import">
      <p><b>Replace your progress with this backup?</b></p>
      <p class="muted">Now: {current.keys} keys practised, {current.confusions} confusions.</p>
      <p class="muted">Backup{when(b.exportedAt)}: {b.keys} keys practised, {b.attempts} attempts, {b.confusions} confusions.</p>
      <div class="row">
        <button class="primary" onclick={confirmImport}>Replace</button>
        <button onclick={() => (pending = undefined)}>Cancel</button>
      </div>
    </div>
  {/if}
  {#if error}<p class="error" role="alert">{error} Your progress was not changed.</p>{/if}
  {#if message}<p class="done">{message}</p>{/if}
</div>

<style>
  .backup {
    display: grid;
    gap: 6px;
    margin-top: 6px;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .row button {
    flex: 1;
    font-size: 0.8rem;
    padding: 6px 8px;
  }
  .confirm {
    background: var(--panel);
    border: 1px solid var(--hold);
    border-radius: 10px;
    padding: 10px;
    font-size: 0.82rem;
  }
  p {
    margin: 0 0 6px;
    font-size: 0.82rem;
  }
  .muted {
    color: var(--muted);
  }
  .error {
    color: var(--bad);
  }
  .done {
    color: var(--ok);
  }
</style>
