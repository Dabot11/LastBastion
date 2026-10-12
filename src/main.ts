import './style.css';
import { TOWERS, type TowerKind } from './game/config';
import { Simulation } from './game/simulation';
import { GameView } from './scene/view';
import { UI } from './ui';
import { AudioEffects } from './audio';

const root = document.getElementById('app')!;
let sim = new Simulation(), paused = false, speed = 1, overlay: 'intro' | 'help' | 'gameover' | null = 'intro';
let record = 0, reachedWave = 0, overRecorded = false;
try { const saved: unknown = JSON.parse(localStorage.getItem('last-bastion-record') ?? '{}'); if (saved && typeof saved === 'object' && 'score' in saved && typeof saved.score === 'number') record = Math.max(0, saved.score); if (saved && typeof saved === 'object' && 'wave' in saved && typeof saved.wave === 'number') reachedWave = Math.max(0, saved.wave); } catch { /* Storage is optional, including private browsing. */ }
const audio = new AudioEffects();
let view: GameView;
function cancel(): void { ui.selectedKind = null; ui.selectedId = null; view?.setGhost(null); if (view) view.selectedId = null; }
function select(kind: TowerKind): void {
  if (overlay || sim.phase === 'gameover') return;
  if (sim.gold < TOWERS[kind].cost) { ui.toast('No tienes suficiente oro'); return; }
  ui.selectedId = null; view.selectedId = null; ui.selectedKind = kind; view.setGhost(kind);
}
function restart(): void { sim = new Simulation(); paused = false; speed = 1; overRecorded = false; overlay = null; cancel(); ui.hideOverlay(); view.resetCamera(); }
const ui = new UI(root, {
  select, cancel,
  pause: () => { if (!overlay && sim.phase !== 'gameover') paused = !paused; },
  speed: () => { speed = speed === 1 ? 2 : 1; },
  sound: () => audio.toggle(),
  nextWave: () => { if (!overlay && !paused) sim.startWave(); else if (paused) ui.toast('Reanuda la partida para iniciar la oleada'); },
  upgrade: () => { if (ui.selectedId !== null) { const error = sim.upgrade(ui.selectedId); if (error) ui.toast(error); else ui.toast('Torre mejorada: más daño, alcance y velocidad'); } },
  sell: () => { if (ui.selectedId !== null) { const refund = sim.sell(ui.selectedId); ui.toast(`Torre vendida · +${refund} oro`); cancel(); } },
  begin: () => { overlay = null; ui.hideOverlay(); },
  help: () => { if (overlay === 'gameover') return; overlay = 'help'; ui.help(); },
  closeHelp: () => { overlay = null; ui.hideOverlay(); },
  restart, resetCamera: () => view.resetCamera(),
});
try { view = new GameView(ui.board); ui.setIcons(view.towerIcons()); }
catch (error) {
  root.innerHTML = '<main class="fatal"><h1>El valle necesita WebGL</h1><p>No se pudo iniciar el renderizado 3D. Activa la aceleración por hardware en tu navegador y vuelve a cargar la página.</p></main>';
  console.error('No se pudo iniciar Three.js', error); throw error;
}
const canvas = view.renderer.domElement;
let drag: { x: number; y: number; lastX: number; lastY: number; moved: boolean; pointerId: number; button: number } | null = null;
canvas.addEventListener('pointermove', event => {
  view.setPointer(event);
  if (drag) {
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
    if (drag.moved && !ui.selectedKind && !overlay) view.panBy(event.clientX - drag.lastX, event.clientY - drag.lastY);
    drag.lastX = event.clientX; drag.lastY = event.clientY;
  }
});
canvas.addEventListener('pointerdown', event => {
  if (overlay || event.button === 2) return;
  drag = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false, pointerId: event.pointerId, button: event.button };
  canvas.setPointerCapture(event.pointerId); view.setPointer(event);
});
canvas.addEventListener('pointerup', event => {
  if (!drag) return; const click = !drag.moved && drag.button === 0; canvas.releasePointerCapture(drag.pointerId); drag = null;
  if (!click || overlay || sim.phase === 'gameover') return;
  view.setPointer(event);
  if (ui.selectedKind) {
    const error = view.placementMessage(sim); if (error || !view.hover) { ui.toast(error ?? 'Elige una plataforma'); return; }
    const tower = sim.build(ui.selectedKind, view.hover); if (typeof tower === 'string') ui.toast(tower); else ui.toast('Defensa construida');
  } else {
    const id = view.pickTower(event); ui.selectedId = id; view.selectedId = id;
  }
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('pointerleave', () => { if (!drag) view.hover = null; });
canvas.addEventListener('contextmenu', event => { event.preventDefault(); cancel(); });
canvas.addEventListener('wheel', event => { event.preventDefault(); if (!overlay) view.zoom(event.deltaY); }, { passive: false });
window.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const kinds: TowerKind[] = ['archer', 'crossbow', 'cannon', 'mage'];
  if (event.key === 'Escape') { if (overlay === 'help') { overlay = null; ui.hideOverlay(); } else cancel(); }
  if (event.key >= '1' && event.key <= '4') select(kinds[Number(event.key) - 1]);
  if (event.code === 'Space') { event.preventDefault(); if (!overlay && sim.phase !== 'gameover') paused = !paused; }
  if (event.key.toLowerCase() === 'm') ui.el('sound').click();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && !overlay && sim.phase !== 'gameover') paused = true; });
let last = performance.now(), uiAccumulator = 0, simulationAccumulator = 0;
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(.5, Math.max(0, (now - last) / 1000)); last = now;
  if (!paused && !overlay) {
    simulationAccumulator += dt * speed;
    while (simulationAccumulator >= .02) { sim.update(.02); simulationAccumulator -= .02; }
  } else simulationAccumulator = 0;
  if (sim.phase === 'gameover' && !overRecorded) {
    overRecorded = true; overlay = 'gameover'; const newRecord = sim.score > record;
    record = Math.max(record, sim.score); reachedWave = Math.max(reachedWave, sim.wave);
    try { localStorage.setItem('last-bastion-record', JSON.stringify({ score: record, wave: reachedWave })); } catch { ui.toast('El navegador no permite guardar el récord'); }
    cancel(); ui.gameOver(sim, record, newRecord);
  }
  for (const event of sim.events) audio.play(event);
  view.update(sim, paused || overlay ? 0 : dt * speed, now / 1000); sim.events.length = 0;
  uiAccumulator += dt;
  if (uiAccumulator >= .08) { ui.update(sim, paused, speed, view.placementMessage(sim), record); uiAccumulator = 0; }
}
ui.update(sim, paused, speed, view.placementMessage(sim), record); requestAnimationFrame(frame);

// A live module binding also allows integration tests to advance the real simulation deterministically.
export { sim as simulation };
