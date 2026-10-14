import { TOWERS, towerStats, upgradeCost, type TowerKind } from './config';
import { distance, gatePoint, type BuildPad } from './path';
import type { Simulation, Tower } from './simulation';

export function coversGate(sim: Simulation, tower: Tower): boolean {
  return [-.8, .8].every(x => distance(tower, gatePoint(x, .85, sim.map)) <= towerStats(tower.kind, tower.level).range);
}
export function gateIsProtected(sim: Simulation): boolean { return sim.towers.some(t => coversGate(sim, t)); }
export function recommendedGatePad(sim: Simulation): BuildPad | null {
  if (sim.finished || sim.phase !== 'preparation' || gateIsProtected(sim) || sim.gold < TOWERS.precision.cost) return null;
  return sim.map.pads.find(p => p.progress === sim.map.length - 1 && !sim.towers.some(t => t.padId === p.id)) ?? null;
}
export interface Guidance { text: string; target: 'build' | 'precision' | 'pad' | 'tower' | 'upgrade' | 'wave'; }
export function nextGuidance(sim: Simulation, selectedKind: TowerKind | null, selectedId: number | null, menuOpen: boolean): Guidance | null {
  if (sim.finished || sim.phase !== 'preparation') return null;
  if (recommendedGatePad(sim)) {
    if (selectedKind) return { text: 'Toca la base iluminada junto a la puerta. Tú eliges dónde construir.', target: 'pad' };
    if (menuOpen) return { text: 'Elige Precisión para defender la puerta.', target: 'precision' };
    return { text: 'Empieza junto a la puerta: conservar su salud te da más estrellas.', target: 'build' };
  }
  if (sim.mission.id === 'market' && sim.wave > 0) {
    const eligible = (t: Tower) => t.level === 1 && upgradeCost(t.kind, t.level) <= sim.gold;
    const tower = sim.towers.find(t => t.id === selectedId && eligible(t)) ?? sim.towers.find(eligible);
    if (tower && sim.towers.every(t => t.level === 1)) return selectedId === tower.id
      ? { text: 'Toca Mejorar para darle más potencia y alcance.', target: 'upgrade' }
      : { text: 'Toca una defensa para mejorarla con el oro ganado.', target: 'tower' };
  }
  return { text: sim.wave === 0 ? '¡Listo! Inicia la oleada cuando quieras. Puedes construir otra defensa.' : 'Prepara tus defensas y empieza la siguiente oleada.', target: 'wave' };
}
