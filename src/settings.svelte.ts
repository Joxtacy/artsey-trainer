import { LAYOUTS, type Layout } from './layout';
import { load, save } from './storage';

export const settings = $state(load());

// Persist every change; save() serialises the whole object, so this effect tracks it deeply.
$effect.root(() => {
  $effect(() => save(settings));
});

/** The layout for the selected version. Reactive when read inside components and effects. */
export function layout(): Layout {
  return LAYOUTS[settings.version];
}
