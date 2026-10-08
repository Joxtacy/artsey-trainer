# ARTSEY Trainer

This web app helps you learn the [ARTSEY](https://artsey.io) one-handed keyboard layout. Use it with a real ARTSEY keyboard (left or right variant). You can select the layout version: 0.8.1 (current) or 0.9.0 (beta).

**Live site: https://joxtacy.github.io/artsey-trainer/**

Each push to `main` deploys the site again automatically.

## Commands

```sh
bun install
bun run dev      # start the dev server on http://localhost:5173
bun run test     # run the tests for the layout data and the logic
bun run build    # do a type check and make a production build in dist/
```

## Views

- **Learn**: Practice the keys in lessons, one key at a time. The app shows weak keys and new keys more often. The chord hint shows after a delay, or when you type the wrong key.
- **Type**: Type real words. You can add punctuation and numbers, or use your own text. A hint shows the chord for the next character. In code mode, you type short lines of code. These lines use the brackets and symbols layers. Select what occurs on a wrong key: stop until you type the correct key, or continue. In the continue mode, use Backspace (R + E) to correct an error.
- **Progress**: See your typing speed and accuracy for each day, and the trend for each lesson. The app also shows the keys that are due for review.
- **Chart**: See the full layout for the selected side. When you type, the keys of the chord light up. The character that you typed shows next to them.

## How it works

All layout data is in `src/layout.ts`, with one definition for each version. The base combos on the left side are a mirror image of the right side. For this reason, the file defines them by key letter. Some layers are not a mirror image. For this reason, the file lists the layers for each side.

The two versions share progress for keys that have the same chord in both versions. A key with a different chord in 0.9.0 has its own progress.

The app compares the character of each keystroke with the target character. If they are different, the app compares the US physical key code. For this reason, the app also works when your operating system uses a keyboard layout that is not US English.

The app keeps your progress in the localStorage of the browser. Each site address has its own progress. To move your progress to a different browser or site address, use **Export** and **Import** in the Learn view.

## Roadmap

The planned features are in [ROADMAP.md](ROADMAP.md).
