import * as THREE from 'three';
import { WORLD } from '../game/config';
import { castleSpace, roadHeight, type GameMap } from '../game/path';

export const CAMERA_OFFSET = [-9, 29.7, 24] as const;
export interface Viewport { width: number; height: number; top: number; bottom: number; left: number; right: number; }

export function modelFramingPoints(model: THREE.Object3D): THREE.Vector3[] {
  const basis = new THREE.Matrix4().lookAt(new THREE.Vector3(...CAMERA_OFFSET), new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const up = new THREE.Vector3().setFromMatrixColumn(basis, 1), right = new THREE.Vector3().setFromMatrixColumn(basis, 0);
  const points = Array.from({ length: 4 }, () => new THREE.Vector3());
  const limits = [Infinity, -Infinity, Infinity, -Infinity], vertex = new THREE.Vector3();
  model.updateWorldMatrix(true, true);
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      const y = vertex.dot(up), x = vertex.dot(right);
      if (y < limits[0]) { limits[0] = y; points[0].copy(vertex); }
      if (y > limits[1]) { limits[1] = y; points[1].copy(vertex); }
      if (x < limits[2]) { limits[2] = x; points[2].copy(vertex); }
      if (x > limits[3]) { limits[3] = x; points[3].copy(vertex); }
    }
  });
  return points;
}

// Keep the route at the center of the usable screen; scenery does not influence the focus.
// Fit both sides of that focus independently, so the castle and cave cannot be clipped.
export function battlefieldFraming(map: GameMap, viewport: Viewport, castlePoints: readonly THREE.Vector3[]): { height: number; focus: THREE.Vector3 } {
  const basis = new THREE.Matrix4().lookAt(new THREE.Vector3(...CAMERA_OFFSET), new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const up = new THREE.Vector3().setFromMatrixColumn(basis, 1), right = new THREE.Vector3().setFromMatrixColumn(basis, 0);
  const route = map.path.filter(p => Math.abs(p.x) <= WORLD.width / 2 && Math.abs(p.z) <= WORLD.depth / 2).map(p => new THREE.Vector3(p.x, roadHeight(p, map), p.z));
  const points = map.path.map(p => new THREE.Vector3(p.x, roadHeight(p, map) + .2, p.z));
  for (const p of map.path) for (const [dx, dz] of [[-2.8, 0], [2.8, 0], [0, -2.8], [0, 2.8]]) {
    const site = { x: p.x + dx, z: p.z + dz };
    if (Math.abs(site.x) <= WORLD.width / 2 && Math.abs(site.z) <= WORLD.depth / 2 && !castleSpace(site, map)) points.push(new THREE.Vector3(site.x, WORLD.elevation + .15, site.z));
  }
  for (const dx of [-1.8, 1.8]) for (const dz of [-1.8, 1.8]) points.push(new THREE.Vector3(map.path[0].x + dx, 4.6, map.path[0].z + dz));
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  const include = (point: THREE.Vector3) => {
    const y = point.dot(up), x = point.dot(right);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  };
  points.forEach(include);
  castlePoints.forEach(include);
  const road = route.map(p => p.dot(up));
  const anchor = (Math.min(...road) + Math.max(...road)) / 2;
  // Leave room for the castle above the route without creating a large empty foreground.
  const targetY = viewport.top + (viewport.bottom - viewport.top) * .57;
  const height = Math.max(viewport.width < 700 ? 32 : 26,
    (maxY - anchor) * viewport.height / Math.max(1, targetY - viewport.top),
    (anchor - minY) * viewport.height / Math.max(1, viewport.bottom - targetY),
    (maxX - minX) * viewport.height / Math.max(1, viewport.right - viewport.left));
  const targetX = (viewport.left + viewport.right) / 2;
  const focus = up.multiplyScalar(anchor + (targetY / viewport.height - .5) * height)
    .addScaledVector(right, (minX + maxX) / 2 - (targetX / viewport.width - .5) * height * viewport.width / viewport.height);
  return { height, focus };
}
