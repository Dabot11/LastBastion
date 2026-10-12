import * as THREE from 'three';
import { WORLD } from '../game/config';
import { roadDistance, type GameMap, type Point } from '../game/path';
import { groundMaterial, valleyHeight, type SurfaceKind } from './surfaces';
interface Sample extends Point { value: number; }
const TOP = WORLD.elevation + .05;
function field(p: Point, map: GameMap): number {
  const gate = map.path.at(-1)!, entry = map.path[0];
  const courtyard = Math.max(Math.abs(p.x - gate.x) - 2.15, Math.abs(p.z - (gate.z - .95)) - 1.65);
  const canyon = Math.min(roadDistance(p, map) - 1.45, Math.hypot(p.x - entry.x, p.z - entry.z) - 1.6, courtyard);
  return canyon;
}
function interpolate(a: Sample, b: Sample): Sample {
  const t = a.value / (a.value - b.value);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, value: 0 };
}
function owned(geometry: THREE.BufferGeometry, color: number, vertexColors = false, surface: SurfaceKind = 'grass'): THREE.Mesh {
  const mat = groundMaterial(color, vertexColors, surface);
  const mesh = new THREE.Mesh(geometry, mat); mesh.receiveShadow = true; return mesh;
}
function makeGeometry(positions: number[], colors: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const uv: number[] = []; for (let i = 0; i < positions.length; i += 3) uv.push(positions[i] * .22, positions[i + 2] * .22);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals(); return geo;
}
export function landscape(map: GameMap): { group: THREE.Group; surfaces: THREE.Object3D[] } {
  const group = new THREE.Group();
  const topPositions: number[] = [], topColors: number[] = [], wallPositions: number[] = [], wallColors: number[] = [];
  const baseGrass = new THREE.Color(map.theme === 'forest' ? 0x62954c : map.theme === 'village' ? 0x8d9d50 : 0x58966a);
  const rockColor = new THREE.Color(map.theme === 'citadel' ? 0x8a99a3 : 0x9c9c8e);
  const color = new THREE.Color();
  const append = (points: THREE.Vector3[], positions: number[], colors: number[], tint: THREE.Color): void => {
    for (const p of points) { positions.push(p.x, p.y, p.z); colors.push(tint.r, tint.g, tint.b); }
  };
  function topTriangle(a: Point, b: Point, c: Point): void {
    for (const p of [a, b, c]) {
      const variation = 1 + .09 * Math.sin(p.x * .62 + p.z * .23) + .07 * Math.cos(p.z * .8 - p.x * .2);
      color.copy(baseGrass).multiplyScalar(variation);
      append([new THREE.Vector3(p.x, valleyHeight(p.x, p.z), p.z)], topPositions, topColors, color);
    }
  }
  function wall(a: Point, b: Point): void {
    const length = Math.hypot(a.x - b.x, a.z - b.z); if (length < .00001) return;
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    const toward = field({ x: mid.x + nx * .06, z: mid.z + nz * .06 }, map) < 0 ? 1 : -1;
    const floor = .13;
    const middle = .82;
    const levels = [floor, middle, TOP - .13, TOP];
    const offsets = [.03, .12, .05, 0];
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
  // Dense samples at the road, progressively wider samples in the distant landscape.
  // There is no outer cliff or rectangular foundation: land continues beyond the camera.
  function coordinates(inner: number): number[] {
    const values: number[] = [];
    for (let p = -inner; p <= inner + .001; p += .45) values.push(p);
    const outer = [inner + 1.2, inner + 3, inner + 5, inner + 8, inner + 12, inner + 18, inner + 26, inner + 36, 75];
    return [...outer.slice().reverse().map(p => -p), ...values, ...outer];
  }
  const xs = coordinates(16.2), zs = coordinates(14.4), cols = xs.length - 1, rows = zs.length - 1;
  const samples: Sample[][] = [];
  for (let z = 0; z <= rows; z++) {
    samples[z] = [];
    for (let x = 0; x <= cols; x++) { const p = { x: xs[x], z: zs[z] }; samples[z][x] = { ...p, value: field(p, map) }; }
  }
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    const a = samples[z][x], b = samples[z][x + 1], c = samples[z + 1][x + 1], d = samples[z + 1][x];
    clip([a, d, c]); clip([a, c, b]);
  }
  const tops = owned(makeGeometry(topPositions, topColors), 0xffffff, true); tops.castShadow = true;
  const walls = owned(makeGeometry(wallPositions, wallColors), 0xffffff, true, 'stone'); (walls.material as THREE.Material).side = THREE.DoubleSide; walls.castShadow = true;
  group.add(tops, walls);
  // A continuous earthen floor runs below the same route; elevated surfaces occlude it elsewhere.
  const floorShape = new THREE.Shape();
  for (let i = 0; i < 4; i++) {
    const p = [[-15.02, -13.02], [15.02, -13.02], [15.02, 13.02], [-15.02, 13.02]][i];
    if (!i) floorShape.moveTo(p[0], p[1]); else floorShape.lineTo(p[0], p[1]);
  }
  floorShape.closePath();
  const floorGeometry = new THREE.ShapeGeometry(floorShape); floorGeometry.rotateX(-Math.PI / 2);
  const positions = floorGeometry.getAttribute('position'), uvs = floorGeometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) uvs.setXY(i, positions.getX(i) * .22, positions.getZ(i) * .22);
  const floorMesh = owned(floorGeometry, map.theme === 'citadel' ? 0xd5b793 : 0xe1bc83, false, 'road'); floorMesh.position.y = .13;
  group.add(floorMesh);
  return { group, surfaces: [tops, floorMesh] };
}
