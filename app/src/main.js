// Neon Vice Cover Studio — wires the page: photo slots, caption, layout,
// grade and size pickers, live preview, drag-to-pan and wheel-to-zoom on the
// preview, and one-click PNG export. Photos are read on the machine with
// FileReader / object URLs and never uploaded anywhere. A `?shot=` query sets
// up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderCover, EXPORT_SIZES, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const MAX_PHOTOS = 4;

/** The whole cover state; one object, passed straight to drawCover. */
export const state = {
  layout: 'poster',
  grade: 'sunset',
  size: 'wide',
  title: 'Sunset Heist',
  subtitle: 'Neon Coast',
  photos: [null, null, null, null],
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
  ],
  selectedPanel: 0,
};

let statusTimer = null;
export function setStatus(msg) {
  statusEl.textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 6000);
}

/** Redraws the live preview at a small, fast size (same drawCover as export). */
export function redraw() {
  const size = EXPORT_SIZES[state.size] || EXPORT_SIZES.square;
  const previewW = 640;
  const previewH = Math.round((previewW * size.h) / size.w);
  canvas.width = previewW;
  canvas.height = previewH;
  drawCover(canvas.getContext('2d'), state, previewW, previewH);
  syncPickers();
  syncPanelControls();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not read that image'));
    img.src = url;
  });
}

async function loadFileIntoSlot(file, slot) {
  if (!file || !/^image\//.test(file.type || '')) {
    setStatus('That file is not an image — try a JPG or PNG photo.');
    return false;
  }
  try {
    const img = await loadImage(URL.createObjectURL(file));
    state.photos[slot] = img;
    state.panels.forEach((p) => { if (p.photo === slot) { p.zoom = 1; p.ox = 0; p.oy = 0; } });
    refreshSlots();
    redraw();
    setStatus(`Photo ${slot + 1} loaded — drag it on the cover to position it.`);
    return true;
  } catch {
    setStatus('Could not read that photo — it may be damaged. Try another file.');
    return false;
  }
}

/** Rebuilds the four photo-slot thumbnails from state.photos. */
export function refreshSlots() {
  const wrap = $('slots');
  wrap.innerHTML = '';
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot' + (state.photos[i] ? ' filled' : '');
    slot.dataset.slot = i;
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (state.photos[i]) {
      thumb.style.backgroundImage = `url(${state.photos[i].src})`;
    } else {
      thumb.textContent = '+';
    }
    const label = document.createElement('span');
    label.textContent = `Photo ${i + 1}`;
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'mini';
    pick.textContent = state.photos[i] ? 'Replace' : 'Choose';
    pick.addEventListener('click', () => $(`file-${i}`).click());
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'mini ghost';
    clear.textContent = 'Clear';
    clear.disabled = !state.photos[i];
    clear.addEventListener('click', () => {
      state.photos[i] = null;
      state.panels.forEach((p) => { if (p.photo === i) { p.zoom = 1; p.ox = 0; p.oy = 0; } });
      refreshSlots();
      redraw();
    });
    slot.append(thumb, label, pick, clear);
    slot.addEventListener('click', (e) => {
      if (e.target === pick || e.target === clear) return;
      selectPanelForPhoto(i);
    });
    wrap.append(slot);
  }
}

/** Picks the first panel showing photo `i` (or panel 0) for crop controls. */
function selectPanelForPhoto(i) {
  const idx = state.panels.findIndex((p) => p.photo === i);
  state.selectedPanel = idx === -1 ? 0 : idx;
  syncPanelControls();
  document.querySelectorAll('.slot').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.slot) === i);
  });
}

/** Syncs the zoom / pan sliders with the selected panel's transform. */
export function syncPanelControls() {
  const t = state.panels[state.selectedPanel] || state.panels[0];
  $('zoom').value = t.zoom;
  $('pan-x').value = t.ox;
  $('pan-y').value = t.oy;
  $('zoom-val').textContent = `${Math.round(t.zoom * 100)}%`;
  $('panel-label').textContent = `Panel ${state.selectedPanel + 1} — photo ${t.photo + 1}`;
  document.querySelectorAll('.panel-pick').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.panel) === state.selectedPanel);
  });
}

