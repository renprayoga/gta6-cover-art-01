// Deterministic scene staging for screenshots.
//
// shots.js only *drives* the studio through window.__studio — it never
// draws anything itself. Each scene is a fixed layout + grade + caption, so
// re-running the screenshot pass reproduces the same four images.

const SCENES = {
  // 1-cover.jpg — the editor, poster layout, Neon Night, photos loaded.
  cover: { layout: "poster", grade: "neon", title: "Vice City", subtitle: "Leonida — 2026" },
  // 2-editor.jpg — duo layout, Sunset grade, controls visible.
  editor: { layout: "duo", grade: "sunset", title: "Vice City", subtitle: "Leonida — 2026" },
  // 3-cover.jpg — one exported cover, full bleed, Dusk grade.
  exported: { layout: "full", grade: "dusk", title: "Vice City", subtitle: "Leonida — 2026" },
  // 4-export.jpg — full bleed, Vapor grade, alternate caption.
  export: { layout: "full", grade: "vapor", title: "Grand Theft Auto VI", subtitle: "Selamat datang di Leonida" },
};

function applyScene(name) {
  const scene = SCENES[name];
  if (!scene || !window.__studio) return false;
  window.__studio.setScene(scene);
  document.body.dataset.scene = name;
  return true;
}

// `?shot=cover` hides the editing chrome so the shot is the cover itself.
function applyShotParam() {
  const shot = new URLSearchParams(location.search).get("shot");
  if (shot) {
    document.body.classList.add("shot-mode");
    applyScene(shot);
  }
}

window.__shots = { scenes: SCENES, applyScene };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyShotParam);
} else {
  applyShotParam();
}
