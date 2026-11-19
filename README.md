# Neon Vice Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/renprayoga/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/renprayoga/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photos into bold multi-panel poster art in the style of GTA 6's
posters — offline, in your browser, photos never leaving your machine.
An entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
bounty on [make.fun](https://make.fun/).

## What it does

- **Multi-panel poster covers** — three layouts: Poster (hero + 3 panels),
  Duo (hero + 2 panels) and Full bleed (1 photo).
- **Any photo** — upload up to 4 photos (file picker or drag-and-drop onto
  the cover), crop and position each panel with sliders, by dragging on the
  cover, or with the mouse wheel to zoom. Two sample photos are bundled so
  the first cover is one click away.
- **Caption** — edit the big title and the neon subtitle live; the lettering
  is drawn in bold gradient capitals with a black outline.
- **Vice City grades** — Sunset, Neon Night, Dusk and Noir colour grades,
  plus grain and a vignette, painted over every panel.
- **Fast export** — one click downloads the cover as a PNG in 1080 × 1080,
  1080 × 1350 or 1920 × 1080.

## Run it

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

Open `app/index.html` in desktop Chrome. No build step, no network request:
every script, style and sample photo is a file under `app/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with `buildDossier` from `vendor/makefun-app.ts`.

## Screenshots

- `1-cover.jpg` — a cover the app exported (wide, Sunset grade)
- `2-editor.jpg` — the editor with sample photos loaded
- `3-cover.jpg` — a second cover (portrait, Neon Night grade)
- `4-export.jpg` — the editor in the Full bleed layout with the size picker

The sample photos in `app/samples/` were made with an image model for
make.fun and are free to use. All art is original: no Rockstar Games logo,
artwork or font is used anywhere.

## License

MIT — see [LICENSE](LICENSE).
