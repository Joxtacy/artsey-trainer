import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works under GitHub Pages' /artsey-trainer/ subpath.
  base: './',
  plugins: [svelte()],
  // Component tests run in Node, so point Svelte at its browser build there.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
