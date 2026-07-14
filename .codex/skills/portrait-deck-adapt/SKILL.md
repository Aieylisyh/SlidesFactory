---
name: portrait-deck-adapt
description: >-
  Implements and extends the SFK Reveal.js lightweight portrait mode: html.deck-portrait
  detection, landscape hint banner, safe-area chrome, grid fold CSS, and
  PortraitDeckAdapt.init/bind wiring. Use when adding mobile vertical viewport
  support, portrait-deck-adapt.js/css, portrait-deck-adapt-extension.css, or
  docs/guides/PORTRAIT_ADAPT_GUIDE.md.
---

# Portrait Deck Adapt

## Strategy

The current strategy is lightweight portrait adaptation:

- Keep the Reveal canvas dimensions unchanged.
- Add `html.deck-portrait` when the viewport is vertical.
- Fold selected layouts with CSS.
- Show the landscape hint banner.
- Disable custom wheel navigation in portrait mode.

Do not change `getSlideDimensions()` unless the user explicitly asks for a reflow strategy.

## Canonical files

| File | Role |
|------|------|
| `shared/scripts/portrait-deck-adapt.js` | Detection, hint UI, `deckportraitchange` |
| `styles/style-guide/10-portrait-adapt.css` | Main deck portrait CSS |
| `summerschool/portrait-deck-adapt-extension.css` | Summerschool portrait overrides |
| `docs/guides/PORTRAIT_ADAPT_GUIDE.md` | Full guide |

## Wiring checklist

```text
- viewport meta includes viewport-fit=cover
- shared/scripts/portrait-deck-adapt.js loads before site main.js
- PortraitDeckAdapt.init() runs before Reveal initialization
- PortraitDeckAdapt.bind(Reveal) runs after Reveal initialization
- SlideWheelNav ignoreWhen includes PortraitDeckAdapt.isPortrait
- ?v= query params are bumped after edits
```

## Summerschool notes

- Keep summerschool-specific folds in `summerschool/portrait-deck-adapt-extension.css`.
- The base style chain is `../style_guide.css`, then `style_extension.css`, then `portrait-deck-adapt-extension.css`.
- Test `http://localhost:8080/summerschool/` in desktop and portrait viewports.
