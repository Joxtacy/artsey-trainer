# ARTSEY Trainer

Practice the [ARTSEY](https://artsey.io) 0.8.1 one-handed layout on a real keyboard (left or right variant).

**Live site: https://joxtacy.github.io/artsey-trainer/** (redeployed automatically on every push to `main`)

```sh
bun install
bun run dev      # http://localhost:5173
bun run test     # layout data + logic tests
bun run build    # type-check + production build to dist/
```

- **Learn**: adaptive drills per lesson; weak and new keys come up more often. The chord hint shows after a delay or on a miss.
- **Type**: real words (optionally punctuation/numbers, or your own text) with a hint for the next chord.
- **Chart**: the full reference card for the selected side. Type on the board and the keys you pressed light up, with the resulting character next to them.

The whole layout lives in `src/layout.ts`. Base combos are defined by key letter (they mirror between sides); layers are listed per side because some (brackets, nav, mouse) are not mirrored.

Keystrokes are matched by character, falling back to the US physical key code, so it works even if your OS keyboard layout isn't US English.
Progress is stored in the browser's localStorage.
