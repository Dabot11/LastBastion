import { WORLD } from './config';
export interface Point { x: number; z: number; }
export function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.z - b.z); }
// One ordered route, from the southeastern portal to the northwestern castle gate.
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
  grass: number; sand: number; theme: 'forest' | 'village' | 'citadel';
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
export function roadDistance(p: Point, map: GameMap = DEFAULT_MAP): number { return Math.min(...map.segments.map(s => segmentDistance(p, s.start, s.end))); }
export interface Obstacle extends Point { radius: number; type: 'tree' | 'rock' | 'house'; }
export function createMap(points: Point[], initialSeed: number, theme: GameMap['theme'] = 'forest'): GameMap {
  const path = roundedPath(points), segments = path.slice(1).map((end, i) => ({ start: path[i], end, length: distance(path[i], end) }));
  const map: GameMap = { path, segments, length: segments.reduce((s, p) => s + p.length, 0), obstacles: [], torches: [], fences: [], grass: theme === 'village' ? 0xb1b274 : theme === 'citadel' ? 0x86a69a : 0x8fa965, sand: theme === 'citadel' ? 0xc0b39a : 0xcba876, theme };
  let seed = initialSeed;
  const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 170; i++) {
    const p = { x: (random() - .5) * 28.2, z: (random() - .5) * 24.2 };
    const roll = random(); const type: Obstacle['type'] = ((theme === 'village' && roll < .14) || (theme === 'citadel' && roll < .18)) ? 'house' : roll < (theme === 'citadel' ? .4 : .82) ? 'tree' : 'rock';
    const radius = type === 'house' ? .95 : .38;
    if (roadDistance(p, map) > radius + 2.1 && distance(p, path.at(-1)!) > radius + 3.6 && distance(p, path[0]) > radius + 2.7 && !map.obstacles.some(o => distance(p, o) < o.radius + radius + .35)) map.obstacles.push({ ...p, radius, type });
  }
  map.torches = [{ x: -9, z: -3.3 }, { x: 9, z: 5.3 }, { x: -11, z: 8 }, { x: 9, z: -7.4 }].filter(p => roadDistance(p, map) > 2 && distance(p, path.at(-1)!) > 4 && !map.obstacles.some(o => distance(p, o) < o.radius + .4));
  map.fences = [{ x: -3, z: -7.4 }, { x: 1, z: 3.5 }, { x: -3, z: 6.5 }, { x: 4, z: -3.5 }].filter(p => roadDistance(p, map) > 2 && !map.obstacles.some(o => distance(p, o) < o.radius + .9));
  return map;
}
export const DEFAULT_MAP = createMap(corners, 421);
export const PATH = DEFAULT_MAP.path, SEGMENTS = DEFAULT_MAP.segments, PATH_LENGTH = DEFAULT_MAP.length;
export const OBSTACLES = DEFAULT_MAP.obstacles, TORCHES = DEFAULT_MAP.torches, FENCES = DEFAULT_MAP.fences;
export function placementError(p: Point, towers: Point[], gold: number, cost: number, map: GameMap = DEFAULT_MAP): string | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return 'Ubicación inválida';
  if (Math.abs(p.x) > WORLD.width / 2 - 1 || Math.abs(p.z) > WORLD.depth / 2 - 1) return 'Construye dentro del terreno';
  if (roadDistance(p, map) < WORLD.roadHalfWidth + WORLD.towerRadius + .65) return 'El camino debe quedar libre';
  const castle = map.path.at(-1)!;
  const overlapsCourtyard = Math.abs(p.x - castle.x) < 2.15 + WORLD.towerRadius + .42 && p.z < castle.z + .7 + WORLD.towerRadius + .42 && p.z > castle.z - 2.6 - WORLD.towerRadius - .42;
  if (distance(p, castle) < 3.2 || overlapsCourtyard) return 'Esta zona pertenece al castillo';
  if (distance(p, map.path[0]) < 2.8) return 'La entrada enemiga debe quedar libre';
  if (map.obstacles.some(o => distance(p, o) < o.radius + WORLD.towerRadius)) return 'Hay un edificio, árbol o roca en esta ubicación';
  if (map.torches.some(o => distance(p, o) < WORLD.towerRadius + .35)) return 'Hay una antorcha en esta ubicación';
  if (map.fences.some(o => segmentDistance(p, { x: o.x - .8, z: o.z }, { x: o.x + .8, z: o.z }) < WORLD.towerRadius + .1)) return 'Hay una valla en esta ubicación';
  if (towers.some(t => distance(p, t) < WORLD.towerRadius * 2 + .15)) return 'Demasiado cerca de otra torre';
  if (gold < cost) return 'No tienes suficiente oro';
  return null;
}
