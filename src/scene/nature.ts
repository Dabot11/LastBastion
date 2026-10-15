import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { DEFAULT_MAP, type GameMap } from '../game/path';

export const naturalScenery = (map: GameMap): boolean => map === DEFAULT_MAP;
type Skin = 'bark' | 'needles' | 'stone';
const materials = new Map<string, THREE.MeshStandardMaterial>();
const textures = new Map<Skin, { color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture }>();
const rocks = new Map<string, THREE.BufferGeometry>();
const trees = new Map<string, THREE.Group>();
const up = new THREE.Vector3(0, 1, 0);
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const hash = (a: number, b: number) => { let n = Math.imul(a, 374761393) + Math.imul(b, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}
const fronds = Array.from({ length: 32 }, (_, i) => {
  const t = .06 + Math.floor(i / 2) * .055, side = i % 2 ? 1 : -1;
  return { y: t, x: side * (.82 * (1 - t) + .03), dy: .10 };
});
function needleAlpha(x: number, y: number): number {
  if (y < .025 || y > .98) return 0;
  if (Math.abs(x) < .32 * (1 - y) + .015) return 255;
  for (const branch of fronds) {
    const t = THREE.MathUtils.clamp((x * branch.x + (y - branch.y) * branch.dy) / (branch.x ** 2 + branch.dy ** 2), 0, 1);
    if (Math.hypot(x - branch.x * t, y - branch.y - branch.dy * t) < .030 * (1 - t * .3)) return 255;
  }
  return 0;
}

function surfaceTextures(kind: Skin) {
  const known = textures.get(kind); if (known) return known;
  const size = 512, color = new Uint8Array(size * size * 4), height = new Uint8Array(color.length), roughness = new Uint8Array(color.length);
  let seed = 947;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = (seed >>> 24) / 255, u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const cloud = (noise(x / size * 6, y / size * 6) - .5) * 1.3 + (noise(x / size * 23, y / size * 23) - .5) * .5;
    const vein = kind === 'bark' ? Math.abs(Math.sin(u * 19 + Math.sin(v * 2) * .7 + Math.sin(v * 7) * .2))
      : kind === 'stone' ? Math.abs(noise(x / size * 25, y / size * 25) - .5)
      : Math.abs(Math.sin(u * 51 + Math.sin(v * 17) * 2));
    const crack = Math.max(0, 1 - vein / (kind === 'stone' ? .025 : .2));
    const shade = .83 + cloud * .13 + (grain - .5) * .16 - crack * .35;
    const pigment = kind === 'bark' ? [137, 111, 80] : kind === 'needles' ? [111, 140, 90] : [192, 184, 161];
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) {
      color[i + c] = Math.round(pigment[c] * shade);
      height[i + c] = Math.round(150 + cloud * 20 + grain * 24 - crack * 105);
      roughness[i + c] = Math.round(210 + cloud * 15 + grain * 25 - crack * 12);
    }
    color[i + 3] = kind === 'needles' ? needleAlpha(x / size * 2 - 1, y / size) : 255;
    height[i + 3] = roughness[i + 3] = 255;
  }
  const texture = (data: Uint8Array, srgb = false) => {
    const t = new THREE.DataTexture(data, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t;
  };
  const result = { color: texture(color, true), height: texture(height), roughness: texture(roughness) };
  textures.set(kind, result); return result;
}
export function natureMaterial(kind: Skin, variant = 0): THREE.MeshStandardMaterial {
  const key = `${kind}-${variant % 3}`; const known = materials.get(key); if (known) return known;
  const skin = surfaceTextures(kind);
  const color = kind === 'needles' ? [0xd2ddb9, 0xedf0cc, 0xbacba4][variant % 3] : kind === 'bark' ? 0xb7a181 : 0xffffff;
  const material = new THREE.MeshStandardMaterial({ color, map: skin.color, bumpMap: skin.height,
    bumpScale: kind === 'bark' ? .09 : kind === 'stone' ? .035 : .045, roughnessMap: skin.roughness,
    roughness: 1, vertexColors: kind === 'stone' });
  if (kind === 'needles') { material.alphaTest = .32; material.side = THREE.DoubleSide; material.alphaToCoverage = true; }
  materials.set(key, material); return material;
}

