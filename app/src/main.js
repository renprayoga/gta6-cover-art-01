// Neon Vice Cover Studio — UI logic.
//
// Everything on screen is driven by one `state` object. The preview canvas
// and every export both call renderCover() from cover.js, so the export is
// exactly the preview at a different pixel size. Photos never leave the
// machine: files are read with FileReader into local object URLs only.

import { renderCover, panelAt, panelCount, LAYOUTS, GRADES } from "./cover.js";

const SAMPLE_URLS = ["samples/pier.jpg", "samples/boulevard.jpg"];
const EXPORT_SIZES = [
  { w: 1080, h: 1080, label: "1080 × 1080 (feed)" },
  { w: 1080, h: 1350, label: "1080 × 1350 (portrait)" },
  { w: 1920, h: 1080, label: "1920 × 1080 (banner)" },
];

const state = {
  layout: "poster",
  grade: "neon",
  title: "Vice City",
  subtitle: "Leonida — 2026",
  panels: [{}, {}, {}, {}],
  fallbacks: [],
  selected: 0,
};

const $ = (sel) => document.querySelector(sel);
const stage = $("#stage");
const toastEl = $("#toast");

let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("gagal memuat " + src));
    img.src = src;
  });
}

async function loadSamples() {
  const loaded = [];
  for (const url of SAMPLE_URLS) {
    try {
      loaded.push(await loadImage(url));
    } catch {
      // A missing sample must not break the studio; panels just stay dark.
    }
  }
  state.fallbacks = loaded;
}

function render() {
  renderCover(stage, state, 900, 900);
  syncControls();
}

