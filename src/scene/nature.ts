import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { type GameMap } from '../game/path';

// The approved art direction is shared by the entire ten-mission campaign.
export const naturalScenery = (_map: GameMap): boolean => true;
type Skin = 'bark' | 'stone';
const materials = new Map<string, THREE.MeshStandardMaterial>();
const textures = new Map<Skin, { color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture }>();
const rocks = new Map<string, THREE.BufferGeometry>();
const trees = new Map<string, THREE.Group>();
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const hash = (a: number, b: number) => { let n = Math.imul(a, 374761393) + Math.imul(b, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
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
    const pigment = kind === 'bark' ? [137, 111, 80] : [207, 198, 173];
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) {
      color[i + c] = Math.round(pigment[c] * shade);
      height[i + c] = Math.round(150 + cloud * 20 + grain * 24 - crack * 105);
      roughness[i + c] = Math.round(210 + cloud * 15 + grain * 25 - crack * 12);
    }
    color[i + 3] = 255;
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
  const color = kind === 'bark' ? 0xd9b17a : 0xffffff;
  const material = new THREE.MeshStandardMaterial({ color, map: skin.color, bumpMap: skin.height,
    bumpScale: kind === 'bark' ? .09 : kind === 'stone' ? .035 : .045, roughnessMap: skin.roughness,
    roughness: 1, vertexColors: kind === 'stone' });
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

// Painted foliage preserves the approved leaf detail with two triangles per tree.
// The camera supports pan/zoom with a fixed angle, so cards are oriented once before baking.
let textureReady = false;
const treeMaterials = new Map<string, THREE.MeshBasicMaterial>();
let treeAtlas: THREE.Texture | undefined;
export const sceneryTexturesReady = (): boolean => textureReady;
function treeMaterial(variant: number): THREE.MeshBasicMaterial {
  const key = String(variant % 3);
  if (!treeAtlas) {
    treeAtlas = typeof window === 'undefined' ? new THREE.Texture() : new THREE.TextureLoader().load(new URL('../assets/art/adventure-trees.png', import.meta.url).href, () => { textureReady = true; });
    treeAtlas.colorSpace = THREE.SRGBColorSpace; treeAtlas.anisotropy = 4;
  }
  if (!treeMaterials.has(key)) treeMaterials.set(key, new THREE.MeshBasicMaterial({
    map: treeAtlas, color: [0xffffff, 0xe0edce, 0xe7efdd][variant % 3], alphaTest: .4, side: THREE.DoubleSide,
  }));
  return treeMaterials.get(key)!;
}
const treeCards = new Map<boolean, THREE.BufferGeometry>();
function treeModel(scale: number, variant: number, distant: boolean, broadleaf: boolean): THREE.Group {
  const key = `${broadleaf}-${variant % 3}-${distant}`;
  if (!trees.has(key)) {
    const tree = new THREE.Group(); tree.name = broadleaf ? 'adventure-oak' : 'adventure-pine'; tree.userData.artStyle = 'animated-adventure';
    if (!treeCards.has(broadleaf)) {
      const height = 2.45;
      const geometry = new THREE.PlaneGeometry(broadleaf ? 1.3 : 1.15, height); geometry.translate(0, height / 2, 0);
      const uv = geometry.getAttribute('uv');
      // Atlas crops are selected through UVs; original artwork stays intact.
      const left = broadleaf ? 0 : .585, right = broadleaf ? .58 : 1;
      for (let i = 0; i < uv.count; i++) uv.setX(i, left + uv.getX(i) * (right - left));
      geometry.userData.shared = true; treeCards.set(broadleaf, geometry);
    }
    const card = new THREE.Mesh(treeCards.get(broadleaf)!, treeMaterial(variant));
    card.castShadow = !distant; card.userData.foliageCard = true; tree.add(card); trees.set(key, tree);
  }
  const result = trees.get(key)!.clone(true); result.scale.setScalar(scale); return result;
}
export function orientFoliage(root: THREE.Object3D, cameraOffset: readonly [number, number, number]): void {
  const facing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(cameraOffset[0], cameraOffset[2]));
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!object.userData.foliageCard || !object.parent) return;
    object.quaternion.copy(object.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(facing);
  });
}
export function naturalPine(scale = 1, variant = 0, distant = false): THREE.Group { return treeModel(scale, variant, distant, false); }
export function naturalTree(scale = 1, variant = 0, distant = false): THREE.Group { return treeModel(scale, variant, distant, variant % 3 === 0); }
