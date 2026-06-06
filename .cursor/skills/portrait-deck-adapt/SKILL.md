---

name: portrait-deck-adapt

description: >-

  Implements and extends the SFK Reveal.js lightweight portrait mode (strategy A):

  html.deck-portrait detection, landscape hint banner, safe-area chrome, grid

  fold CSS, and PortraitDeckAdapt.init/bind wiring. Use when adding mobile

  vertical viewport support, portrait-deck-adapt.js/css, or docs/guides/PORTRAIT_ADAPT_GUIDE.md.

---



# Portrait Deck Adapt (Reveal.js)



## When to use



- Adding or changing **竖屏轻量适配** (scale-first, no 1080×1920 canvas)

- Modifying `shared/scripts/portrait-deck-adapt.js`, `styles/style-guide/10-portrait-adapt.css`, or hint banner copy

- Porting portrait behavior to summerschool or another SFK deck

- Debugging `deck-portrait` class, `deckportraitchange`, or `?portrait=0`



## Strategy (canonical)



| Mode | Canvas | This module |

|------|--------|-------------|

| **A scale-first** (current) | `main.js` → 1920×1080/1200 unchanged | `html.deck-portrait` + CSS fold + hint |

| B reflow (future) | 1080×1920 branch in `getSlideDimensions()` | Extend with `mode: 'reflow'` — not default |



Full spec: `docs/guides/PORTRAIT_ADAPT_GUIDE.md`.



## Wiring checklist



```

- [ ] viewport meta includes viewport-fit=cover

- [ ] style_guide.css hub (includes 10-portrait-adapt.css)

- [ ] shared/scripts/portrait-deck-adapt.js before main.js

- [ ] PortraitDeckAdapt.init() in main.js boot (before initReveal)

- [ ] PortraitDeckAdapt.bind(Reveal) in initialize().then

- [ ] SlideWheelNav.bind({ ignoreWhen: PortraitDeckAdapt.isPortrait })

- [ ] Bump ?v= on script/css includes after edits

```



## Key artifacts



| File | Role |

|------|------|

| `shared/scripts/portrait-deck-adapt.js` | Detection, `deck-portrait` class, hint UI, `deckportraitchange` |

| `styles/style-guide/10-portrait-adapt.css` | Token overrides, grid→1col, safe-area, min 44px touch |

| `summerschool/portrait-deck-adapt-extension.css` | Light theme + `ss-*` layout folds (summerschool only) |

| `docs/guides/PORTRAIT_ADAPT_GUIDE.md` | Human + agent reference |



## Summerschool wiring



```

summerschool/index.html:

  ../style_guide.css                  (includes 10-portrait-adapt.css)

  portrait-deck-adapt-extension.css   (after style_extension.css)

  ../shared/scripts/portrait-deck-adapt.js   (before main.js)



summerschool/scripts/main.js:

  PortraitDeckAdapt.init() in boot()

  PortraitDeckAdapt.bind(Reveal) after initialize

  SlideWheelNav.ignoreWhen: isPortrait() || body.is-ss-schedule-modal-open

```



Preview: `http://localhost:8080/summerschool/` via root `start-lan-server.bat`.



## Detection



- Portrait when `innerWidth / innerHeight < aspectMax` (default `0.95`)

- Disabled when `?portrait=0`

- Hint dismissed: `sessionStorage['sfk-deck-portrait-hint-dismissed'] === '1'`



## Do not



- Change `getSlideDimensions()` for strategy A unless user explicitly requests plan B

- Block `wheel` on the hint banner (deck wheel nav uses capture phase)

- Edit frozen case-study slide HTML for portrait; extend `10-portrait-adapt.css` selectors instead

- Put portrait layout rules in `01`–`08` style shards unless promoting a token to global design system



## Extending CSS



1. **Main deck:** `html.deck-portrait .reveal …` in `styles/style-guide/10-portrait-adapt.css`

2. **Summerschool:** `html.ss-deck-light.deck-portrait …` in `summerschool/portrait-deck-adapt-extension.css`

3. Prefer layout class names from `docs/guides/style_guide_extended.md` or `summerschool/style_extension.css`（hub → `summerschool/css/ss-*.css`）

4. Optional per-slide: `data-portrait-layout="stack"` + attribute selector



## Troubleshooting



| Issue | Fix |

|-------|-----|

| No `deck-portrait` on phone | Confirm `init()` runs; check aspect ratio; not `?portrait=0` |

| Hint every visit | User chose「不再提示」— clear sessionStorage key |

| Grids still 2-col | Class name not in CSS list — add to `10-portrait-adapt.css` |

| ECharts not resizing | Listen `deckportraitchange` or rely on synthetic `resize` from bind |

| Wheel still flips on phone | Pass `ignoreWhen: PortraitDeckAdapt.isPortrait` to `SlideWheelNav.bind` |


