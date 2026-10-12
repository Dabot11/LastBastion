import * as THREE from 'three';
import { WORLD } from '../game/config';
import { roadDistance, type GameMap, type Point } from '../game/path';
import { material } from './models';
interface Sample extends Point { value: number; }
const TOP = WORLD.elevation + .05;
function field(p: Point, map: GameMap): number {
  const gate = map.path.at(-1)!, entry = map.path[0];
  const courtyard = Math.max(Math.abs(p.x - gate.x) - 2.15, Math.abs(p.z - (gate.z - .95)) - 1.65);
  const canyon = Math.min(roadDistance(p, map) - 1.45, Math.hypot(p.x - entry.x, p.z - entry.z) - 1.6, courtyard);
  const border = Math.min(15 + .12 * Math.sin(p.z * 1.8) - Math.abs(p.x), 13 + .10 * Math.sin(p.x * 1.9) - Math.abs(p.z));
  return Math.min(canyon, border);
}
function interpolate(a: Sample, b: Sample): Sample {
  const t = a.value / (a.value - b.value);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, value: 0 };
}
function owned(geometry: THREE.BufferGeometry, color: number, vertexColors = false): THREE.Mesh {
  const mat = material(color).clone(); mat.vertexColors = vertexColors; mat.userData.owned = true;
  const mesh = new THREE.Mesh(geometry, mat); mesh.receiveShadow = true; return mesh;
}
function makeGeometry(positions: number[], colors: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals(); return geo;
}
export function landscape(map: GameMap): { group: THREE.Group; surfaces: THREE.Object3D[] } {
  const group = new THREE.Group();
  const topPositions: number[] = [], topColors: number[] = [], wallPositions: number[] = [], wallColors: number[] = [];
  const baseGrass = new THREE.Color(map.theme === 'forest' ? 0x69954b : map.theme === 'village' ? 0x98a75a : 0x6c9b79);
  const rockColor = new THREE.Color(map.theme === 'citadel' ? 0x9ea8a0 : 0xaba794);
  const color = new THREE.Color();
  const append = (points: THREE.Vector3[], positions: number[], colors: number[], tint: THREE.Color): void => {
    for (const p of points) { positions.push(p.x, p.y, p.z); colors.push(tint.r, tint.g, tint.b); }
  };
  function topTriangle(a: Point, b: Point, c: Point): void {
    for (const p of [a, b, c]) {
      const variation = 1 + .07 * Math.sin(p.x * .62 + p.z * .23) + .05 * Math.cos(p.z * .8 - p.x * .2);
      color.copy(baseGrass).multiplyScalar(variation);
      append([new THREE.Vector3(p.x, TOP, p.z)], topPositions, topColors, color);
    }
  }
  function wall(a: Point, b: Point): void {
    const length = Math.hypot(a.x - b.x, a.z - b.z); if (length < .00001) return;
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    const toward = field({ x: mid.x + nx * .06, z: mid.z + nz * .06 }, map) < 0 ? 1 : -1;
    const isBorder = Math.abs(mid.x) > 14.6 || Math.abs(mid.z) > 12.6;
    const floor = isBorder ? -1.95 : .13;
    const middle = isBorder ? -.6 : .82;
    const levels = [floor, middle, TOP - .13, TOP];
    const offsets = [isBorder ? -.13 : .03, .12, .05, 0];
    const rings = levels.map((y, i) => [a, b].map(p => new THREE.Vector3(p.x + nx * toward * offsets[i], y, p.z + nz * toward * offsets[i])));
    for (let i = 0; i < rings.length - 1; i++) {
      const [p, q] = rings[i], [r, s] = rings[i + 1];
      color.copy(i === 2 ? baseGrass : rockColor).multiplyScalar(i === 2 ? .8 : .85 + .14 * Math.sin(mid.x * 3.1 + mid.z * 2.3 + i));
      append([p, r, q, q, r, s], wallPositions, wallColors, color);
    }
  }
  // Clip each triangle at the canyon contour. The plateau is one continuous mesh, with no tiled tops.
  function clip(triangle: Sample[]): void {
    const poly: Sample[] = [], crossings: Sample[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a.value >= 0) poly.push(a);
      if ((a.value >= 0) !== (b.value >= 0)) { const p = interpolate(a, b); poly.push(p); crossings.push(p); }
    }
    for (let i = 1; i < poly.length - 1; i++) topTriangle(poly[0], poly[i], poly[i + 1]);
    if (crossings.length === 2) wall(crossings[0], crossings[1]);
  }
  const step = .45, minX = -15.75, minZ = -13.95, cols = 71, rows = 63;
  const samples: Sample[][] = [];
  for (let z = 0; z <= rows; z++) {
    samples[z] = [];
    for (let x = 0; x <= cols; x++) { const p = { x: minX + x * step, z: minZ + z * step }; samples[z][x] = { ...p, value: field(p, map) }; }
  }
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    const a = samples[z][x], b = samples[z][x + 1], c = samples[z + 1][x + 1], d = samples[z + 1][x];
    clip([a, d, c]); clip([a, c, b]);
  }
  const tops = owned(makeGeometry(topPositions, topColors), 0xffffff, true); tops.castShadow = false;
  const walls = owned(makeGeometry(wallPositions, wallColors), 0xffffff, true); (walls.material as THREE.Material).side = THREE.DoubleSide; walls.castShadow = false;
  group.add(tops, walls);
  // A continuous earthen floor runs below the same route; elevated surfaces occlude it elsewhere.
  const floorShape = new THREE.Shape();
  for (let i = 0; i < 4; i++) {
    const p = [[-15.02, -13.02], [15.02, -13.02], [15.02, 13.02], [-15.02, 13.02]][i];
    if (!i) floorShape.moveTo(p[0], p[1]); else floorShape.lineTo(p[0], p[1]);
  }
  floorShape.closePath();
  const floorGeometry = new THREE.ShapeGeometry(floorShape); floorGeometry.rotateX(-Math.PI / 2);
  const floorMesh = owned(floorGeometry, map.theme === 'citadel' ? 0xc8b690 : 0xd9b47c); floorMesh.position.y = .13;
  const foundation = owned(new THREE.BoxGeometry(29.9, 1.85, 25.9), 0x9a9585); foundation.position.y = -.95; foundation.receiveShadow = true; foundation.castShadow = true;
  group.add(foundation, floorMesh);
  return { group, surfaces: [tops, floorMesh] };
}
