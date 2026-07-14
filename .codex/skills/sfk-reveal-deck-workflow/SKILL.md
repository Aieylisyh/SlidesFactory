---
name: sfk-reveal-deck-workflow
description: >-
  Work on this SFK static Reveal.js monorepo. Use whenever editing the main
  deck, summerschool deck, shared Reveal scripts, CSS shards, outlines, local
  preview, asset compression, or deployment docs. Especially use for requests
  mentioning summerschool, slides, Reveal.js, style_extension.css, style_guide.css,
  shared/scripts, config/outline.md, or deploying this site.
---

# SFK Reveal Deck Workflow

## Start here

1. Read `AGENTS.md` and `.codex/rules/project-rules.md`.
2. Identify the target site:
   - Main deck: `index.html`, structure in `config/outline.md`.
   - Summerschool: `summerschool/index.html`, structure in `summerschool/outline.md`.
   - quiz-live: archived; read `quiz-live/ARCHIVED.md` before touching it.
   - Remote navigator: read `docs/guides/REMOTE_GUIDE.md`.
3. Read the narrow guide for the feature you are changing before editing.

## Routing map

| Task | Read first | Edit |
|------|------------|------|
| Main deck slide structure | `config/outline.md`, `docs/guides/OUTLINE_GUIDE.md` | `index.html` |
| Summerschool slide structure | `summerschool/outline.md` | `summerschool/index.html` |
| Main deck CSS | `styles/style-guide/README.md` | `styles/style-guide/NN-*.css` |
| Summerschool CSS | `summerschool/css/README.md` | `summerschool/css/ss-*.css` |
| Shared progress / wheel / portrait JS | relevant skill or guide | `shared/scripts/` |
| Main deck module JS | `scripts/README.md` | `scripts/<module>/` |
| Summerschool module JS | current HTML script includes | `summerschool/scripts/` |
| Deployment behavior | `deploy/部署脚本说明.md` | `deploy/sync.ps1` or related docs |

## Editing rules

- Keep HTML structural. Put reusable styles in CSS shards and behavior in JS modules.
- Do not add inline styles except dynamic JS coordinates already following local patterns.
- Bump `?v=` query params when CSS or JS files change.
- Preserve the existing Reveal linear navigation model.
- For interactive zones, stop pointer and necessary keyboard events, but leave `wheel` alone.
- When adding a new visual pattern, update the relevant guide or README so the next agent can find it.

## Assets

- Never invent external image links.
- Use local extracted/compressed assets, or a clear placeholder when assets are missing.
- If a production image is at least 80 KB or longer than 1920 px, run the compression workflow from `docs/guides/IMAGE_COMPRESSION_GUIDE.md`.
- Do not commit deployment secrets, local runtime state, or generated cache folders.

## Verification

- Preview through `start-lan-server.bat` from the repo root.
- Main deck URL: `http://localhost:8080/`.
- Summerschool URL: `http://localhost:8080/summerschool/`.
- For UI changes, check that text fits, controls do not overlap, and Reveal navigation still works.
- For deployment changes, run a dry-run and confirm `.codex/**`, `.cursor/**`, docs, tools, contents, and deploy configs are excluded.
