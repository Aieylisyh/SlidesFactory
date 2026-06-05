---
name: deck-progress-bar
description: >-
  Implements and ports the Reveal.js deck bottom progress bar with S thumb,
  bar gradient, smooth drag, and release snap. Use when adding or modifying
  slide-progress.js, deck progress CSS tokens, is-dragging/is-snapping states,
  or porting progress bar UX to another SFK Reveal deck.
---

# Deck Progress Bar (Reveal.js)

## When to use

- New Reveal deck needs the SFK bottom progress bar
- Modifying drag/snap behavior, thumb styling, or bar gradient
- Porting from this project to another deck (summerschool, external site)

## Spec (canonical)

Full token + visual spec: `guides/style_guide.md` §4.5. Component row: `guides/style_guide_extended.md`.

### Drag + snap behavior (v8+)

| Phase | Behavior |
|-------|----------|
| Press | Cancel in-flight snap; add `.is-dragging` on `.progress`; peek expand |
| Drag | Thumb + bar peak follow pointer smoothly; **do not** call `Reveal.slide()` |
| Release | Remove `.is-dragging`; run snap animation with `.is-snapping` |
| Snap | easeOutCubic ~220ms (`SNAP_DURATION_MS`) to nearest slide fraction |
| Done | Remove `.is-snapping`; `Reveal.slide(h, v)`; `syncThumbPosition()` |

### Key functions (`shared/scripts/slide-progress.js`)

| Function | Role |
|----------|------|
| `setThumbFraction(fraction)` | Sets thumb `left`, `--deck-progress-thumb-pct`, `--deck-progress-thumb-spin` |
| `nearestSlideIndex(fraction, total)` | Finds closest leaf slide index by progress fraction |
| `snapToNearestSlide(fromFraction, onDone)` | rAF eased animation, then navigates |

### CSS state classes (`styles/style-guide/01-tokens-base.css`)

- `.is-dragging` on `.progress` — expanded track, enlarged thumb, `cursor: grabbing`
- `.is-snapping` on `.progress` — same expanded visuals during release animation; thumb size transition `0.22s ease`

## Wiring checklist

```
- [ ] Reveal.initialize({ progress: true })
- [ ] SlideProgress.init(Reveal) after initialize (main.js)
- [ ] `01-tokens-base.css` progress tokens + .is-dragging / .is-snapping rules
- [ ] assets/logos/S.png + --deck-progress-s-mask
- [ ] index.html script ?v=8+ (bump on JS/CSS changes)
```

## Port to another deck

1. Copy `shared/scripts/slide-progress.js` (v8+)
2. Copy or merge `:root` `--deck-progress-*` tokens and `.reveal .progress` / `.deck-progress-thumb` / `.is-dragging` / `.is-snapping` blocks from `styles/style-guide/01-tokens-base.css`
3. Light-theme overrides: extend theme CSS (see `summerschool/style_extension.css`) — include `.is-snapping` alongside `.is-dragging`
4. Call `SlideProgress.init(Reveal)` in that deck's `main.js`
5. Bump `?v=` query param on script include

## Do not

- Jump slides during drag (only on snap completion)
- Use Reveal default fill color on `.progress > span` (keep transparent; bar gradient on `.progress`)
- Block `wheel` on the progress bar (deck flip uses capture-phase wheel nav)
- Invent external image URLs for S mask — use local `assets/logos/S.png`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bar peak not following S | Confirm `setThumbFraction` writes `--deck-progress-thumb-pct` on `.progress` |
| Slide jumps while dragging | Ensure drag handler only calls `setThumbFraction`, not `Reveal.slide()` |
| Snap feels instant | Check `SNAP_DURATION_MS` (220) and `.is-snapping` CSS present |
| Stale behavior after edit | Bump `shared/scripts/slide-progress.js?v=` and `style_guide.css?v=` in HTML |
