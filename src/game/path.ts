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
function roundedPath(): Point[] {
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
export const PATH = roundedPath();
export const SEGMENTS = PATH.slice(1).map((end, i) => ({ start: PATH[i], end, length: distance(PATH[i], end) }));
export const PATH_LENGTH = SEGMENTS.reduce((s, p) => s + p.length, 0);
export function samplePath(progress: number): Point & { angle: number } {
  let remaining = Math.max(0, progress);
  for (const s of SEGMENTS) {
    if (remaining <= s.length) { const t = remaining / s.length; return { x: s.start.x + (s.end.x - s.start.x) * t, z: s.start.z + (s.end.z - s.start.z) * t, angle: Math.atan2(s.end.x - s.start.x, s.end.z - s.start.z) }; }
    remaining -= s.length;
  }
  const last = SEGMENTS.at(-1)!; return { ...last.end, angle: Math.atan2(last.end.x - last.start.x, last.end.z - last.start.z) };
}
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return distance(p, { x: a.x + dx * t, z: a.z + dz * t });
}
export function roadDistance(p: Point): number { return Math.min(...SEGMENTS.map(s => segmentDistance(p, s.start, s.end))); }
export interface Obstacle extends Point { radius: number; type: 'tree' | 'rock'; }
// Seeded scenery is shared by visual generation and placement rules.
let seed = 421;
function random(): number { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
export const OBSTACLES: Obstacle[] = [];
for (let i = 0; i < 230; i++) {
  const p = { x: (random() - .5) * 28.2, z: (random() - .5) * 24.2 };
  const castle = distance(p, PATH.at(-1)!);
  if (roadDistance(p) > 2.4 && castle > 3.6 && distance(p, PATH[0]) > 2 && !OBSTACLES.some(o => distance(p, o) < 1.1)) {
    OBSTACLES.push({ ...p, radius: .38, type: random() < .82 ? 'tree' : 'rock' });
  }
}
export const TORCHES: Point[] = [{ x: -9, z: -3.3 }, { x: 9, z: 5.3 }, { x: -11, z: 8 }, { x: 9, z: -7.4 }];
export const FENCES: Point[] = [{ x: -3, z: -7.4 }, { x: 1, z: 3.5 }, { x: -3, z: 6.5 }, { x: 4, z: -3.5 }];
export function terrainHeight(p: Point): number { return roadDistance(p) < WORLD.roadHalfWidth + .3 ? 0 : WORLD.elevation; }
export function placementError(p: Point, towers: Point[], gold: number, cost: number): string | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return 'Ubicación inválida';
  if (Math.abs(p.x) > WORLD.width / 2 - 1 || Math.abs(p.z) > WORLD.depth / 2 - 1) return 'Construye dentro del terreno';
  if (roadDistance(p) < WORLD.roadHalfWidth + WORLD.towerRadius + .65) return 'El camino debe quedar libre';
  const castle = PATH.at(-1)!;
  const overlapsCourtyard = Math.abs(p.x - castle.x) < 2.15 + WORLD.towerRadius + .42 && p.z < castle.z + .7 + WORLD.towerRadius + .42 && p.z > castle.z - 2.6 - WORLD.towerRadius - .42;
  if (distance(p, castle) < 3.2 || overlapsCourtyard) return 'Esta zona pertenece al castillo';
  if (distance(p, PATH[0]) < 2.8) return 'La entrada enemiga debe quedar libre';
  if (OBSTACLES.some(o => distance(p, o) < o.radius + WORLD.towerRadius)) return 'Hay un árbol o una roca en esta ubicación';
  if (TORCHES.some(o => distance(p, o) < WORLD.towerRadius + .35)) return 'Hay una antorcha en esta ubicación';
  if (FENCES.some(o => segmentDistance(p, { x: o.x - .8, z: o.z }, { x: o.x + .8, z: o.z }) < WORLD.towerRadius + .1)) return 'Hay una valla en esta ubicación';
  if (towers.some(t => distance(p, t) < WORLD.towerRadius * 2 + .15)) return 'Demasiado cerca de otra torre';
  if (gold < cost) return 'No tienes suficiente oro';
  return null;
}
