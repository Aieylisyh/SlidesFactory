---
name: deck-progress-bar
description: >-
  Implements and ports the Reveal.js deck bottom progress bar with S thumb,
  bar gradient, smooth drag, and release snap. Use when adding or modifying
  slide-progress.js, deck progress CSS tokens, is-dragging/is-snapping states,
  or porting progress bar UX to another SFK Reveal deck.
---

# Deck Progress Bar

## Canonical files

| File | Role |
|------|------|
| `shared/scripts/slide-progress.js` | Runtime drag, snap, thumb fraction |
| `styles/style-guide/01-tokens-base.css` | Main deck progress tokens and base CSS |
| `summerschool/css/ss-tokens-chrome.css` | Summerschool theme overrides |
| `assets/logos/S.png` / `summerschool/assets/logos/S.png` | S mask assets |
| `docs/guides/style_guide.md` | Visual spec |

## Behavior

- Press cancels in-flight snap and adds `.is-dragging`.
- Drag updates thumb position and gradient peak only; do not call `Reveal.slide()` during drag.
- Release adds `.is-snapping`, eases to the nearest slide fraction, then navigates.
- Reveal default progress fill stays transparent; the visible bar gradient belongs to `.progress`.

## Checklist

```text
- Reveal.initialize({ progress: true })
- SlideProgress.init(Reveal) after Reveal initializes
- .is-dragging and .is-snapping CSS states exist
- S mask asset path resolves for the target site
- CSS / JS ?v= query params are bumped after edits
```

## Avoid

- Jumping slides while the user is dragging.
- Blocking `wheel` events on the progress bar.
- Using external logo URLs.
- Updating the shared script without checking both main deck and summerschool.
