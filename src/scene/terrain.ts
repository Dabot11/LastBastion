import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from '../game/config';
import { DEFAULT_MAP, roadDistance, samplePath, type GameMap } from '../game/path';
import { box, castleModel, cottage, material, mesh, pine, portalModel, torch } from './models';
export function createTerrain(scene: THREE.Group, map: GameMap = DEFAULT_MAP): { surfaces: THREE.Object3D[] } {
  const { path: PATH, length: PATH_LENGTH, obstacles: OBSTACLES, fences: FENCES, torches: TORCHES } = map;
  const group = new THREE.Group(); scene.add(group);
  const step = .6, cells: { x: number; z: number; h: number }[] = [];
  for (let x = -14.7; x < 15; x += step) for (let z = -12.7; z < 13; z += step) {
    const low = roadDistance({ x, z }, map) < 1.08 || Math.hypot(x - PATH[0].x, z - PATH[0].z) < 1.55 || (Math.abs(x - PATH.at(-1)!.x) < 2.15 && z < PATH.at(-1)!.z + .7 && z > PATH.at(-1)!.z - 2.6);
    cells.push({ x, z, h: low ? .1 : WORLD.elevation });
  }
  const columns = new THREE.InstancedMesh(box(step + .008, 1, step + .008), material(0xffffff), cells.length);
  const topPositions: number[] = [], topColors: number[] = [], topIndices: number[] = [];
  const transform = new THREE.Object3D(); const color = new THREE.Color();
  cells.forEach((p, i) => {
    transform.position.set(p.x, (p.h - 1.7) / 2, p.z); transform.scale.set(1, p.h + 1.7, 1); transform.updateMatrix(); columns.setMatrixAt(i, transform.matrix);
    color.setHex([0x9f9787, 0xb2aa96, 0x8f8c80, 0xa79c87][i % 4]); columns.setColorAt(i, color);
    color.setHex(p.h < .2 ? map.sand : map.grass);
    const y = p.h + .05, half = step / 2, vertex = topPositions.length / 3;
    topPositions.push(p.x - half, y, p.z - half, p.x + half, y, p.z - half, p.x + half, y, p.z + half, p.x - half, y, p.z + half);
    for (let j = 0; j < 4; j++) topColors.push(color.r, color.g, color.b);
    topIndices.push(vertex, vertex + 2, vertex + 1, vertex, vertex + 3, vertex + 2);
  });
  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute('position', new THREE.Float32BufferAttribute(topPositions, 3));
  topGeometry.setAttribute('color', new THREE.Float32BufferAttribute(topColors, 3)); topGeometry.setIndex(topIndices); topGeometry.computeVertexNormals();
  const grass = material(0xffffff).clone(); grass.vertexColors = true; grass.userData.owned = true;
  const tops = new THREE.Mesh(topGeometry, grass);
  columns.receiveShadow = true; columns.castShadow = false; tops.receiveShadow = true; tops.castShadow = false; group.add(columns, tops);
  // Continuous ribbon: the very same ordered waypoints used by all enemies.
  const vertices: number[] = [], indices: number[] = [];
  PATH.forEach((p, i) => {
    const a = PATH[Math.max(0, i - 1)], b = PATH[Math.min(PATH.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
    vertices.push(p.x + nx * WORLD.roadHalfWidth, .17, p.z + nz * WORLD.roadHalfWidth, p.x - nx * WORLD.roadHalfWidth, .17, p.z - nz * WORLD.roadHalfWidth);
    if (i) { const j = i * 2; indices.push(j - 2, j, j - 1, j - 1, j, j + 1); }
  });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const roadMat = material(map.sand).clone(); roadMat.side = THREE.DoubleSide; roadMat.userData.owned = true;
  const road = new THREE.Mesh(geometry, roadMat); road.receiveShadow = true; group.add(road);
  // Faceted stones along the canyon walls. Their footprint stays inside the road setback.
  const cliffCount = Math.floor(PATH_LENGTH / .65) * 2;
  const cliffs = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), material(0xa6a394), cliffCount);
  let cliffIndex = 0;
  for (let progress = .4; progress < PATH_LENGTH - .4; progress += .65) {
    const p = samplePath(progress, map), normal = { x: Math.cos(p.angle), z: -Math.sin(p.angle) };
    for (const side of [-1, 1]) {
      if (cliffIndex >= cliffCount) break;
      transform.position.set(p.x + normal.x * 1.52 * side, .87, p.z + normal.z * 1.52 * side);
      transform.rotation.set(.04, p.angle + cliffIndex * .33, .05); transform.scale.set(.25, .81 + (cliffIndex % 3) * .04, .37); transform.updateMatrix();
      cliffs.setMatrixAt(cliffIndex++, transform.matrix);
    }
  }
  cliffs.count = cliffIndex; cliffs.receiveShadow = true; cliffs.castShadow = true; group.add(cliffs);
  OBSTACLES.forEach((o, i) => {
    if (o.type === 'tree') { const tree = pine(.68 + (i % 7) * .075); tree.position.set(o.x, WORLD.elevation, o.z); tree.rotation.y = i * 2.4; group.add(tree); }
    else if (o.type === 'house') { const house = cottage(map.theme === 'citadel'); house.position.set(o.x, WORLD.elevation, o.z); house.rotation.y = i * .8; group.add(house); }
    else { const rock = mesh(group, new THREE.DodecahedronGeometry(.49, 0), i % 2 ? 0x9d9b8d : 0xc0b5a0, o.x, WORLD.elevation + .3, o.z); rock.scale.set(1.2, .8, 1); rock.rotation.set(.1, i, .2); }
  });
  // Delicate fences and braziers frame the canyon without marking build slots.
  for (const { x, z } of FENCES) {
    const fence = new THREE.Group(); fence.position.set(x, WORLD.elevation, z);
    for (const dx of [-.65, 0, .65]) mesh(fence, box(.09, .55, .09), 0x8a6036, dx, .27, 0);
    for (const y of [.2, .46]) mesh(fence, box(1.5, .065, .07), 0xb17c43, 0, y, 0);
    group.add(fence);
  }
  for (const { x, z } of TORCHES) {
    const g = new THREE.Group(); g.position.set(x, WORLD.elevation, z);
    mesh(g, box(.38, .35, .38), 0xb4a388, 0, .17, 0); torch(g, 0, .47, 0); group.add(g);
  }
  const castle = castleModel(); castle.position.set(PATH.at(-1)!.x, .2, PATH.at(-1)!.z); group.add(castle);
  const portal = portalModel(); portal.position.set(PATH[0].x, .15, PATH[0].z); portal.rotation.y = -.65; group.add(portal);
  // Dry floating mountain base and soft ground, with no water.
  const base = mesh(group, box(30.7, 1.2, 26.4), 0x736e63, 0, -1.55, .05);
  base.receiveShadow = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material(0xc5d3b9)); ground.rotation.x = -Math.PI / 2; ground.position.y = -2.18; ground.receiveShadow = true; scene.add(ground);
  // Bake static props by material into a few draw calls; keep terrain raycasts separate.
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const baked: THREE.Mesh[] = [];
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object === road || object === tops) return;
    const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone(); geo.applyMatrix4(object.matrixWorld);
    const mat = object.material as THREE.Material; const list = batches.get(mat) ?? []; list.push(geo); batches.set(mat, list); baked.push(object);
  });
  for (const object of baked) object.removeFromParent();
  for (const [mat, geometries] of batches) {
    const geometry = mergeGeometries(geometries); if (!geometry) throw new Error('Static terrain geometry could not be merged');
    const batch = new THREE.Mesh(geometry, mat); batch.castShadow = true; batch.receiveShadow = true; scene.add(batch);
    geometries.forEach(geo => geo.dispose());
  }
  return { surfaces: [tops] };
}
