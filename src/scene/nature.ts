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

// Every crown, branch and root has depth and shares the lighting of the battlefield.
export const TREE_SPECIES = ['pine', 'oak', 'birch', 'maple', 'willow'] as const;
type TreeSpecies = typeof TREE_SPECIES[number];
const canopyGeometries = new Map<string, THREE.BufferGeometry>();
function leafTexture(): THREE.DataTexture {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / 16), col = Math.floor((x + (row % 2) * 8) / 16);
    const u = ((x + (row % 2) * 8) % 16 - 8) / 8, v = (y % 16 - 8) / 8;
    const angle = Math.sin(row * 7 + col * 11), a = u * Math.cos(angle) - v * Math.sin(angle), b = u * Math.sin(angle) + v * Math.cos(angle);
    const leaf = Math.max(0, 1 - a * a / .8 - b * b / .3);
    const shade = .73 + .24 * Math.sqrt(leaf) + (Math.abs(b) < .06 && Math.abs(a) < .75 ? .02 : 0);
    const i = (y * size + x) * 4;
    pixels[i] = shade * 255; pixels[i + 1] = Math.min(255, (shade + .015) * 255); pixels[i + 2] = (shade - .025) * 255; pixels[i + 3] = 255;
  }
  const t = new THREE.DataTexture(pixels, size, size); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
