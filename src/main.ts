import './style.css';
import { TOWERS, type TowerKind } from './game/config';
import { Simulation } from './game/simulation';
import { MISSIONS } from './game/missions';
import { CampaignProgress } from './game/progress';
import { GameView } from './scene/view';
import { UI } from './ui';
import { AudioEffects } from './audio';

const root = document.getElementById('app')!;
let missionIndex = 0, sim = new Simulation(), paused = false, speed = 1;
let overlay: 'campaign' | 'help' | 'gameover' | 'victory' | null = 'campaign', finishedRecorded = false, missionActive = false;
let helpReturn: 'campaign' | null = null;
let progress: CampaignProgress;
try { progress = new CampaignProgress(localStorage); } catch { progress = new CampaignProgress(); }
const audio = new AudioEffects();
let view: GameView;
function cancel(): void { ui.selectedKind = null; ui.selectedId = null; view?.setGhost(null); if (view) view.selectedId = null; }
function select(kind: TowerKind): void {
  if (overlay || sim.finished) return;
  if (!sim.mission.towers.includes(kind)) { ui.toast('Completa misiones para desbloquear esta defensa'); return; }
  if (sim.gold < TOWERS[kind].cost) { ui.toast('No tienes suficiente oro'); return; }
  ui.selectedId = null; view.selectedId = null; ui.selectedKind = kind; view.setGhost(kind);
}
function startMission(index: number): void {
  if (!progress.isUnlocked(index)) { ui.toast('Primero defiende el castillo anterior'); return; }
  cancel(); missionIndex = index; sim = new Simulation(MISSIONS[index]);
  paused = false; speed = 1; finishedRecorded = false; missionActive = true; overlay = null;
  view.loadMap(sim.map); ui.hideOverlay(); ui.briefing(sim); ui.update(sim, paused, speed, null, progress);
}
function showCampaign(): void { cancel(); overlay = 'campaign'; ui.campaign(progress, missionActive ? sim : undefined); }
function showHelp(): void { if (overlay === 'victory' || overlay === 'gameover') return; helpReturn = overlay === 'campaign' ? 'campaign' : null; overlay = 'help'; ui.help(helpReturn === 'campaign'); }
function closeHelp(): void { if (helpReturn === 'campaign') showCampaign(); else { overlay = null; ui.hideOverlay(); } helpReturn = null; }
const ui = new UI(root, {
  select, cancel, mission: startMission, campaign: showCampaign, resume: () => { overlay = null; ui.hideOverlay(); }, nextMission: () => startMission(missionIndex + 1),
  pause: () => { if (!overlay && !sim.finished) paused = !paused; },
  speed: () => { speed = speed === 1 ? 2 : 1; }, sound: () => audio.toggle(),
  nextWave: () => { if (!overlay && sim.phase === 'preparation') { paused = false; sim.startWave(); } },
  upgrade: () => { if (ui.selectedId !== null) { const error = sim.upgrade(ui.selectedId); if (error) ui.toast(error); else ui.toast('Torre mejorada: más daño, alcance y velocidad'); } },
  sell: () => { if (ui.selectedId !== null) { const refund = sim.sell(ui.selectedId); ui.toast(`Torre vendida · +${refund} oro`); cancel(); } },
  help: showHelp, closeHelp,
  restart: () => startMission(missionIndex), resetCamera: () => view.resetCamera(), zoom: delta => view.zoom(delta),
}, progress);
try { view = new GameView(ui.board, sim.map); ui.setIcons(view.towerIcons()); }
catch (error) {
  root.innerHTML = '<main class="fatal"><h1>El reino necesita WebGL</h1><p>Activa la aceleración por hardware en tu navegador y vuelve a cargar la página.</p></main>';
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
  if (!click || overlay || sim.finished) return;
  view.setPointer(event);
  if (ui.selectedKind) {
    const error = view.placementMessage(sim); if (error || !view.hover) { ui.toast(error ?? 'Elige una plataforma'); return; }
    const tower = sim.build(ui.selectedKind, view.hover); if (typeof tower === 'string') ui.toast(tower); else ui.toast('Defensa construida');
  } else { const id = view.pickTower(event); ui.selectedId = id; view.selectedId = id; }
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('pointerleave', () => { if (!drag) view.hover = null; });
canvas.addEventListener('contextmenu', event => { event.preventDefault(); cancel(); });
canvas.addEventListener('wheel', event => { event.preventDefault(); if (!overlay) view.zoom(event.deltaY); }, { passive: false });
window.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (overlay) {
    if (event.key === 'Escape') { if (overlay === 'help') closeHelp(); else if (overlay === 'campaign' && missionActive && !sim.finished) { overlay = null; ui.hideOverlay(); } }
    return;
  }
  if (event.target instanceof Element && event.target.closest('button,a') && (event.code === 'Space' || event.key === 'Enter')) return;
  const kinds: TowerKind[] = ['archer', 'crossbow', 'mage', 'cannon'];
  if (event.key === 'Escape') cancel();
  if (event.key >= '1' && event.key <= '4') select(kinds[Number(event.key) - 1]);
  if (event.code === 'Space') { event.preventDefault(); if (!overlay && !sim.finished) paused = !paused; }
  if (event.key.toLowerCase() === 'm') ui.el('sound').click();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && !overlay && !sim.finished) paused = true; });
let last = performance.now(), uiAccumulator = 0, simulationAccumulator = 0;
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(.5, Math.max(0, (now - last) / 1000)); last = now;
  if (!paused && !overlay) {
    simulationAccumulator += dt * speed;
    while (simulationAccumulator >= .02) { sim.update(.02); simulationAccumulator -= .02; }
  } else simulationAccumulator = 0;
  if (sim.finished && !finishedRecorded) {
    finishedRecorded = true; cancel();
    if (sim.phase === 'victory') {
      overlay = 'victory'; const saved = progress.complete(missionIndex, sim.stars, sim.score);
      ui.victory(sim, progress, missionIndex, saved);
    } else { overlay = 'gameover'; ui.gameOver(sim); }
  }
  for (const event of sim.events) { audio.play(event); if (event.type === 'leak') ui.flashCastle(); }
  view.update(sim, paused || overlay ? 0 : dt * speed, now / 1000); sim.events.length = 0;
  uiAccumulator += dt;
  if (uiAccumulator >= .08) { ui.update(sim, paused, speed, view.placementMessage(sim), progress); uiAccumulator = 0; }
}
ui.update(sim, paused, speed, view.placementMessage(sim), progress); requestAnimationFrame(frame);
export { sim as simulation, view as battlefield };