export function naturalRockGeometry(variant = 0, distant = false): THREE.BufferGeometry {
  const key = `${variant % 6}-${distant}`; const known = rocks.get(key); if (known) return known;
  const raw = new THREE.IcosahedronGeometry(1, distant ? 1 : 3);
  raw.deleteAttribute('uv'); raw.deleteAttribute('normal');
  const geo = mergeVertices(raw); raw.dispose();
  const p = geo.getAttribute('position'), uv: number[] = [], colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const relief = 1 + .16 * Math.sin(x * 4 + variant) * Math.cos(z * 5 - y * 3) + .07 * Math.sin(y * 11 + z * 9 + variant);
    const shape = new THREE.Vector3(x * relief, y * relief, z * relief);
    for (const normal of [new THREE.Vector3(.8, .35, .2), new THREE.Vector3(-.5, .4, .7), new THREE.Vector3(.1, -.9, -.3)]) {
      normal.normalize(); const cut = shape.dot(normal) - (.78 + .04 * Math.sin(variant));
      if (cut > 0) shape.addScaledVector(normal, -cut);
    }
    p.setXYZ(i, shape.x, Math.min(shape.y, .78 + .06 * Math.sin(x * 4 + variant)), shape.z);
    uv.push((Math.atan2(z, x) / Math.PI + 1) * 1.5, y * 1.3);
    const moss = Math.max(0, y - .15) * Math.max(0, Math.sin(x * 7 + z * 4 + variant));
    const shade = .83 + .16 * y;
    colors.push(shade * (1 - moss * .25), shade * (1 + moss * .08), shade * (1 - moss * .43));
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.userData.shared = true; rocks.set(key, geo); return geo;
}
export function naturalRock(variant = 0, distant = false): THREE.Mesh {
  const rock = new THREE.Mesh(naturalRockGeometry(variant, distant), natureMaterial('stone'));
  rock.castShadow = rock.receiveShadow = true; rock.name = 'weathered-natural-rock'; return rock;
}

// Crossed, cutout needle sprays give an airy silhouette without solid geometric crowns.
const foliage = new THREE.PlaneGeometry(1, 1);
foliage.userData.shared = true;
export function naturalPine(scale = 1, variant = 0, distant = false): THREE.Group {
  const key = `${variant % 5}-${distant}`;
  if (!trees.has(key)) {
    const tree = new THREE.Group(); tree.name = 'natural-pine';
    const add = (geo: THREE.BufferGeometry, material: THREE.Material) => {
      geo.userData.shared = true; const m = new THREE.Mesh(geo, material); m.castShadow = !distant; m.receiveShadow = true; tree.add(m); return m;
    };
    const bark = natureMaterial('bark');
    const trunk = add(new THREE.CylinderGeometry(.025, .095, 2.5, distant ? 6 : 10, 3), bark); trunk.position.y = 1.25;
    trunk.rotation.z = Math.sin(variant * 4) * .025;
    const branchGeometry = new THREE.CylinderGeometry(.008, .027, 1, 5);
    for (let tier = 0; tier < 4; tier++) for (let j = 0; j < 3; j++) {
      const angle = j * Math.PI * 2 / 3 + tier * 1.8 + variant * .8;
      const radius = .28 - tier * .048, y = .78 + tier * .45 + .055 * Math.sin(j * 4 + variant);
      const start = new THREE.Vector3(0, y - .06, 0), end = new THREE.Vector3(Math.cos(angle) * radius, y + .04, Math.sin(angle) * radius);
      const direction = end.clone().sub(start), branch = add(branchGeometry, bark);
      branch.position.copy(start).add(end).multiplyScalar(.5); branch.quaternion.setFromUnitVectors(up, direction.clone().normalize()); branch.scale.y = direction.length();
      for (let spray = 0; spray < (distant ? 2 : 3); spray++) {
        const tuft = add(foliage, natureMaterial('needles', (tier + j + variant) % 3));
        tuft.position.copy(end); tuft.position.y += .10;
        tuft.scale.set(.55 - tier * .05, .68 - tier * .055, 1);
        tuft.rotation.set(-.6 - spray * .28, angle + spray * Math.PI / 3, .1 * Math.cos(angle));
      }
    }
    const leader = add(foliage, natureMaterial('needles', variant % 3)); leader.position.y = 2.48; leader.scale.set(.26, .72, 1); leader.rotation.y = variant;
    if (!distant) for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2 + variant;
      const root = add(branchGeometry, bark); root.position.set(Math.cos(a) * .10, .065, Math.sin(a) * .10);
      root.quaternion.setFromUnitVectors(up, new THREE.Vector3(Math.cos(a), -.35, Math.sin(a)).normalize()); root.scale.set(1.4, .24, 1.4);
    }
    tree.scale.set(.92, 1, .92);
    trees.set(key, tree);
  }
  const result = trees.get(key)!.clone(true); result.scale.multiplyScalar(scale); return result;
}