function syncControls() {
  document.querySelectorAll("[data-layout]").forEach((b) => {
    b.classList.toggle("active", b.dataset.layout === state.layout);
    b.setAttribute("aria-pressed", String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll("[data-grade]").forEach((b) => {
    b.classList.toggle("active", b.dataset.grade === state.grade);
    b.setAttribute("aria-pressed", String(b.dataset.grade === state.grade));
  });
  document.querySelectorAll(".slot").forEach((slot, i) => {
    slot.classList.toggle("selected", i === state.selected && i < panelCount(state.layout));
    slot.classList.toggle("empty", !state.panels[i] || !state.panels[i].img);
    const thumb = slot.querySelector(".thumb");
    const panel = state.panels[i] || {};
    if (panel.img) {
      thumb.style.backgroundImage = `url(${panel.img.src})`;
      thumb.textContent = "";
    } else {
      thumb.style.backgroundImage = "";
      thumb.textContent = panelCount(state.layout) > i ? "Contoh" : "—";
    }
  });
  const panel = state.panels[state.selected] || {};
  $("#zoom").value = panel.zoom || 1;
  $("#panX").value = panel.ox || 0;
  $("#panY").value = panel.oy || 0;
  $("#zoomVal").textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  $("#panXVal").textContent = `${Math.round((panel.ox || 0) * 100)}`;
  $("#panYVal").textContent = `${Math.round((panel.oy || 0) * 100)}`;
  $("#selLabel").textContent = `Panel ${state.selected + 1} dari ${panelCount(state.layout)}`;
}

function setPanel(i, patch) {
  state.panels[i] = { ...(state.panels[i] || {}), ...patch };
  render();
}

async function assignFile(slotIndex, file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("Pilih file gambar (JPG/PNG/WebP).");
    return;
  }
  // Downscale absurdly large photos before drawing: a 50 MP phone photo
  // would otherwise eat memory on every preview frame. 2400 px on the long
  // side is far more than any export needs.
  const url = URL.createObjectURL(file);
  try {
    const raw = await loadImage(url);
    const longest = Math.max(raw.naturalWidth, raw.naturalHeight);
    // Convert to a self-contained data URL at a capped size: the blob URL
    // must be revoked after loading, and a revoked blob would break the
    // slot thumbnail that reuses img.src. 2400 px on the long side is far
    // more than any export needs.
    const scale = longest > 2400 ? 2400 / longest : 1;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(raw.naturalWidth * scale));
    c.height = Math.max(1, Math.round(raw.naturalHeight * scale));
    c.getContext("2d").drawImage(raw, 0, 0, c.width, c.height);
    const img = await loadImage(c.toDataURL("image/jpeg", 0.92));
    setPanel(slotIndex, { img, name: file.name, zoom: 1, ox: 0, oy: 0 });
    state.selected = slotIndex;
    toast(`Foto dimuat ke panel ${slotIndex + 1}: ${file.name}`);
  } catch {
    toast("Foto itu tidak bisa dibaca — coba file lain.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function exportPNG(w, h) {
  const off = document.createElement("canvas");
  renderCover(off, state, w, h);
  const name = `neon-vice-cover-${w}x${h}.png`;
  off.toBlob((blob) => {
    if (!blob) {
      toast("Export gagal — coba lagi.");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Cover diekspor: ${name}`);
  }, "image/png");
}

function buildSlots() {
  const wrap = $("#slots");
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.slot = String(i);
    slot.innerHTML = `
      <div class="thumb">Contoh</div>
      <div class="slot-body">
        <span class="slot-name">Panel ${i + 1}</span>
        <label class="btn small">Pilih foto
          <input type="file" accept="image/*" hidden>
        </label>
        <button type="button" class="btn small ghost reset">Contoh</button>
      </div>`;
    slot.querySelector("input").addEventListener("change", (e) => {
      assignFile(i, e.target.files[0]);
      e.target.value = "";
    });
    slot.querySelector(".reset").addEventListener("click", () => {
      setPanel(i, { img: null, name: null, zoom: 1, ox: 0, oy: 0 });
      state.selected = i;
      toast(`Panel ${i + 1} kembali ke foto contoh.`);
    });
    slot.addEventListener("click", (e) => {
      if (e.target.closest("label,button,input")) return;
      state.selected = i;
      render();
    });
    wrap.appendChild(slot);
  }
}

function buildExportButtons() {
  const wrap = $("#exports");
  for (const size of EXPORT_SIZES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn export";
    b.textContent = `PNG ${size.label}`;
    b.addEventListener("click", () => exportPNG(size.w, size.h));
    wrap.appendChild(b);
  }
  const all = document.createElement("button");
  all.type = "button";
  all.className = "btn export primary";
  all.textContent = "Unduh ketiga ukuran sekaligus";
  all.addEventListener("click", () => {
    // Staggered so the browser treats each as its own user-gesture download.
    EXPORT_SIZES.forEach((size, i) => {
      setTimeout(() => exportPNG(size.w, size.h), i * 450);
    });
    toast("Mengekspor 3 ukuran…");
  });
  wrap.appendChild(all);
}

function stagePoint(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * stage.width,
    y: ((e.clientY - r.top) / r.height) * stage.height,
  };
}

function bindStage() {
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    const p = stagePoint(e);
    const idx = panelAt(state.layout, stage.width, stage.height, p.x, p.y);
    if (idx < 0) return;
    state.selected = idx;
    drag = { idx, x: p.x, y: p.y, ox: (state.panels[idx] || {}).ox || 0, oy: (state.panels[idx] || {}).oy || 0 };
    stage.setPointerCapture(e.pointerId);
    render();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = stagePoint(e);
    const w = stage.width;
    const h = stage.height;
    setPanel(drag.idx, {
      ox: drag.ox + (p.x - drag.x) / w,
      oy: drag.oy + (p.y - drag.y) / h,
    });
  });
  stage.addEventListener("pointerup", () => { drag = null; });
  stage.addEventListener("pointercancel", () => { drag = null; });
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const panel = state.panels[state.selected] || {};
    const zoom = Math.min(4, Math.max(0.5, (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.92)));
    setPanel(state.selected, { zoom });
  }, { passive: false });

  // Drag-and-drop a photo straight onto the cover: it lands in the panel
  // under the cursor, or the selected panel when dropped outside one.
  stage.addEventListener("dragover", (e) => { e.preventDefault(); stage.classList.add("dropping"); });
  stage.addEventListener("dragleave", () => stage.classList.remove("dropping"));
  stage.addEventListener("drop", (e) => {
    e.preventDefault();
    stage.classList.remove("dropping");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    const p = stagePoint(e);
    const idx = panelAt(state.layout, stage.width, stage.height, p.x, p.y);
    assignFile(idx >= 0 ? idx : state.selected, file);
  });
}

function bindControls() {
  document.querySelectorAll("[data-layout]").forEach((b) => {
    b.addEventListener("click", () => {
      state.layout = b.dataset.layout;
      if (state.selected >= panelCount(state.layout)) state.selected = 0;
      render();
    });
  });
  document.querySelectorAll("[data-grade]").forEach((b) => {
    b.addEventListener("click", () => { state.grade = b.dataset.grade; render(); });
  });
  $("#titleInput").addEventListener("input", (e) => { state.title = e.target.value; render(); });
  $("#subInput").addEventListener("input", (e) => { state.subtitle = e.target.value; render(); });
  $("#zoom").addEventListener("input", (e) => setPanel(state.selected, { zoom: Number(e.target.value) }));
  $("#panX").addEventListener("input", (e) => setPanel(state.selected, { ox: Number(e.target.value) }));
  $("#panY").addEventListener("input", (e) => setPanel(state.selected, { oy: Number(e.target.value) }));
  $("#helpBtn").addEventListener("click", () => $("#helpOverlay").classList.toggle("open"));
  $("#helpClose").addEventListener("click", () => $("#helpOverlay").classList.remove("open"));
  $("#resetCrop").addEventListener("click", () => {
    setPanel(state.selected, { zoom: 1, ox: 0, oy: 0 });
    toast(`Crop panel ${state.selected + 1} direset.`);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input,textarea")) return;
    if (e.key === "1" || e.key === "2" || e.key === "3") {
      state.layout = LAYOUTS[Number(e.key) - 1];
      if (state.selected >= panelCount(state.layout)) state.selected = 0;
      render();
    } else if (e.key.toLowerCase() === "g") {
      const names = Object.keys(GRADES);
      state.grade = names[(names.indexOf(state.grade) + 1) % names.length];
      render();
    } else if (e.key.toLowerCase() === "e") {
      exportPNG(1080, 1080);
    } else if (e.key.toLowerCase() === "r") {
      setPanel(state.selected, { zoom: 1, ox: 0, oy: 0 });
      toast(`Crop panel ${state.selected + 1} direset.`);
    } else if (e.key.toLowerCase() === "h") {
      $("#helpOverlay").classList.toggle("open");
    }
  });
}

// Handle used by shots.js and by the Playwright verification: a stable,
// scriptable way to drive the studio without touching the DOM by hand.
window.__studio = {
  state,
  render,
  exportPNG,
  async exportDataURL(w, h, type = "image/png", quality) {
    const off = document.createElement("canvas");
    renderCover(off, state, w, h);
    return off.toDataURL(type, quality);
  },
  async loadFileInto(slotIndex, file) { await assignFile(slotIndex, file); },
  setScene(scene) {
    if (scene.layout) state.layout = scene.layout;
    if (scene.grade) state.grade = scene.grade;
    if (scene.title !== undefined) state.title = scene.title;
    if (scene.subtitle !== undefined) state.subtitle = scene.subtitle;
    if (scene.title !== undefined) $("#titleInput").value = scene.title;
    if (scene.subtitle !== undefined) $("#subInput").value = scene.subtitle;
    render();
  },
};

async function init() {
  buildSlots();
  buildExportButtons();
  bindControls();
  bindStage();
  await loadSamples();
  render();
  window.__studioReady = true;
}

init();
