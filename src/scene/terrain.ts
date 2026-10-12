import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WORLD } from '../game/config';
import { DEFAULT_MAP, placementError, samplePath, type GameMap } from '../game/path';
import { box, cone, orb, castleModel, cottage, mesh, pine, portalModel, torch } from './models';
import { landscape } from './landscape';
import { surroundingWorld } from './scenery';
import { contactShadowMaterial, groundMaterial } from './surfaces';
export function createTerrain(scene: THREE.Group, map: GameMap = DEFAULT_MAP): { surfaces: THREE.Object3D[] } {
  const group = new THREE.Group(); scene.add(group);
  const land = landscape(map); scene.add(land.group);
  surroundingWorld(group, map);
  const shadeGeometry = new THREE.PlaneGeometry(1, 1); shadeGeometry.rotateX(-Math.PI / 2);
  map.obstacles.forEach((o, i) => {
    if (o.type === 'tree') { const tree = pine(.78 + (i % 5) * .06); tree.position.set(o.x, WORLD.elevation, o.z); tree.rotation.y = i * 2.4; group.add(tree); }
    else if (o.type === 'house') { const house = cottage(map.theme === 'citadel'); house.position.set(o.x, WORLD.elevation, o.z); house.rotation.y = i * .8; group.add(house); }
    else { const rock = mesh(group, new THREE.DodecahedronGeometry(.46, 0), i % 2 ? 0x959b8a : 0xb4b09c, o.x, WORLD.elevation + .3, o.z); rock.scale.set(.95, .85, .9); rock.rotation.set(.1, i, .2); }
    const shade = new THREE.Mesh(shadeGeometry, contactShadowMaterial()); shade.position.set(o.x, WORLD.elevation + .065, o.z);
    const radius = o.type === 'house' ? 1.7 : o.type === 'tree' ? 1.2 : .9; shade.scale.set(radius, 1, radius); shade.receiveShadow = false; group.add(shade);
    if (o.type === 'tree') for (let j = 0; j < 3; j++) {
      const bush = mesh(group, orb(.16), j % 2 ? 0x5c8e35 : 0x377a37, o.x + Math.cos(j * 2.4 + i) * .22, WORLD.elevation + .13, o.z + Math.sin(j * 2.4 + i) * .22); bush.scale.y = .65;
    }
  });
  for (const { x, z } of map.fences) {
    const fence = new THREE.Group(); fence.position.set(x, WORLD.elevation, z);
    for (const dx of [-.65, 0, .65]) { const post = mesh(fence, box(.10, .55, .10), 0x866139, dx, .27, 0); post.rotation.z = dx * .08; }
    for (const y of [.2, .46]) mesh(fence, box(1.5, .075, .07), 0xb28650, 0, y, 0);
    group.add(fence);
  }
  for (const { x, z } of map.torches) {
    const g = new THREE.Group(); g.position.set(x, WORLD.elevation, z);
    mesh(g, box(.38, .35, .38), 0xb4a388, 0, .17, 0); torch(g, 0, .47, 0); group.add(g);
  }
  const castle = castleModel(); castle.position.set(map.path.at(-1)!.x, .16, map.path.at(-1)!.z); group.add(castle);
  const portal = portalModel(); portal.position.set(map.path[0].x, .14, map.path[0].z); portal.rotation.y = -.65; group.add(portal);
  // Decorative pebbles stay inside the canyon setback and never change construction or enemy movement.
  for (let progress = 1; progress < map.length - 3; progress += 1.7) {
    const p = samplePath(progress, map), side = Math.sin(progress * 17) > 0 ? 1 : -1;
    const x = p.x + Math.cos(p.angle) * 1.3 * side, z = p.z - Math.sin(p.angle) * 1.3 * side;
    const rock = mesh(group, new THREE.DodecahedronGeometry(.13, 0), 0xa5a48f, x, .2, z); rock.scale.set(1.2, .5, .8);
  }
  const cliffGeometry = new RoundedBoxGeometry(2, 2, 2, 1, .19), vertices = cliffGeometry.getAttribute('position');
  const cliffColors: number[] = [], tint = new THREE.Color();
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    vertices.setXYZ(i, x * (1 + .09 * Math.sin(y * 4 + z * 3)), y + .055 * Math.sin(x * 5 + z * 2), z * (1 + .06 * Math.cos(y * 4 - x * 3)));
    tint.setHex(y > .75 ? 0xc2cca9 : 0xffffff).multiplyScalar(.88 + .12 * Math.sin(x * 5 + y * 4 + z * 3)); cliffColors.push(tint.r, tint.g, tint.b);
  }
  cliffGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cliffColors, 3)); cliffGeometry.computeVertexNormals();
  const canyonRocks = new THREE.InstancedMesh(cliffGeometry, groundMaterial(0xffffff, true), Math.ceil(map.length / 1.15) * 2);
  const slab = new THREE.Object3D(), slabColor = new THREE.Color(); let slabCount = 0;
  for (let progress = 2; progress < map.length - 3; progress += 1.15) for (const side of [-1, 1]) {
    const p = samplePath(progress, map);
    slab.position.set(p.x + Math.cos(p.angle) * 1.49 * side, .85, p.z - Math.sin(p.angle) * 1.49 * side);
    slab.rotation.set(.025, p.angle + .065 * Math.sin(progress), .02 * Math.cos(progress * 2));
    slab.scale.set(.24 + .025 * Math.sin(progress * 2), .66 + .07 * Math.cos(progress * 1.3), .52); slab.updateMatrix(); canyonRocks.setMatrixAt(slabCount, slab.matrix);
    slabColor.setHex([0x939b96, 0xa5aaa0, 0x858f92, 0xb2b2a5][slabCount % 4]); canyonRocks.setColorAt(slabCount++, slabColor);
    if (Math.sin(progress * 4.3) > -.3) {
      const x = p.x + Math.cos(p.angle) * 1.82 * side, z = p.z - Math.sin(p.angle) * 1.82 * side;
      const bush = mesh(group, orb(.16), 0x568c34, x, WORLD.elevation + .13, z); bush.scale.set(1.6, .7, 1.1); bush.castShadow = false;
      for (let j = 0; j < 3; j++) {
        const leaf = mesh(group, cone(.06, .25 + j * .04, 4), j % 2 ? 0x6b9b38 : 0x3c7f38, x + Math.cos(j * 2) * .13, WORLD.elevation + .18, z + Math.sin(j * 2) * .13); leaf.rotation.z = (j - 1) * .5; leaf.castShadow = false;
      }
    }
  }
  canyonRocks.count = slabCount; canyonRocks.receiveShadow = true; canyonRocks.castShadow = true; scene.add(canyonRocks);
  // Grass, ferns and flowers are small non-solid scenery on valid raised land.
  let seed = 1947;
  const rand = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1300; i++) {
    const p = { x: (rand() - .5) * 28, z: (rand() - .5) * 24 };
    if (placementError(p, [], 10000, 0, map)) continue;
    const y = WORLD.elevation + .07;
    if (i % 5 === 0) {
      for (let j = 0; j < 3; j++) { const flower = mesh(group, orb(.045), j % 2 ? 0xf6d689 : 0xe2c5d0, p.x + (j - 1) * .09, y + .045, p.z + Math.sin(j) * .08); flower.castShadow = false; }
    } else {
      for (let j = 0; j < 3; j++) { const blade = mesh(group, cone(.035, .17 + j * .025, 3), i % 3 ? 0x4e7e39 : 0x739447, p.x + (j - 1) * .04, y + .09, p.z); blade.rotation.z = (j - 1) * .35; blade.castShadow = false; }
    }
  }
  // Merge static props into one draw call per material. Tiny flora does not cast shadows.
  group.updateMatrixWorld(true);
  const batches = new Map<string, { mat: THREE.Material; geometries: THREE.BufferGeometry[]; shadow: boolean }>();
  const baked: THREE.Mesh[] = [];
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone(); geo.applyMatrix4(object.matrixWorld);
    const mat = object.material as THREE.Material, key = `${mat.uuid}:${object.castShadow}`;
    const batch = batches.get(key) ?? { mat, geometries: [], shadow: object.castShadow }; batch.geometries.push(geo); batches.set(key, batch); baked.push(object);
  });
  baked.forEach(object => object.removeFromParent());
  for (const { mat, geometries, shadow } of batches.values()) {
    const geometry = mergeGeometries(geometries); if (!geometry) throw new Error('Static terrain geometry could not be merged');
    const batch = new THREE.Mesh(geometry, mat); batch.castShadow = shadow; batch.receiveShadow = true; scene.add(batch); geometries.forEach(geo => geo.dispose());
  }
  shadeGeometry.dispose();
  // Keep a clear route and a single authoritative construction surface per elevation.
  return { surfaces: land.surfaces };
}
