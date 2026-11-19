// Neon Vice Cover Studio — the cover renderer.
//
// One function, drawCover, paints every cover the app makes: the live preview
// on screen and the exported PNG at full resolution share it, so what the user
// sees is exactly what the file holds. A cover is a grid of photo panels with
// white poster gutters, a Vice City sunset or neon colour grade over each
// panel, a bold gradient title and a neon subtitle, plus grain and a vignette.
// Everything is drawn with the 2D canvas API; no library, no font file, no
// network — the lettering uses the heavy system sans stack (Impact / Arial
// Black), which is an original design, not a Rockstar font.

/** The three post sizes the bounty asks for, in export pixels. */
export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080 · Square' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350 · Portrait' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080 · Wide' },
};

/**
 * The panel layouts, as fractions of the cover (x, y, w, h). `poster` is the
 * classic multi-panel look: one hero panel on top, three below. `duo` is a
 * tall hero on the left with two stacked panels. `full` is a single full-bleed
 * photo. Every layout keeps a title band at the bottom for the lettering.
 */
export const LAYOUTS = {
  poster: {
    label: 'Poster · hero + 3',
    panels: [
      [0, 0, 1, 0.6],
      [0, 0.6, 1 / 3, 0.4],
      [1 / 3, 0.6, 1 / 3, 0.4],
      [2 / 3, 0.6, 1 / 3, 0.4],
    ],
  },
  duo: {
    label: 'Duo · hero + 2',
    panels: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  full: {
    label: 'Full bleed · 1 photo',
    panels: [[0, 0, 1, 1]],
  },
};

/**
 * The colour grades. Each grade is a canvas filter for the photo itself plus
 * one or two translucent gradient washes painted over the panel. The washes
 * are what give the sunset / neon Vice City feel; the filter keeps the photo
 * punchy underneath.
 */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.03)',
    washes: [
      { from: 'rgba(255, 122, 26, 0)', to: 'rgba(255, 69, 0, 0.34)', vertical: true },
      { from: 'rgba(255, 46, 136, 0)', to: 'rgba(190, 20, 120, 0.30)', vertical: false },
    ],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.6) contrast(1.12) hue-rotate(-14deg)',
    washes: [
      { from: 'rgba(255, 92, 225, 0.28)', to: 'rgba(45, 226, 230, 0.30)', vertical: false },
      { from: 'rgba(20, 8, 60, 0)', to: 'rgba(20, 8, 60, 0.42)', vertical: true },
    ],
  },
  dusk: {
    label: 'Dusk',
    filter: 'saturate(1.2) contrast(1.06) brightness(0.92) hue-rotate(16deg)',
    washes: [
      { from: 'rgba(88, 28, 135, 0)', to: 'rgba(88, 28, 135, 0.38)', vertical: true },
      { from: 'rgba(255, 150, 80, 0)', to: 'rgba(255, 150, 80, 0.22)', vertical: false },
    ],
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    washes: [
      { from: 'rgba(255, 214, 106, 0)', to: 'rgba(255, 214, 106, 0.16)', vertical: true },
      { from: 'rgba(0, 0, 0, 0)', to: 'rgba(0, 0, 0, 0.30)', vertical: true },
    ],
  },
};

/** Title gradients, one per grade, painted across the lettering. */
const TITLE_GRADIENTS = {
  sunset: ['#ffe259', '#ff7e3d', '#ff2e88'],
  neon: ['#7df9ff', '#ff5ce1', '#b967ff'],
  dusk: ['#ffd76a', '#c084fc', '#f472b6'],
  noir: ['#ffffff', '#e8e8e8', '#bdbdbd'],
};

/** A small deterministic PRNG so the grain looks the same on every export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** Builds (once) a 128 x 128 monochrome noise tile reused by every cover. */
export function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  const rand = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

/**
 * Draws one photo into one panel rect with cover-fit, zoom and pan.
 * `photo` is an <img>/canvas or null (null paints a sunset placeholder so an
 * empty panel still looks like poster art, never a hole). `zoom` >= 1 magnifies
 * around the panel centre; `ox`/`oy` in [-0.5, 0.5] pan the photo inside it.
 */
