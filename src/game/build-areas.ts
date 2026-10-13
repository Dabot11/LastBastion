import { WORLD } from './config';
import { placementClearance, towerClearance, type GameMap, type Point } from './path';

interface Sample extends Point { id: string; value: number; }
export interface PlacementField { samples: Sample[]; columns: number; rows: number; inset: number; }
export interface BuildArea { triangles: Point[]; boundary: Point[]; }

export function createPlacementField(map: GameMap): PlacementField {
  const width = WORLD.width - 2, depth = WORLD.depth - 2;
  const columns = Math.ceil(width / .18), rows = Math.ceil(depth / .18);
  const dx = width / columns, dz = depth / rows, samples: Sample[] = [];
  for (let z = 0; z <= rows; z++) for (let x = 0; x <= columns; x++) {
    const p = { x: -width / 2 + x * dx, z: -depth / 2 + z * dz };
    samples.push({ ...p, id: String(samples.length), value: placementClearance(p, [], map) });
  }
  // A triangle's circumradius bounds the interpolation error of a 1-Lipschitz
  // field. Insetting by it guarantees that EVERY highlighted point is valid,
  // including between samples and beside concave bends or small obstacles.
  // This only affects the visualization; actual free placement is never snapped.
  return { samples, columns, rows, inset: Math.hypot(dx, dz) / 2 + .003 };
}

export function buildArea(field: PlacementField, towers: Point[]): BuildArea {
  const samples = field.samples.map(p => ({ ...p, value: Math.min(p.value, towerClearance(p, towers)) - field.inset }));
  const triangles: Point[] = [], edges = new Map<string, [Sample, Sample]>(), intersections = new Map<string, Sample>();
  function crossing(a: Sample, b: Sample): Sample {
    // Stable shared-edge coordinates prevent cracks and internal grid outlines.
    if (a.id > b.id) [a, b] = [b, a];
    const id = `${a.id}:${b.id}`;
    let p = intersections.get(id);
    if (!p) { const t = a.value / (a.value - b.value); p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, value: 0, id }; intersections.set(id, p); }
    return p;
  }
  function clip(a: Sample, b: Sample, c: Sample): void {
    if (a.value < 0 && b.value < 0 && c.value < 0) return;
    const input = [a, b, c], polygon: Sample[] = [];
    for (let i = 0; i < 3; i++) {
      const p = input[i], q = input[(i + 1) % 3];
      if (p.value >= 0) polygon.push(p);
      if ((p.value >= 0) !== (q.value >= 0)) polygon.push(crossing(p, q));
    }
    for (let i = 1; i < polygon.length - 1; i++) triangles.push(polygon[0], polygon[i], polygon[i + 1]);
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const key = p.id < q.id ? `${p.id}/${q.id}` : `${q.id}/${p.id}`;
      if (edges.has(key)) edges.delete(key); else edges.set(key, [p, q]);
    }
  }
  for (let z = 0; z < field.rows; z++) for (let x = 0; x < field.columns; x++) {
    const index = z * (field.columns + 1) + x;
    const a = samples[index], b = samples[index + 1], c = samples[index + field.columns + 2], d = samples[index + field.columns + 1];
    clip(a, d, c); clip(a, c, b);
  }
  return { triangles, boundary: [...edges.values()].flat() };
}
