import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative asset paths so the build works under GitHub Pages' /artsey-trainer/ subpath.
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      // A new deploy activates as soon as it is found (on opening the app), so nobody stays on an old build.
      registerType: 'autoUpdate',
      // The build's JS, CSS, and HTML are precached by default; the manifest and its icons are added too.
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'ARTSEY Trainer',
        short_name: 'ARTSEY',
        description: 'Learn and practise the ARTSEY one-handed keyboard layout.',
        // Relative, like `base`, so the app installs from any path.
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#0f1217',
        background_color: '#0f1217',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // Component tests run in Node, so point Svelte at its browser build there.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