/** Builds one row of toggle buttons (layout / grade / size / panels). */
function buildToggles(containerId, entries, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  entries.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toggle' + (key === current ? ' on' : '');
    b.dataset.key = key;
    b.dataset.group = containerId;
    b.textContent = label;
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.toggle').forEach((el) => el.classList.remove('on'));
      b.classList.add('on');
      redraw();
    });
    box.append(b);
  });
}

/** Re-highlights the layout / grade / size toggles from the current state. */
export function syncPickers() {
  const groups = { 'layout-pick': state.layout, 'grade-pick': state.grade, 'size-pick': state.size };
  for (const [id, current] of Object.entries(groups)) {
    document.querySelectorAll(`#${id} .toggle`).forEach((el) => {
      el.classList.toggle('on', el.dataset.key === current);
    });
  }
}

function buildPickers() {
  buildToggles('layout-pick', Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]),
    state.layout, (k) => { state.layout = k; });
  buildToggles('grade-pick', Object.entries(GRADES).map(([k, v]) => [k, v.label]),
    state.grade, (k) => { state.grade = k; });
  buildToggles('size-pick', Object.entries(EXPORT_SIZES).map(([k, v]) => [k, v.label]),
    state.size, (k) => { state.size = k; });

  const panels = $('panel-pick');
  panels.innerHTML = '';
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toggle panel-pick';
    b.dataset.panel = i;
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { state.selectedPanel = i; syncPanelControls(); });
    panels.append(b);
  }
}

function wireInputs() {
  for (let i = 0; i < MAX_PHOTOS; i++) {
    $(`file-${i}`).addEventListener('change', (e) => {
      loadFileIntoSlot(e.target.files[0], i);
      e.target.value = '';
    });
  }
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value);
    redraw();
  });
  $('pan-x').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].ox = Number(e.target.value);
    redraw();
  });
  $('pan-y').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].oy = Number(e.target.value);
    redraw();
  });
  $('reset-crop').addEventListener('click', () => {
    state.panels[state.selectedPanel] = { ...state.panels[state.selectedPanel], zoom: 1, ox: 0, oy: 0 };
    redraw();
  });
  $('sample-btn').addEventListener('click', async () => {
    await loadSamples();
    setStatus('Sample photos loaded — swap in your own any time.');
  });
  $('export').addEventListener('click', exportPng);
  $('download-link').addEventListener('click', exportPng);

  // Drag a photo file straight onto the cover: it fills the selected panel.
  canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drop'); });
  canvas.addEventListener('dragleave', () => canvas.classList.remove('drop'));
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    canvas.classList.remove('drop');
    const file = e.dataTransfer.files[0];
    if (file) loadFileIntoSlot(file, state.panels[state.selectedPanel].photo);
  });

  // Drag on the cover pans the selected panel; the wheel zooms it.
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const t = state.panels[state.selectedPanel];
    const r = canvas.getBoundingClientRect();
    t.ox = Math.max(-0.5, Math.min(0.5, t.ox + (e.clientX - dragging.x) / r.width));
    t.oy = Math.max(-0.5, Math.min(0.5, t.oy + (e.clientY - dragging.y) / r.height));
    dragging = { x: e.clientX, y: e.clientY };
    redraw();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const t = state.panels[state.selectedPanel];
    t.zoom = Math.max(1, Math.min(3, t.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    redraw();
  }, { passive: false });
}

/** Exports the cover at the chosen size as a PNG download. */
export function exportPng() {
  const off = document.createElement('canvas');
  const size = renderCover(off, state);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed in this browser — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${size.w}x${size.h}.png — share it anywhere.`);
    window.__exported = { w: size.w, h: size.h, name: a.download };
  }, 'image/png');
}

/** Loads the two bundled sample photos into slots 1 and 2. */
export async function loadSamples() {
  const [pier, boulevard] = await Promise.all([
    loadImage('samples/pier.jpg').catch(() => null),
    loadImage('samples/boulevard.jpg').catch(() => null),
  ]);
  if (pier) state.photos[0] = pier;
  if (boulevard) state.photos[1] = boulevard;
  refreshSlots();
  redraw();
}

buildPickers();
wireInputs();
refreshSlots();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, { loadImage, loadSamples, redraw, exportPng });
} else {
  loadSamples();
}
