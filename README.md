# Neon Vice Cover Studio

[![GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/renprayoga/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/renprayoga/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Buat cover bergaya GTA 6 dari fotomu sendiri — langsung di browser, **offline sepenuhnya**: tidak ada request network, tidak ada foto yang diunggah ke mana pun.

## Apa yang dilakukan app ini

- **3 layout multi-panel** — Poster (satu hero besar + 3 panel kecil), Duo (hero + 2 panel), dan Full bleed (satu foto memenuhi cover).
- **4 grade warna** — Sunset, Neon Night, Dusk, Noir, dan Vapor: filter canvas plus sapuan gradien dan vignette khas Vice City.
- **4 slot foto** — pilih lewat file picker, atau seret foto langsung ke cover. Setiap panel bisa di-crop sendiri: geser dengan drag di cover, zoom dengan roda mouse, atau pakai slider zoom/geser.
- **Judul + subjudul live** — ketik judul, langsung tampil di cover dengan huruf tebal bergaya genre dan glow neon.
- **Export PNG sekali klik** — 1080×1080, 1080×1350, dan 1920×1080, atau ketiganya sekaligus lewat tombol "Unduh ketiga ukuran sekaligus". Preview dan export memakai **satu fungsi renderer yang sama** (`renderCover` di `app/src/cover.js`), jadi hasil export identik dengan yang terlihat di layar.
- **2 foto contoh bawaan** (`app/samples/`) — panel kosong otomatis memakai foto contoh, jadi cover tidak pernah blank dan app langsung bisa dipakai.
- **Shortcut keyboard** — `1/2/3` ganti layout, `G` ganti grade, `E` export 1080×1080, `R` reset crop panel terpilih, `H` bantuan.

## Cara menjalankan lokal

```sh
node serve.ts
# buka http://localhost:8080
```

Tidak perlu install apa pun: Node 22 dan standard library saja.

## Cara memakai

1. Pilih layout dan grade warna.
2. Klik **Pilih foto** di sebuah panel, atau seret foto ke cover (foto besar otomatis diperkecil ke 2400 px supaya editor tetap ringan).
3. Klik panel, lalu geser di cover untuk mengatur posisi dan putar roda mouse untuk zoom.
4. Tulis judul dan subjudul.
5. Klik salah satu tombol **Export PNG** — nama file berisi ukurannya, mis. `neon-vice-cover-1920x1080.png`.

## Struktur

- `app/index.html` — halaman studio
- `app/style.css` — tema neon gelap + responsif
- `app/src/cover.js` — satu-satunya renderer cover (preview + export)
- `app/src/main.js` — logika UI: slot foto, drag-and-drop, crop, export, shortcut
- `app/src/shots.js` — staging scene deterministik untuk screenshot
- `app/samples/` — 2 foto contoh bawaan
- `main.ts` — entrypoint: menyalin `app/` + `screenshots/` ke direktori output dan menulis `dossier.json`
- `serve.ts` — server statis kecil untuk preview lokal

## Lisensi

MIT — lihat `LICENSE`.
