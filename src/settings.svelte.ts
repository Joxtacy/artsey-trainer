import { load, save } from './storage';

export const settings = $state(load());

// Persist every change; save() serialises the whole object, so this effect tracks it deeply.
$effect.root(() => {
  $effect(() => save(settings));
});
