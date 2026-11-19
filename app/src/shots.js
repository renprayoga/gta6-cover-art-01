// Fixed scenes for screenshots: ?shot=editor shows the editor with the sample
// photos loaded; ?shot=cover shows the exported cover alone, drawn by the
// app itself at the chosen export size. Query params pick the scene:
// layout, grade, size, caption, subtitle, panel, zoom, ox, oy.
// window.__shotReady is set once the scene has painted.
import { renderCover } from './cover.js';

export async function runShot(shot, query, state, api) {
  if (query.get('caption') !== null) state.title = query.get('caption');
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');
  const panel = Number(query.get('panel') ?? 0);
  if (panel >= 0 && panel < state.panels.length) state.selectedPanel = panel;
  const zoom = Number(query.get('zoom') ?? NaN);
  if (!Number.isNaN(zoom)) state.panels[state.selectedPanel].zoom = zoom;
  const ox = Number(query.get('ox') ?? NaN);
  if (!Number.isNaN(ox)) state.panels[state.selectedPanel].ox = ox;
  const oy = Number(query.get('oy') ?? NaN);
  if (!Number.isNaN(oy)) state.panels[state.selectedPanel].oy = oy;

  await api.loadSamples();
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('cover');
    renderCover(canvas, state);
    const scale = Math.min(innerWidth / canvas.width, innerHeight / canvas.height);
    canvas.style.width = `${Math.round(canvas.width * scale)}px`;
    canvas.style.height = `${Math.round(canvas.height * scale)}px`;
  } else {
    api.redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