export function drawPanelPhoto(ctx, photo, rect, zoom, ox, oy) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#ff9a3d');
    g.addColorStop(0.55, '#ff2e88');
    g.addColorStop(1, '#2b1055');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `700 ${Math.max(14, h * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('＋  ADD PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(w / iw, h / ih);
  const scale = base * Math.max(1, zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  // Cover-fit, anchored near the top (0.15) instead of the centre: poster
  // photos are usually portraits, and the face sits in the upper third, so a
  // centred crop cuts it off in wide panels. `ox`/`oy` still pan from there.
  const dx = x + (w - pw) / 2 + (ox || 0) * w;
  const dy = y + (h - ph) * 0.15 + (oy || 0) * h;
  ctx.drawImage(photo, dx, dy, pw, ph);
  ctx.restore();
}

/** Paints a grade's washes over one panel rect. */
export function paintGradeWash(ctx, grade, rect) {
  const { x, y, w, h } = rect;
  for (const wash of grade.washes) {
    const g = wash.vertical
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, wash.from);
    g.addColorStop(1, wash.to);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
}

/** Fits `text` to `maxWidth` by shrinking the font, never below `minPx`. */
export function fitFont(ctx, text, startPx, maxWidth, minPx) {
  let size = startPx;
  ctx.font = `900 ${size}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
  }
  return size;
}

/**
 * Draws the title block: a dark scrim, the big gradient title with a black
 * outline, and the letter-spaced subtitle underneath. Skipped gracefully when
 * the title is empty.
 */
export function drawTitleBlock(ctx, state, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const bandH = H * 0.2;
  const bandY = H - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
  scrim.addColorStop(0, 'rgba(10, 4, 24, 0)');
  scrim.addColorStop(1, 'rgba(10, 4, 24, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.06, W, bandH + H * 0.06);

  const gradeKey = GRADES[state.grade] ? state.grade : 'sunset';
  if (title) {
    const maxW = W * 0.92;
    const size = fitFont(ctx, title, H * 0.115, maxW, 20);
    const grad = ctx.createLinearGradient(0, H - bandH, 0, H - H * 0.02);
    const stops = TITLE_GRADIENTS[gradeKey];
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.55, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.font = `900 ${size}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8, 2, 18, 0.9)';
    ctx.lineWidth = Math.max(2, size / 16);
    ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
    ctx.shadowBlur = size * 0.12;
    const ty = H - H * 0.075;
    ctx.strokeText(title, W / 2, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, W / 2, ty);
    ctx.shadowBlur = 0;
  }
  if (subtitle) {
    const size = Math.max(14, H * 0.032);
    ctx.font = `700 ${size}px "Helvetica Neue", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 92, 225, 0.8)';
    ctx.shadowBlur = size * 0.6;
    const spaced = subtitle.split('').join('  ');
    ctx.fillText(spaced, W / 2, H - H * 0.028);
    ctx.shadowBlur = 0;
  }
}

/** A dark vignette that pulls the eye to the middle of the cover. */
export function paintVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(8, 2, 18, 0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Paints the whole cover onto `ctx` at W x H. `state` carries layout, grade,
 * title, subtitle, photos (images or null) and one transform per panel
 * ({ photo, zoom, ox, oy }). Panels outside the layout's count are ignored;
 * a panel whose photo index is missing falls back to the first photo, then
 * to the placeholder. Runs in a single pass, O(panels), with no allocation
 * in the panel loop besides the gradients.
 */
export function drawCover(ctx, state, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.poster;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gutter = Math.max(3, Math.round(W * 0.006));
  ctx.fillStyle = '#f5f0ff';
  ctx.fillRect(0, 0, W, H);

  layout.panels.forEach((frac, i) => {
    const rect = {
      x: Math.round(frac[0] * W) + (frac[0] > 0 ? gutter : 0),
      y: Math.round(frac[1] * H) + (frac[1] > 0 ? gutter : 0),
      w: Math.round(frac[2] * W) - (frac[0] > 0 ? gutter : 0) - (frac[0] + frac[2] < 1 ? gutter : 0),
      h: Math.round(frac[3] * H) - (frac[1] > 0 ? gutter : 0) - (frac[1] + frac[3] < 1 ? gutter : 0),
    };
    if (rect.w <= 0 || rect.h <= 0) return;
    const t = (state.panels && state.panels[i]) || { photo: i, zoom: 1, ox: 0, oy: 0 };
    const photos = state.photos || [];
    const img = photos[t.photo] ?? photos[0] ?? null;
    ctx.save();
    ctx.filter = grade.filter;
    drawPanelPhoto(ctx, img, rect, t.zoom, t.ox, t.oy);
    ctx.restore();
    paintGradeWash(ctx, grade, rect);
  });

  drawTitleBlock(ctx, state, W, H);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  paintVignette(ctx, W, H);

  // A thin poster frame so the cover reads as one finished piece.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

/** Renders `state` onto a canvas element at the chosen export size. */
export function renderCover(canvas, state) {
  const size = EXPORT_SIZES[state.size] || EXPORT_SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), state, size.w, size.h);
  return size;
}
