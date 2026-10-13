import { WORLD } from './config';
export interface Point { x: number; z: number; }
export const PAD_RADIUS = 1.08;
export const PAD_HEIGHT = .14;
export interface BuildPad extends Point { id: string; progress: number; }
export function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.z - b.z); }
// One ordered route, from the southeastern cave to the northwestern castle gate.
const corners: Point[] = [
  { x: 12.5, z: 10.5 }, { x: 7.5, z: 8.5 }, { x: -9, z: 8.5 },
  { x: -12, z: 5 }, { x: -9, z: 1.5 }, { x: 9, z: 1.5 },
  { x: 12, z: -2 }, { x: 9, z: -5.5 }, { x: -8, z: -5.5 },
  { x: -11.5, z: -8.8 },
];
// Round turns into explicit, closely spaced waypoints. The simulation traverses every segment.
function roundedPath(corners: Point[]): Point[] {
  const points: Point[] = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const a = corners[i - 1], b = corners[i], c = corners[i + 1];
    const radius = Math.min(1.25, distance(a, b) / 3, distance(b, c) / 3);
    const p = { x: b.x + (a.x - b.x) * radius / distance(a, b), z: b.z + (a.z - b.z) * radius / distance(a, b) };
    const q = { x: b.x + (c.x - b.x) * radius / distance(b, c), z: b.z + (c.z - b.z) * radius / distance(b, c) };
    points.push(p);
    for (let j = 1; j <= 10; j++) { const t = j / 10; points.push({ x: (1 - t) ** 2 * p.x + 2 * (1 - t) * t * b.x + t * t * q.x, z: (1 - t) ** 2 * p.z + 2 * (1 - t) * t * b.z + t * t * q.z }); }
  }
  points.push(corners.at(-1)!); return points;
}
export interface GameMap {
  path: Point[]; segments: { start: Point; end: Point; length: number }[]; length: number;
  obstacles: Obstacle[]; torches: Point[]; fences: Point[];
  pads: BuildPad[];
  grass: number; sand: number; theme: 'forest' | 'village' | 'citadel'; gateAngle: number;
}
export function samplePath(progress: number, map: GameMap = DEFAULT_MAP): Point & { angle: number } {
  let remaining = Math.max(0, progress);
  for (const s of map.segments) {
    if (remaining <= s.length) { const t = remaining / s.length; return { x: s.start.x + (s.end.x - s.start.x) * t, z: s.start.z + (s.end.z - s.start.z) * t, angle: Math.atan2(s.end.x - s.start.x, s.end.z - s.start.z) }; }
    remaining -= s.length;
  }
  const last = map.segments.at(-1)!; return { ...last.end, angle: Math.atan2(last.end.x - last.start.x, last.end.z - last.start.z) };
}
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return distance(p, { x: a.x + dx * t, z: a.z + dz * t });
}
export function roadDistance(p: Point, map: GameMap = DEFAULT_MAP): number {
  let nearest = Infinity;
  for (const s of map.segments) nearest = Math.min(nearest, segmentDistance(p, s.start, s.end));
  return nearest;
}
// The gate is the route endpoint. Local +z faces the arriving army; the entire fortress lies behind it.
export function gateLocal(p: Point, map: GameMap): Point {
  const gate = map.path.at(-1)!, dx = p.x - gate.x, dz = p.z - gate.z;
  return { x: dx * Math.cos(map.gateAngle) - dz * Math.sin(map.gateAngle), z: dx * Math.sin(map.gateAngle) + dz * Math.cos(map.gateAngle) };
}
export function gatePoint(x: number, z: number, map: GameMap): Point {
  const gate = map.path.at(-1)!;
  return { x: gate.x + x * Math.cos(map.gateAngle) + z * Math.sin(map.gateAngle), z: gate.z - x * Math.sin(map.gateAngle) + z * Math.cos(map.gateAngle) };
}
export function castleSpace(p: Point, map: GameMap, margin = 0): boolean {
  const local = gateLocal(p, map);
  return Math.abs(local.x) < 5.6 + margin && local.z < .45 + margin && local.z > -10.3 - margin;
}
export function gateDefenceSites(map: GameMap): Point[] { return [-3.25, 3.25].map(x => gatePoint(x, 2.15, map)); }
export function roadHeight(p: Point, map: GameMap): number {
  const t = Math.max(0, Math.min(1, (6.5 - distance(p, map.path.at(-1)!)) / 6.5));
  // A gently rising approach meets the wooden threshold at plateau height.
  return .13 + (WORLD.elevation + .05 - .13) * t * t * (3 - 2 * t);
}
export interface Obstacle extends Point { radius: number; type: 'tree' | 'rock' | 'house'; }
export function createMap(points: Point[], initialSeed: number, theme: GameMap['theme'] = 'forest'): GameMap {
  const destination = points.at(-1)!;
  const gate = { x: destination.x, z: destination.z - 3.2 };
  const path = roundedPath([{ x: 22, z: 14.8 }, { x: 19.3, z: 15.4 }, ...points.slice(0, -1), { x: gate.x, z: gate.z + 5.5 }, gate]), segments = path.slice(1).map((end, i) => ({ start: path[i], end, length: distance(path[i], end) }));
  const last = segments.at(-1)!;
  const gateAngle = Math.atan2(last.start.x - last.end.x, last.start.z - last.end.z);
  const map: GameMap = { path, segments, length: segments.reduce((s, p) => s + p.length, 0), obstacles: [], torches: [], fences: [], pads: [], grass: theme === 'village' ? 0xb1b274 : theme === 'citadel' ? 0x86a69a : 0x8fa965, sand: theme === 'citadel' ? 0xc0b39a : 0xcba876, theme, gateAngle };
  map.pads = chooseBuildPads(map);
  let seed = initialSeed;
  const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 170; i++) {
    const p = { x: (random() - .5) * 28.2, z: (random() - .5) * 24.2 };
    const roll = random(); const type: Obstacle['type'] = ((theme === 'village' && roll < .14) || (theme === 'citadel' && roll < .18)) ? 'house' : roll < (theme === 'citadel' ? .4 : .82) ? 'tree' : 'rock';
    const radius = type === 'house' ? .95 : .38;
    if (roadDistance(p, map) > radius + 2.1 && !castleSpace(p, map, radius + 1) && !map.pads.some(site => distance(p, site) < obstacleRadius({ ...p, radius, type }, map.obstacles.length) + PAD_RADIUS + .24) && distance(p, path.at(-1)!) > radius + 3.6 && distance(p, path[0]) > radius + 3.8 && !map.obstacles.some(o => distance(p, o) < o.radius + radius + .35)) map.obstacles.push({ ...p, radius, type });
  }
  map.torches = [{ x: -9, z: -3.3 }, { x: 9, z: 5.3 }, { x: -11, z: 8 }, { x: 9, z: -7.4 }].filter(p => roadDistance(p, map) > 2 && distance(p, path.at(-1)!) > 4 && !map.pads.some(site => distance(p, site) < PAD_RADIUS + .5) && !map.obstacles.some(o => distance(p, o) < o.radius + .4));
  map.fences = [{ x: -3, z: -7.4 }, { x: 1, z: 3.5 }, { x: -3, z: 6.5 }, { x: 4, z: -3.5 }].filter(p => roadDistance(p, map) > 2 && !map.pads.some(site => segmentDistance(site, { x: p.x - .8, z: p.z }, { x: p.x + .8, z: p.z }) < PAD_RADIUS + .25) && !map.obstacles.some(o => distance(p, o) < o.radius + .9));
  return map;
}
export const DEFAULT_MAP = createMap(corners, 421);
export const PATH = DEFAULT_MAP.path, SEGMENTS = DEFAULT_MAP.segments, PATH_LENGTH = DEFAULT_MAP.length;
export const OBSTACLES = DEFAULT_MAP.obstacles, TORCHES = DEFAULT_MAP.torches, FENCES = DEFAULT_MAP.fences;
export type PlacementCode = 'terrain' | 'road' | 'castle' | 'entrance' | 'obstacle' | 'torch' | 'fence' | 'tower' | 'gold' | 'invalid' | 'pad' | 'occupied';
export interface PlacementIssue { code: PlacementCode; message: string; brief: string; }
const PLACEMENT_ISSUES: Record<PlacementCode, PlacementIssue> = {
  terrain: { code: 'terrain', message: 'Construye dentro del terreno', brief: 'Fuera del terreno de construcción' },
  road: { code: 'road', message: 'El camino debe quedar libre', brief: 'Sobre el camino' },
  castle: { code: 'castle', message: 'Esta zona pertenece al castillo', brief: 'Zona del castillo' },
  entrance: { code: 'entrance', message: 'La entrada enemiga debe quedar libre', brief: 'Entrada de enemigos' },
  obstacle: { code: 'obstacle', message: 'Hay un edificio, árbol o roca en esta ubicación', brief: 'Obstáculo · Árbol, roca o edificio' },
  torch: { code: 'torch', message: 'Hay una antorcha en esta ubicación', brief: 'Obstáculo · Antorcha' },
  fence: { code: 'fence', message: 'Hay una valla en esta ubicación', brief: 'Obstáculo · Valla' },
  tower: { code: 'tower', message: 'Demasiado cerca de otra torre', brief: 'Demasiado cerca de otra defensa' },
  gold: { code: 'gold', message: 'No tienes suficiente oro', brief: 'No tienes suficiente oro' },
  invalid: { code: 'invalid', message: 'Ubicación inválida', brief: 'Ubicación inválida' },
  pad: { code: 'pad', message: 'Construye sobre una base hexagonal', brief: 'Selecciona una base hexagonal' },
  occupied: { code: 'occupied', message: 'Esta base ya tiene una defensa', brief: 'Base ocupada' },
};
// Match the visible solid props. Tiny flowers, grass, ferns and road pebbles have no collision.
export function obstacleRadius(o: Obstacle, index: number): number {
  return Math.max(o.radius, o.type === 'tree' ? .67 * (.78 + (index % 5) * .06) : o.type === 'rock' ? .46 : .95);
}
export function towerClearance(p: Point, towers: Point[]): number {
  let clearance = Infinity;
  for (const t of towers) clearance = Math.min(clearance, distance(p, t) - (WORLD.towerRadius * 2 + .15));
  return clearance;
}
// Each clearance is a 1-Lipschitz signed distance (negative means blocked).
// Pad planning and construction validation share the same complete-footprint constraints.
function placementClearances(p: Point, towers: Point[], map: GameMap): Record<'terrain' | 'road' | 'castle' | 'entrance' | 'obstacle' | 'torch' | 'fence' | 'tower', number> {
  const local = gateLocal(p, map), margin = WORLD.towerRadius + .42;
  let obstacle = Infinity, torch = Infinity, fence = Infinity;
  for (const [i, o] of map.obstacles.entries()) obstacle = Math.min(obstacle, distance(p, o) - obstacleRadius(o, i) - WORLD.towerRadius);
  for (const o of map.torches) torch = Math.min(torch, distance(p, o) - WORLD.towerRadius - .35);
  for (const o of map.fences) fence = Math.min(fence, segmentDistance(p, { x: o.x - .8, z: o.z }, { x: o.x + .8, z: o.z }) - WORLD.towerRadius - .1);
  return {
    terrain: Math.min(WORLD.width / 2 - 1 - Math.abs(p.x), WORLD.depth / 2 - 1 - Math.abs(p.z)),
    road: Math.min(roadDistance(p, map) - (WORLD.roadHalfWidth + WORLD.towerRadius + .65), Math.max(Math.abs(local.x) - 2.1 - WORLD.towerRadius, Math.abs(local.z - 1.6) - 1.65 - WORLD.towerRadius)),
    castle: Math.min(distance(p, map.path.at(-1)!) - 3.2, Math.max(Math.abs(local.x) - 5.6 - margin, local.z - .45 - margin, -10.3 - margin - local.z)),
    entrance: distance(p, map.path[0]) - 2.8,
    obstacle, torch, fence, tower: towerClearance(p, towers),
  };
}
export function terrainClearance(p: Point, towers: Point[], map: GameMap = DEFAULT_MAP): number {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return -Infinity;
  return Math.min(...Object.values(placementClearances(p, towers, map)));
}
export function terrainPlacementIssue(p: Point, towers: Point[], gold: number, cost: number, map: GameMap = DEFAULT_MAP): PlacementIssue | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return PLACEMENT_ISSUES.invalid;
  const clearances = placementClearances(p, towers, map);
  for (const code of Object.keys(clearances) as (keyof typeof clearances)[]) if (clearances[code] < 0) return PLACEMENT_ISSUES[code];
  return gold < cost ? PLACEMENT_ISSUES.gold : null;
}
export function placementError(p: Point, towers: Point[], gold: number, cost: number, map: GameMap = DEFAULT_MAP): string | null {
  return placementIssue(p, towers, gold, cost, map)?.message ?? null;
}
export function terrainPlacementError(p: Point, towers: Point[], gold: number, cost: number, map: GameMap = DEFAULT_MAP): string | null {
  return terrainPlacementIssue(p, towers, gold, cost, map)?.message ?? null;
}
export function padAt(p: Point, map: GameMap): BuildPad | null {
  // A small hit margin makes the stone rim easy to select on touch screens.
  const radius = PAD_RADIUS + .12;
  return map.pads.find(site => {
    const x = Math.abs(p.x - site.x), z = Math.abs(p.z - site.z);
    return z <= radius * Math.sqrt(3) / 2 && x <= radius - z / Math.sqrt(3);
  }) ?? null;
}
export function placementIssue(p: Point, towers: Point[], gold: number, cost: number, map: GameMap = DEFAULT_MAP): PlacementIssue | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return PLACEMENT_ISSUES.invalid;
  const pad = padAt(p, map);
  if (!pad) return terrainPlacementIssue(p, towers, gold, cost, map) ?? PLACEMENT_ISSUES.pad;
  if (towers.some(t => distance(t, pad) < .1)) return PLACEMENT_ISSUES.occupied;
  return terrainPlacementIssue(pad, towers, gold, cost, map);
}
function chooseBuildPads(map: GameMap): BuildPad[] {
  const pads: BuildPad[] = [], candidates: BuildPad[] = [], route: Point[] = [];
  const inset = PAD_RADIUS - WORLD.towerRadius + .055;
  for (let progress = 7; progress < map.length - 4; progress += 1.2) {
    const p = samplePath(progress, map);
    if (Math.abs(p.x) < WORLD.width / 2 && Math.abs(p.z) < WORLD.depth / 2) route.push(p);
    for (const offset of [2.95, 3.25, 3.55]) for (const side of [-1, 1]) {
      const site = { x: p.x + Math.cos(p.angle) * offset * side, z: p.z - Math.sin(p.angle) * offset * side, progress, id: '' };
      if (terrainClearance(site, [], map) >= inset) candidates.push(site);
    }
  }
  for (const site of gateDefenceSites(map)) pads.push({ ...site, id: '', progress: map.length - 1 });
  const separated = (site: Point) => pads.every(p => distance(p, site) >= 3.1);
  const entry = candidates.find(separated); if (entry) pads.push(entry);
  const coverage = candidates.map(site => route.map(p => Math.max(0, 1 - distance(p, site) / 4.8)));
  const prior = route.map(p => Math.max(...pads.map(pad => Math.max(0, 1 - distance(p, pad) / 4.8))));
  const count = map.theme === 'forest' ? 14 : 16;
  while (pads.length < count) {
    let best = -1, highest = -Infinity;
    for (const [index, site] of candidates.entries()) {
      if (!separated(site)) continue;
      let score = 0;
      for (let i = 0; i < route.length; i++) score += Math.max(0, coverage[index][i] - prior[i]);
      score += Math.min(...pads.map(pad => distance(site, pad))) * .04;
      if (score > highest) { best = index; highest = score; }
    }
    if (best < 0) break; pads.push(candidates[best]);
    for (let i = 0; i < route.length; i++) prior[i] = Math.max(prior[i], coverage[best][i]);
  }
  return pads.sort((a, b) => a.progress - b.progress).map((p, i) => ({ ...p, id: `pad-${i + 1}` }));
}