const leafMap = leafTexture();
const leafMaterials = [0x3f733a, 0x629140, 0x8fa64b].map(color => new THREE.MeshStandardMaterial({ color, map: leafMap, bumpMap: leafMap, bumpScale: .018, vertexColors: true, roughness: .95 }));
leafMaterials.forEach(material => { material.userData.treeCanopy = true; });
const birchBark = new THREE.MeshStandardMaterial({ color: 0xdcd4b7, roughness: .95 });
const barkMarks = new THREE.MeshStandardMaterial({ color: 0x736956, roughness: 1 });
const branchGeometries = new Map<number, THREE.BufferGeometry>();
function branchGeometry(distant: boolean): THREE.BufferGeometry {
  const sides = distant ? 5 : 7;
  if (!branchGeometries.has(sides)) { const g = new THREE.CylinderGeometry(.55, 1, 1, sides); g.userData.shared = true; branchGeometries.set(sides, g); }
  return branchGeometries.get(sides)!;
}
function canopyGeometry(conifer: boolean, variant: number, distant: boolean): THREE.BufferGeometry {
  const key = `${conifer}-${variant % 3}-${distant}`;
  if (canopyGeometries.has(key)) return canopyGeometries.get(key)!;
  let g: THREE.BufferGeometry;
  if (conifer) {
    // Curved, scalloped branch skirts: full radial geometry instead of flat foliage cards.
    const radial = distant ? 8 : 14;
    const profile = distant ? [[0, -.25], [1, -.16], [.58, .25], [0, .73]] : [[0, -.25], [.82, -.23], [1, -.12], [.78, .08], [.44, .36], [0, .73]];
    const positions: number[] = [], indices: number[] = [];
    for (const [r, y] of profile) for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, lobe = 1 + .10 * Math.cos(a * 7 + variant);
      positions.push(Math.cos(a) * r * lobe, y + r * .065 * Math.cos(a * 7 + variant), Math.sin(a) * r * lobe);
    }
    for (let ring = 0; ring < profile.length - 1; ring++) for (let j = 0; j < radial; j++) {
      const a = ring * (radial + 1) + j, b = a + radial + 1; indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices);
  } else {
    const raw = new THREE.IcosahedronGeometry(1, distant ? 0 : 1); raw.deleteAttribute('normal'); raw.deleteAttribute('uv');
    g = mergeVertices(raw); raw.dispose();
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const relief = 1 + .065 * Math.sin(x * 6 + variant) * Math.cos(y * 4 - z * 5);
      p.setXYZ(i, x * relief, y * relief, z * relief);
    }
  }
  const p = g.getAttribute('position'), colors: number[] = [], uv: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const shade = conifer ? .78 + .22 * (y + .25) : .83 + .15 * (y + 1) / 2;
    colors.push(shade, shade, shade * .96); uv.push((Math.atan2(z, x) / Math.PI + 1) * 1.5, y * 2);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.shared = true; canopyGeometries.set(key, g); return g;
}
function treeModel(scale: number, variant: number, distant: boolean, species: TreeSpecies): THREE.Group {
  const key = `${species}-${variant % 3}-${distant}`;
  if (!trees.has(key)) {
    const tree = new THREE.Group(); tree.name = `adventure-${species}`; tree.userData.species = species;
    const phase = variant % 3 * 2.1, bark = species === 'birch' ? birchBark : natureMaterial('bark');
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !distant; m.receiveShadow = true; tree.add(m); return m;
    };
    const limb = (start: THREE.Vector3, end: THREE.Vector3, radius: number, mat: THREE.Material = bark) => {
      const direction = end.clone().sub(start), m = add(branchGeometry(distant), mat, 0, 0, 0);
      m.position.copy(start).add(end).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()); m.scale.set(radius, direction.length(), radius);
    };
    const crown = (x: number, y: number, z: number, rx: number, ry: number, rz: number, tint: number) => {
      const m = add(canopyGeometry(false, variant + tint, distant), leafMaterials[tint % 3], x, y, z); m.scale.set(rx, ry, rz); m.rotation.y = phase + tint * .8;
      if (!distant) for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5 + phase, lift = .30 + .22 * Math.sin(j * 2 + tint);
        const tuft = add(canopyGeometry(false, j, true), leafMaterials[(tint + j % 2) % 3], x + Math.cos(a) * rx * .85, y + ry * lift, z + Math.sin(a) * rz * .85);
        tuft.scale.set(rx * .42, ry * .16, rz * .30); tuft.rotation.set(.25 * Math.sin(a), a, .35 * Math.cos(a));
      }
    };
    const lean = Math.sin(phase) * .045, height = 1 + (variant % 3 - 1) * .07;
    limb(new THREE.Vector3(), new THREE.Vector3(lean, species === 'birch' ? 2.6 : 1.8, 0), species === 'oak' ? .12 : .075);
    if (!distant) for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2 + phase; limb(new THREE.Vector3(0, .20, 0), new THREE.Vector3(Math.cos(a) * .24, .025, Math.sin(a) * .24), .05);
    }
    if (species === 'pine') {
      for (let tier = 0; tier < 4; tier++) {
        const width = .51 - tier * .105, y = .80 + tier * .46;
        const skirt = add(canopyGeometry(true, variant + tier, distant), leafMaterials[tier % 2], lean, y, 0);
        skirt.scale.set(width, .95 - tier * .08, width); skirt.rotation.y = tier * .6 + phase;
        if (!distant && tier < 2) for (let j = 0; j < 3; j++) {
          const a = j * Math.PI * 2 / 3 + tier + phase;
          const bough = add(canopyGeometry(true, j, true), leafMaterials[(tier + j) % 2], lean + Math.cos(a) * width * .56, y - .04, Math.sin(a) * width * .56);
          bough.scale.set(width * .42, .50, width * .42); bough.rotation.set(.1 * Math.sin(a), a, .1 * Math.cos(a));
        }
      }
    } else if (species === 'birch') {
      limb(new THREE.Vector3(0, .4, 0), new THREE.Vector3(.19, 2.1, .06), .045);
      for (let j = 0; j < (distant ? 3 : 5); j++) {
        const a = j * 2.4 + phase; crown(Math.cos(a) * .15, 1.65 + j * .21, Math.sin(a) * .15, .27, .43, .26, 1 + j % 2);
      }
      if (!distant) for (let j = 0; j < 6; j++) limb(new THREE.Vector3(-.055, .3 + j * .30, .06), new THREE.Vector3(.045, .32 + j * .30, .06), .014, barkMarks);
    } else if (species === 'willow') {
      crown(0, 2.07, 0, .38, .32, .38, 1);
      for (let j = 0; j < (distant ? 4 : 7); j++) {
        const a = j * Math.PI * 2 / (distant ? 4 : 7) + phase, x = Math.cos(a) * .27, z = Math.sin(a) * .27;
        if (!distant) limb(new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(x, 1.98, z), .035);
        crown(x, 1.57 + .07 * Math.sin(j * 4), z, .24, .62, .24, j % 2);
      }
    } else {
      const maple = species === 'maple', count = distant ? 4 : 7;
      for (let j = 0; j < count; j++) {
        const a = j * 2.4 + phase, r = j === 0 ? 0 : .23, x = Math.cos(a) * r, z = Math.sin(a) * r;
        const y = (maple ? 1.78 : 1.67) + .16 * Math.sin(j * 3 + phase);
        if (!distant) limb(new THREE.Vector3(lean, .95, 0), new THREE.Vector3(x, y, z), .04);
        crown(x, y, z, .32, maple ? .43 : .36, .31, maple ? 1 + j % 2 : j % 2);
      }
      crown(0, maple ? 2.22 : 2.04, 0, .33, .37, .32, maple ? 2 : 1);
    }
    tree.scale.y = height; trees.set(key, tree);
  }
  const result = trees.get(key)!.clone(true); result.scale.multiplyScalar(scale); return result;
}
export function naturalPine(scale = 1, variant = 0, distant = false): THREE.Group { return treeModel(scale, variant, distant, 'pine'); }
export function naturalTree(scale = 1, variant = 0, distant = false): THREE.Group { return treeModel(scale, variant, distant, TREE_SPECIES[((variant % TREE_SPECIES.length) + TREE_SPECIES.length) % TREE_SPECIES.length]); }
