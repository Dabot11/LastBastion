import { TOWERS, WORLD, towerStats, upgradeCost, type TowerKind } from '../src/game/config';
import { gatePoint, placementError, samplePath, type Point, type GameMap } from '../src/game/path';
import { type Mission } from '../src/game/missions';
import { Simulation } from '../src/game/simulation';

export type Strategy = 'none' | 'opening-archers' | 'opening-crossbows' | 'opening-mixed' | 'archers' | 'crossbows' | 'mixed' | 'mixed-expand' | 'mixed-upgrades' | 'artillery' | 'arcane' | 'poor-positions';
export const STRATEGIES: Strategy[] = ['none', 'opening-archers', 'opening-crossbows', 'opening-mixed', 'archers', 'crossbows', 'mixed', 'mixed-expand', 'mixed-upgrades', 'artillery', 'arcane', 'poor-positions'];
export function strategiesForMission(mission: Mission): Strategy[] {
  return STRATEGIES.filter(s => (!s.includes('crossbows') || mission.towers.includes('crossbow')) && (s !== 'arcane' || mission.towers.includes('mage')) && (s !== 'artillery' || mission.towers.includes('cannon')));
}
interface Site extends Point { distances: number[]; }
const layouts = new WeakMap<GameMap, Map<number, Site[]>>();
function sites(map: GameMap, offset: number): Site[] {
  const known = layouts.get(map) ?? new Map<number, Site[]>(); layouts.set(map, known);
  if (!known.has(offset)) {
    const route: Point[] = []; for (let d = 0; d < map.length; d += .8) route.push(samplePath(d, map));
    const candidates: Site[] = [];
    for (let x = -15.75 + offset; x < 16; x += .75) for (let z = -11.5 + offset; z < 12; z += .75) {
      if (placementError({ x, z }, [], Number.MAX_SAFE_INTEGER, 0, map)) continue;
      candidates.push({ x, z, distances: route.map(p => (p.x - x) ** 2 + (p.z - z) ** 2) });
    }
    known.set(offset, candidates);
  }
  return known.get(offset)!;
}
function coverage(site: Site, range: number): number {
  return site.distances.reduce((score, d, i) => score + (d <= range * range ? 1.25 - .5 * i / site.distances.length : 0), 0);
}
function place(sim: Simulation, kind: TowerKind, candidates: Site[], poor: boolean): boolean {
  let best: Site | undefined, highest = -Infinity;
  for (const site of candidates) {
    if (placementError(site, sim.towers, sim.gold, TOWERS[kind].cost, sim.map)) continue;
    const covered = coverage(site, TOWERS[kind].range);
    const nearby = sim.towers.reduce((sum, t) => sum + Math.max(0, 1 - Math.hypot(site.x - t.x, site.z - t.z) / 6), 0);
    const attackPositions = [gatePoint(-.8, .85, sim.map), gatePoint(.8, .85, sim.map)];
    const coversGate = (p: Point, range: number) => attackPositions.every(gate => Math.hypot(p.x - gate.x, p.z - gate.z) < range - .2);
    const coveredGate = sim.towers.some(t => coversGate(t, towerStats(t.kind, t.level).range));
    const protectsGate = coversGate(site, TOWERS[kind].range);
    const score = poor ? -covered : covered / (1 + nearby * .45) + (!coveredGate && protectsGate ? 30 : 0);
    if (score > highest) { highest = score; best = site; }
  }
  if (!best) return false;
  const result = sim.build(kind, { x: best.x, z: best.z });
  if (typeof result === 'string') throw new Error(`Illegal purchase: ${result}`); return true;
}
function improve(sim: Simulation, candidates: Site[]): boolean {
  let bestId: number | undefined, highest = -Infinity;
  for (const t of sim.towers) {
    if (t.level >= 3 || upgradeCost(t.kind, t.level) > sim.gold) continue;
    const site = candidates.find(p => p.x === t.x && p.z === t.z)!;
    const current = towerStats(t.kind, t.level), next = towerStats(t.kind, t.level + 1);
    const score = (coverage(site, next.range) * next.damage / next.interval - coverage(site, current.range) * current.damage / current.interval) / upgradeCost(t.kind, t.level);
    if (score > highest) { highest = score; bestId = t.id; }
  }
  if (bestId === undefined) return false;
  const error = sim.upgrade(bestId); if (error) throw new Error(`Illegal upgrade: ${error}`); return true;
}
export interface WaveResult { wave: number; hp: number; gold: number; seconds: number; }
export interface BalanceResult {
  mission: string; strategy: Strategy; offset: number; phase: Simulation['phase']; hp: number; maxHp: number; stars: number;
  wave: number; kills: number; gold: number; spent: number; combatSeconds: number; minutesWithPreparation: number;
  towers: { kind: TowerKind; level: number; x: number; z: number }[]; waves: WaveResult[];
}
// Decisions are only made during preparation, with earned gold and legal build sites.
// Combat uses the same fixed 20 ms steps, projectiles, resistances and movement as the browser.
// No enemy HP, castle health, gold, queue or damage is manufactured by this runner.
export function scenarioPlanner(mission: Mission, strategy: Strategy, offset = 0): (sim: Simulation) => void {
  if (!strategiesForMission(mission).includes(strategy)) throw new Error(`${strategy} needs a defense locked in ${mission.id}`);
  const candidates = sites(mission.map, offset);
  const single: TowerKind = strategy.includes('crossbows') ? 'crossbow' : 'archer';
  const mixed = strategy.includes('mixed') || strategy === 'artillery' || strategy === 'arcane';
  // Establish cheap coverage before saving for a specialist; do not wait for a 500-gold cannon behind one archer.
  const preference: TowerKind[] = strategy === 'arcane' ? ['archer', 'archer', 'crossbow', 'mage', 'cannon'] : strategy === 'artillery' ? ['archer', 'archer', 'crossbow', 'cannon', 'mage'] : mission.towers;
  const order = mixed ? preference.filter(kind => mission.towers.includes(kind)) : [single];
  const frozen = strategy.startsWith('opening-'), poor = strategy === 'poor-positions';
  let purchases = 0;
  return sim => {
    if (sim.phase !== 'preparation' || sim.finished) return;
    if (strategy !== 'none' && (!frozen || sim.wave === 0)) {
      for (let decision = 0; decision < 100; decision++) {
        const expand = strategy === 'mixed-expand' || poor || sim.towers.length < (strategy === 'mixed-upgrades' ? 2 : 4);
        if (!expand && improve(sim, candidates)) continue;
        const kind = order[purchases % order.length];
        if (!place(sim, kind, candidates, poor)) break; purchases++;
      }
    }
  };
}
export function runScenario(mission: Mission, strategy: Strategy, offset = 0): BalanceResult {
  const sim = new Simulation(mission), plan = scenarioPlanner(mission, strategy, offset), waves: WaveResult[] = [];
  let combatSeconds = 0;
  while (!sim.finished && combatSeconds < 1200) {
    if (sim.phase === 'preparation') {
      plan(sim);
      sim.startWave();
    }
    const before = sim.phase; sim.update(.02); combatSeconds += .02;
    if (before === 'wave' && sim.phase !== 'wave') waves.push({ wave: sim.wave, hp: sim.castleHp, gold: sim.gold, seconds: Math.round(combatSeconds) });
    sim.events.length = 0;
  }
  return {
    mission: mission.id, strategy, offset, phase: sim.phase, hp: sim.castleHp, maxHp: sim.maxGateHp, stars: sim.stars, wave: sim.wave,
    kills: sim.kills, gold: sim.gold, spent: sim.towers.reduce((sum, t) => sum + t.invested, 0), combatSeconds: Math.round(combatSeconds),
    minutesWithPreparation: Math.round((combatSeconds + WORLD.preparation * sim.wave) / 60 * 10) / 10,
    towers: sim.towers.map(({ kind, level, x, z }) => ({ kind, level, x, z })), waves,
  };
}
