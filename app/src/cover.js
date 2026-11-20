// Neon Vice Cover Studio — one renderer for preview and export.
//
// The whole cover is drawn by renderCover(): the preview canvas and every
// exported PNG go through this exact function, so what you see on screen
// is byte-for-byte what the export contains (only the pixel size differs).

export const LAYOUTS = ["poster", "duo", "full"];

export const GRADES = {
  sunset: {
    label: "Sunset",
    filter: "saturate(1.45) contrast(1.06) brightness(1.03) sepia(0.22)",
    accent: "#ff7a3d",
    overlay: ["rgba(255,122,61,0.20)", "rgba(255,45,120,0.24)"],
  },
  neon: {
    label: "Neon Night",
    filter: "saturate(1.7) contrast(1.14) brightness(1.0)",
    accent: "#ff2fb3",
    overlay: ["rgba(255,47,179,0.22)", "rgba(0,229,255,0.20)"],
  },
  dusk: {
    label: "Dusk",
    filter: "saturate(1.12) contrast(1.05) brightness(0.96)",
    accent: "#8b7bff",
    overlay: ["rgba(70,60,180,0.26)", "rgba(20,10,60,0.30)"],
  },
  noir: {
    label: "Noir",
    filter: "grayscale(1) contrast(1.18) brightness(0.98)",
    accent: "#f2f2f2",
    overlay: ["rgba(0,0,0,0.10)", "rgba(0,0,0,0.34)"],
  },
  vapor: {
    label: "Vapor",
    filter: "saturate(1.5) contrast(1.1) brightness(1.05) hue-rotate(-18deg)",
    accent: "#00e5ff",
    overlay: ["rgba(0,229,255,0.20)", "rgba(255,47,179,0.26)"],
  },
};

/** How many photo panels a layout shows. */
export function panelCount(layout) {
  if (layout === "poster") return 4;
  if (layout === "duo") return 3;
  return 1;
}

/**
 * Panel rectangles for a layout, in canvas pixels. The gap scales with the
 * cover so a 1080 export and the on-screen preview share the same geometry.
 */
export function panelRects(layout, w, h) {
  const gap = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  if (layout === "duo") {
    const heroH = Math.round(h * 0.64);
    const bottomY = heroH + gap;
    const bottomH = h - bottomY;
    const half = Math.floor((w - gap) / 2);
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: bottomY, w: half, h: bottomH },
      { x: half + gap, y: bottomY, w: w - half - gap, h: bottomH },
    ];
  }
  if (layout === "full") {
    return [{ x: 0, y: 0, w, h }];
  }
  // poster: one hero on top, three small panels along the bottom.
  const heroH = Math.round(h * 0.62);
  const bottomY = heroH + gap;
  const bottomH = h - bottomY;
  const third = Math.floor((w - gap * 2) / 3);
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: bottomY, w: third, h: bottomH },
    { x: third + gap, y: bottomY, w: third, h: bottomH },
    { x: (third + gap) * 2, y: bottomY, w: w - (third + gap) * 2, h: bottomH },
  ];
}

/** Which panel (if any) contains point (x, y) in canvas pixels. */
export function panelAt(layout, w, h, x, y) {
  const rects = panelRects(layout, w, h);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

function drawPhoto(ctx, img, rect, panel) {
  if (!img || !img.naturalWidth) return;
  const zoom = panel && panel.zoom ? panel.zoom : 1;
  const ox = panel && panel.ox ? panel.ox : 0;
  const oy = panel && panel.oy ? panel.oy : 0;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawGradeWash(ctx, grade, w, h) {
  const g = GRADES[grade] || GRADES.sunset;
  const wash = ctx.createLinearGradient(0, 0, w * 0.6, h);
  wash.addColorStop(0, g.overlay[0]);
  wash.addColorStop(1, g.overlay[1]);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  // Vignette: darkened corners keep the caption readable on any photo.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawCaption(ctx, state, grade, w, h) {
  const title = (state.title || "").trim();
  const subtitle = (state.subtitle || "").trim();
  if (!title && !subtitle) return;
  const g = GRADES[grade] || GRADES.sunset;
  const bandH = Math.round(h * (subtitle ? 0.24 : 0.17));
  const bandY = h - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, "rgba(8,4,20,0)");
  band.addColorStop(0.35, "rgba(8,4,20,0.72)");
  band.addColorStop(1, "rgba(8,4,20,0.92)");
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  const pad = Math.round(w * 0.045);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (title) {
    const size = Math.round(h * 0.082);
    ctx.font = `italic 900 ${size}px "Arial Black", "Archivo Black", sans-serif`;
    ctx.shadowColor = g.accent;
    ctx.shadowBlur = Math.round(size * 0.35);
    ctx.lineWidth = Math.max(2, Math.round(size * 0.07));
    ctx.strokeStyle = "rgba(10,4,24,0.9)";
    ctx.strokeText(title.toUpperCase(), pad, h - pad - (subtitle ? Math.round(h * 0.045) : 0));
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title.toUpperCase(), pad, h - pad - (subtitle ? Math.round(h * 0.045) : 0));
    ctx.shadowBlur = 0;
  }
  if (subtitle) {
    const size = Math.round(h * 0.032);
    ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = g.accent;
    ctx.fillText(subtitle.toUpperCase(), pad, h - Math.round(pad * 0.55));
  }
}

function drawTag(ctx, w, h) {
  const label = "LEONIDA  •  VI";
  const size = Math.max(12, Math.round(h * 0.02));
  ctx.font = `800 ${size}px Arial, Helvetica, sans-serif`;
  const tw = ctx.measureText(label).width;
  const padX = Math.round(size * 0.9);
  const padY = Math.round(size * 0.55);
  const x = Math.round(w * 0.03);
  const y = Math.round(h * 0.03);
  const bw = tw + padX * 2;
  const bh = size + padY * 2;
  ctx.save();
  ctx.fillStyle = "rgba(8,4,20,0.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, Math.round(bh / 2));
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, x + padX, y + bh / 2 + 1);
  ctx.restore();
}

/**
 * Render the whole cover onto `canvas` at exactly w x h pixels.
 * state: { layout, grade, title, subtitle, panels: [{img, zoom, ox, oy}],
 *          fallbacks: [Image, ...] } — a panel without its own photo falls
 * back to the bundled sample photos so the cover is never blank.
 */
export function renderCover(canvas, state, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const grade = GRADES[state.grade] ? state.grade : "sunset";
  const g = GRADES[grade];
  ctx.fillStyle = "#0a0618";
  ctx.fillRect(0, 0, w, h);
  ctx.filter = g.filter;
  const rects = panelRects(state.layout, w, h);
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    const panel = state.panels[i] || {};
    let img = panel.img || null;
    if (!img && state.fallbacks && state.fallbacks.length) {
      img = state.fallbacks[i % state.fallbacks.length];
    }
    drawPhoto(ctx, img, rects[i], panel);
  }
  ctx.filter = "none";
  drawGradeWash(ctx, grade, w, h);
  drawTag(ctx, w, h);
  drawCaption(ctx, state, grade, w, h);
  return canvas;
}
