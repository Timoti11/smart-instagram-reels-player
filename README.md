# IG Reels Helper

Chrome Extension (Manifest V3) that improves playback controls for Instagram Reels and video messages in Direct.

## Features

- Volume slider, mute toggle, and hotkeys (Shift+ArrowUp/Down, Shift+M)
- Seek buttons, hotkeys (ArrowLeft/Right, Shift+ArrowLeft/Right), and wheel seek
- Optional lag-reduction tweaks (preload, playsInline, single active video)
- Direct video message navigation (Alt+ArrowLeft/Right)
- Settings saved in `chrome.storage.sync`

## Build

```bash
npm install
npm run build
```

Build output is in `dist/` and includes the copied `manifest.json` and `assets/` icons.

> Note: The repository does not include PNG icons. Add your own `assets/icon16.png`, `assets/icon48.png`, and `assets/icon128.png` if you want custom extension icons.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder (do **not** select the repo root).

If Chrome shows `Could not load javascript 'content/index.js'` or similar, run `npm run build` and load the `dist/` folder again.


## Verify

1. Open `https://www.instagram.com/` and start any Reel.
2. Move the mouse over the video to reveal the overlay; adjust volume or seek.
3. Use hotkeys: `Shift+ArrowUp/Down`, `Shift+M`, `ArrowLeft/Right`.
4. Open `https://www.instagram.com/direct/` and open a chat with video messages.
5. Use `Alt+ArrowLeft/Right` to move between video messages.

## Selector Strategy

Instagram frequently changes DOM structure, so selectors are deliberately resilient:

- The content script watches for `<video>` elements via `MutationObserver` and applies settings regardless of container markup.
- Direct navigation uses a layered approach:
  1. Try native Next/Prev buttons by ARIA label or text.
  2. Scan message list (`div[role='list']` or `main`) for clickable elements containing video or video-like thumbnails.
  3. Scroll and retry if a virtualized list hides the next item.

If Instagram changes markup, update the heuristics in:
- `src/content/playerController.ts` (video discovery)
- `src/content/directNavigator.ts` (Direct message discovery)

## Development

```bash
npm run dev
```

Vite will build and watch. You still need to reload the extension in Chrome after changes.
