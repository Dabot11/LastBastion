import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ENEMIES, TOWERS, type EnemyKind, type TowerKind } from '../game/config';
const mats = new Map<string, THREE.MeshStandardMaterial>();
const geos = new Map<string, THREE.BufferGeometry>();
const templates = new Map<string, THREE.Group>();
const skinTextures = new Map<string, THREE.DataTexture>();
function grainTexture(wood: boolean): THREE.DataTexture {
  const key = wood ? 'wood' : 'stone'; if (skinTextures.has(key)) return skinTextures.get(key)!;
  const pixels = new Uint8Array(128 * 128 * 4); let seed = 731;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const vein = wood ? Math.sin(x * .6 + Math.sin(y * .07) * 1.8) * 15 + Math.sin(x * 1.4) * 6 : Math.sin(x * .25 + y * .3) * 6;
    const value = Math.max(150, Math.min(255, 226 + vein + (seed >>> 24) / 255 * 19));
    const i = (y * 128 + x) * 4; pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, 128, 128); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
  skinTextures.set(key, texture); return texture;
}
export function material(color: number, emissive = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${emissive}`; let m = mats.get(key);
  if (!m) {
    const metal = [0xe9b849, 0x303f46, 0x626174, 0x9692a4, 0x454c4b].includes(color);
    m = new THREE.MeshStandardMaterial({ color, roughness: metal ? .38 : .86, metalness: metal ? .55 : 0, flatShading: false, emissive, emissiveIntensity: emissive ? .9 : 0 });
    const wood = [0x805737, 0xae8146, 0x513d2e, 0x674629, 0x93633b].includes(color);
    if (wood || [0xbebdab, 0xe1dac0, 0x95988a, 0x858d82, 0xa4afb5, 0xe8e0c7].includes(color)) { m.map = m.bumpMap = grainTexture(wood); m.bumpScale = wood ? .025 : .035; }
    mats.set(key, m);
  } return m;
}
function geometry<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  if (!geos.has(key)) { const g = make(); g.userData.shared = true; geos.set(key, g); } return geos.get(key) as T;
}
export const box = (w: number, h: number, d: number): THREE.BoxGeometry => geometry(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const softBox = (w: number, h: number, d: number): THREE.BufferGeometry => geometry(`soft${w},${h},${d}`, () => new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * .12));
export const cone = (r: number, h: number, sides = 6): THREE.ConeGeometry => geometry(`c${r},${h},${sides}`, () => new THREE.ConeGeometry(r, h, sides));
export const cylinder = (r: number, h: number, sides = 8): THREE.CylinderGeometry => geometry(`y${r},${h},${sides}`, () => new THREE.CylinderGeometry(r, r, h, sides));
export const orb = (r: number): THREE.IcosahedronGeometry => geometry(`orb${r}`, () => new THREE.IcosahedronGeometry(r, 1));
export function weatheredRock(radius: number, variant = 0): THREE.BufferGeometry {
  return geometry(`rock${radius},${variant}`, () => {
    const geo = new THREE.IcosahedronGeometry(radius, 1), p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const relief = 1 + .15 * Math.sin(x * 11 / radius + variant) * Math.cos(y * 8 / radius - z * 9 / radius) + .07 * Math.sin(z * 17 / radius + variant);
      p.setXYZ(i, x * relief, y * relief, z * relief);
    }
    geo.computeVertexNormals(); return geo;
  });
}
export const octa = (r: number): THREE.OctahedronGeometry => geometry(`octa${r}`, () => new THREE.OctahedronGeometry(r));
export const circle = (r: number, segments = 12): THREE.CircleGeometry => geometry(`circle${r},${segments}`, () => new THREE.CircleGeometry(r, segments));
export const torus = (r: number, tube: number, sides: number, segments: number, arc = Math.PI * 2): THREE.TorusGeometry => geometry(`torus${r},${tube},${sides},${segments},${arc}`, () => new THREE.TorusGeometry(r, tube, sides, segments, arc));
export function mesh(group: THREE.Group, geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, emissive = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, material(color, emissive)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}
let glowTexture: THREE.CanvasTexture | undefined;
const glowMats = new Map<number, THREE.SpriteMaterial>();
export function glow(color: number, size: number): THREE.Sprite {
  if (!glowTexture) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.16, '#ffffffc0'); gradient.addColorStop(.4, '#ffffff45'); gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64); glowTexture = new THREE.CanvasTexture(canvas);
  }
  if (!glowMats.has(color)) glowMats.set(color, new THREE.SpriteMaterial({ map: glowTexture, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .75 }));
  const sprite = new THREE.Sprite(glowMats.get(color)!); sprite.scale.setScalar(size); sprite.userData.baseSize = size; return sprite;
}
// Each body uses a handful of draw calls. Limbs, turrets and billboards remain independent.
function compact(group: THREE.Group, exclude: string[] = []): void {
  group.updateMatrixWorld(true); const inverse = group.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>(), removed: THREE.Mesh[] = [];
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    let parent: THREE.Object3D | null = o; while (parent && parent !== group) { if (exclude.includes(parent.name)) return; parent = parent.parent; }
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const m = o.material as THREE.Material, list = batches.get(m) ?? []; list.push(geo); batches.set(m, list); removed.push(o);
  });
  removed.forEach(m => m.removeFromParent());
  for (const [m, parts] of batches) {
    const geo = mergeGeometries(parts); if (!geo) throw new Error('Model geometry could not be merged'); geo.userData.shared = true;
    const batch = new THREE.Mesh(geo, m); batch.castShadow = batch.receiveShadow = true; group.add(batch); parts.forEach(p => p.dispose());
  }
}
const STONE = 0xbebdab, EDGE = 0xe1dac0, MORTAR = 0x95988a, DARK = 0x454c4b, WOOD = 0x805737, WOOD_LIGHT = 0xae8146, BLUE = 0x2457a3, GOLD = 0xe9b849;
export function banner(group: THREE.Group, x: number, y: number, z: number, scale = 1): void {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); group.add(g);
  const geo = geometry('banner', () => { const shape = new THREE.Shape(); shape.moveTo(-.19, .34); shape.lineTo(.19, .34); shape.lineTo(.19, -.22); shape.lineTo(0, -.4); shape.lineTo(-.19, -.22); shape.closePath(); return new THREE.ShapeGeometry(shape); });
  mesh(g, geo, BLUE, 0, 0, 0);
  for (const dx of [-.17, .17]) mesh(g, box(.025, .55, .017), GOLD, dx, .065, .012);
  mesh(g, box(.40, .035, .025), GOLD, 0, .34, .012);
  const emblem = mesh(g, box(.13, .13, .03), GOLD, 0, .06, .025); emblem.rotation.z = Math.PI / 4;
  mesh(g, box(.036, .32, .03), GOLD, 0, 0, .035);
}
export function torch(group: THREE.Group, x: number, y: number, z: number): void {
  mesh(group, cylinder(.06, .38), WOOD, x, y, z);
  mesh(group, cylinder(.14, .10), DARK, x, y + .17, z);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) mesh(group, box(.04, .16, .04), GOLD, x + Math.cos(angle) * .11, y + .23, z + Math.sin(angle) * .11);
  mesh(group, cone(.115, .29, 5), 0xffb13b, x, y + .33, z, 0xff7800);
  mesh(group, cone(.05, .21, 5), 0xfff2ac, x, y + .32, z, 0xffbd4c);
  const light = glow(0xffb334, .7); light.position.set(x, y + .31, z); light.userData.flame = true; group.add(light);
}
function stoneBands(g: THREE.Group, width: number, depth: number, bottom: number, height: number): void {
  for (let y = bottom + .27; y < bottom + height; y += .33) {
    mesh(g, box(width + .008, .018, .008), MORTAR, 0, y, depth / 2 + .005);
    mesh(g, box(.008, .018, depth + .008), MORTAR, width / 2 + .005, y, 0);
    const shift = Math.round(y * 3) % 2 ? .18 : -.18;
    for (const x of [-width * .28 + shift, width * .23 + shift]) if (Math.abs(x) < width / 2 - .03) mesh(g, box(.016, .27, .009), MORTAR, x, y - .14, depth / 2 + .01);
  }
}
function crenellations(g: THREE.Group, width: number, y: number): void {
  mesh(g, box(width + .12, .12, width + .12), EDGE, 0, y - .14, 0);
  for (const x of [-width / 2, 0, width / 2]) for (const z of [-width / 2, width / 2]) mesh(g, box(.22, .29, .22), EDGE, x, y, z);
  for (const x of [-width / 2, width / 2]) mesh(g, box(.22, .29, .22), EDGE, x, y, 0);
}
function person(g: THREE.Group, mage: boolean): void {
  mesh(g, cone(.19, .43, 7), mage ? 0x2e4c95 : BLUE, 0, .30, 0);
  mesh(g, cylinder(.17, .08, 6), mage ? GOLD : WOOD, 0, .18, 0);
  mesh(g, orb(.125), 0xe2b181, 0, .59, .035);
  for (const x of [-.043, .043]) mesh(g, box(.018, .025, .018), DARK, x, .61, .14);
  if (mage) { mesh(g, cone(.18, .32, 6), BLUE, 0, .80, -.025); mesh(g, box(.25, .16, .09), BLUE, 0, .6, -.07); }
  else { mesh(g, cylinder(.15, .09, 6), DARK, 0, .72, 0); mesh(g, cone(.16, .16, 6), BLUE, 0, .8, 0); }
  for (const x of [-.09, .09]) mesh(g, box(.10, .13, .15), DARK, x, .065, .025);
  for (const x of [-.20, .20]) { const arm = mesh(g, box(.10, .26, .10), BLUE, x, .41, .08); arm.rotation.z = -x * 1.6; mesh(g, orb(.052), 0xe2b181, x * .9, .36, .17); }
}
const levelShields = new Map<number, THREE.SpriteMaterial>();
function levelShield(level: number): THREE.Sprite {
  if (!levelShields.has(level)) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 152;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath(); ctx.moveTo(14, 10); ctx.lineTo(114, 10); ctx.lineTo(108, 90); ctx.quadraticCurveTo(100, 119, 64, 141); ctx.quadraticCurveTo(28, 119, 20, 90); ctx.closePath();
    ctx.fillStyle = ['#253c43', '#21496c', '#30265b'][level - 1]; ctx.fill();
    ctx.lineWidth = 9; ctx.strokeStyle = ['#b7a275', '#d4e6ea', '#f9d37d'][level - 1]; ctx.stroke();
    ctx.font = 'bold 76px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff4d9'; ctx.fillText(String(level), 64, 70);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    levelShields.set(level, new THREE.SpriteMaterial({ map: texture, depthWrite: false, toneMapped: false }));
  }
  const sprite = new THREE.Sprite(levelShields.get(level)!); sprite.name = 'tower-level-shield'; sprite.userData.level = level;
  sprite.scale.set(.62, .74, 1); return sprite;
}
function makeTower(kind: TowerKind, level: number): THREE.Group {
  const g = new THREE.Group();
  const stone = level === 3 ? 0xe8e0c7 : level === 2 ? 0xa4afb5 : STONE;
  const base = mesh(g, cylinder(.70 + (level - 1) * .07, .14 + (level - 1) * .04, 6), level === 3 ? GOLD : level === 2 ? DARK : 0x858c80, 0, .07 + (level - 1) * .02, 0); base.rotation.y = Math.PI / 2;
  if (level >= 2) mesh(g, cylinder(.68, .08, 6), level === 3 ? EDGE : 0x9692a4, 0, .20, 0).rotation.y = Math.PI / 2;
  mesh(g, softBox(.99, .17, .99), EDGE, 0, .22, 0);
  const height = kind === 'cannon' ? .9 : 1.5;
  mesh(g, softBox(.86, height, .86), stone, 0, .31 + height / 2, 0); stoneBands(g, .86, .86, .31, height);
  for (const x of [-.44, .44]) for (const z of [-.44, .44]) mesh(g, softBox(.14, height, .14), EDGE, x, .31 + height / 2, z);
  for (const x of [-.29, .29]) mesh(g, softBox(.17, .045, .017), 0x678562, x, .37, .447);
  crenellations(g, .87, height + .60);
  mesh(g, box(.16, .40, .025), DARK, 0, .93, .44);
  mesh(g, torus(.085, .025, 4, 8, Math.PI), EDGE, 0, 1.13, .45);
  banner(g, .29, .99, .475, .78);
  const turret = new THREE.Group(); turret.name = 'turret'; turret.position.y = height + .43; turret.userData.restY = turret.position.y; g.add(turret);
  if (kind === 'archer' || kind === 'mage') {
    person(turret, kind === 'mage');
    if (kind === 'mage') {
      mesh(turret, cylinder(.03, .95), WOOD_LIGHT, .30, .48, .13);
      const orbHolder = mesh(turret, torus(.14, .024, 4, 10), GOLD, .30, .99, .13); orbHolder.rotation.x = Math.PI / 2;
      mesh(turret, octa(.115), 0x59d8ff, .30, 1.02, .13, 0x009ed1);
      const light = glow(0x44ccff, .54); light.position.set(.30, 1.03, .13); turret.add(light);
      for (const x of [-.32, .32]) mesh(g, box(.055, .34, .026), 0x83c9de, x, 1.44, .48, 0x004b72);
    } else {
      const bow = mesh(turret, torus(.27, .025, 4, 13, Math.PI), WOOD_LIGHT, .27, .48, .31); bow.rotation.y = Math.PI / 2; bow.rotation.z = Math.PI / 2;
      mesh(turret, box(.016, .49, .015), 0xe7dab7, .27, .48, .31);
      mesh(turret, box(.026, .026, .47), WOOD, .27, .48, .35);
    }
  } else if (kind === 'crossbow') {
    mesh(turret, cylinder(.11, .39), WOOD, 0, .19, 0);
    mesh(turret, box(.19, .13, 1.02), WOOD, 0, .43, .10);
    for (const x of [-.34, .34]) { const brace = mesh(turret, box(.10, .10, .6), WOOD_LIGHT, x, .47, .32); brace.rotation.y = -x * 1.2; }
    const arms = mesh(turret, torus(.47, .04, 5, 13, Math.PI), WOOD_LIGHT, 0, .47, .34); arms.rotation.x = Math.PI / 2; arms.rotation.z = Math.PI;
    mesh(turret, box(.89, .017, .017), 0xf1dab1, 0, .47, .34);
    mesh(turret, box(.038, .038, .98), 0xa7aa9c, 0, .52, .16);
    mesh(turret, cone(.065, .15, 4), DARK, 0, .53, .72).rotation.x = Math.PI / 2;
  } else {
    for (const x of [-.33, .33]) {
      const wheel = mesh(turret, cylinder(.27, .10, 20), WOOD, x, .27, -.10); wheel.rotation.z = Math.PI / 2;
      mesh(turret, torus(.255, .023, 6, 24), DARK, x * 1.15, .27, -.1).rotation.y = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const spoke = mesh(turret, softBox(.018, .45, .026), WOOD_LIGHT, x * 1.17, .27, -.1); spoke.rotation.x = i * Math.PI / 4; }
      const axle = mesh(turret, cylinder(.067, .115, 12), GOLD, x * 1.18, .27, -.10); axle.rotation.z = Math.PI / 2;
    }
    mesh(turret, softBox(.56, .18, .83), WOOD, 0, .26, -.03);
    for (const x of [-.23, .23]) { const brace = mesh(turret, softBox(.11, .34, .5), WOOD_LIGHT, x, .4, .015); brace.rotation.x = -.15; }
    const barrel = mesh(turret, cylinder(.255, .90, 24), 0x303f46, 0, .52, .24); barrel.rotation.x = Math.PI / 2 - .12; barrel.name = 'barrel';
    for (const z of [-.13, .12, .55, .69]) { const band = mesh(turret, torus(.258, .025, 6, 24), GOLD, 0, .52 + z * .1, z); band.rotation.x = -.12; }
    mesh(turret, circle(.205, 24), 0x15232b, 0, .603, .697).rotation.x = -.12;
    mesh(turret, torus(.19, .013, 6, 24), 0x626174, 0, .603, .710).rotation.x = -.12;
    torch(g, -.43, 1.04, -.4);
  }
  const muzzle = new THREE.Object3D(); muzzle.name = 'muzzle'; muzzle.position.set(kind === 'mage' ? .3 : kind === 'archer' ? .27 : 0, kind === 'mage' ? 1.03 : .52, kind === 'mage' ? .13 : .74); turret.add(muzzle);
  for (let i = 1; i < level; i++) { mesh(g, box(1.03, .06, 1.03), GOLD, 0, .48 + i * .36, 0); mesh(g, octa(.055), GOLD, -.14 + i * .14, height + .30, .53); }
  if (level >= 2) {
    for (const x of [-.44, .44]) for (const z of [-.44, .44]) {
      mesh(g, box(.17, .15, .17), GOLD, x, height + .43, z);
      mesh(g, box(.06, height * .6, .06), EDGE, x, height * .5 + .35, z);
    }
    banner(g, -.29, .98, .48, .65);
    turret.scale.setScalar(level === 3 ? 1.23 : 1.12);
    for (const x of [-.46, .46]) { mesh(g, softBox(.14, height * .8, .16), level === 3 ? GOLD : DARK, x, .35 + height * .4, .42); }
  }
  if (level === 3) {
    for (const x of [-.4, .4]) for (const z of [-.4, .4]) mesh(g, cylinder(.12, .22, 6), GOLD, x, height + .68, z);
    for (const x of [-.45, .45]) {
      mesh(g, cylinder(.065, .40, 6), GOLD, x, height + .81, -.44);
      mesh(g, octa(.09), TOWERS[kind].color, x, height + 1.06, -.44, kind === 'mage' ? 0x008da7 : 0);
    }
    mesh(g, box(.26, .12, .08), GOLD, 0, height + .23, .47);
    mesh(g, octa(.075), TOWERS[kind].color, 0, height + .24, .54);
  }
  const shield = levelShield(level); shield.position.set(-.51, height + .15, .60); g.add(shield);
  g.userData.level = level;
  compact(g, ['turret']); compact(turret, ['barrel']); return g;
}
export function towerModel(kind: TowerKind, level = 1): THREE.Group {
  const key = `tower-${kind}-${level}`; if (!templates.has(key)) templates.set(key, makeTower(kind, level)); return templates.get(key)!.clone(true);
}
function makeEnemy(kind: EnemyKind): THREE.Group {
  const g = new THREE.Group(), heavy = kind === 'beast' || kind === 'guardian', runner = kind === 'runner';
  const skin = runner ? 0x6d596b : heavy ? 0x687566 : 0x79916d, armor = heavy ? 0x626174 : 0x674629;
  const torso = mesh(g, softBox(heavy ? .58 : .43, heavy ? .47 : .4, .33), armor, 0, .51, 0); torso.rotation.x = runner ? .16 : .035;
  mesh(g, orb(.17), skin, 0, .87, .075).scale.set(1.12, 1.16, 1);
  mesh(g, softBox(.3, .11, .13), skin, 0, .78, .18);
  mesh(g, softBox(.22, .042, .016), 0x302d35, 0, .777, .252);
  for (const x of [-.082, .082]) {
    mesh(g, softBox(.054, .034, .025), 0xff704e, x, .89, .225, 0xc72545);
    const brow = mesh(g, softBox(.12, .043, .06), skin, x, .931, .21); brow.rotation.z = -x * 1.3;
    mesh(g, cone(.021, .08, 6), 0xe1dac0, x, .777, .26);
    const ear = mesh(g, cone(.05, .14, 6), skin, x * 2.5, .90, .03); ear.rotation.z = -Math.sign(x) * 1.2;
  }
  mesh(g, softBox(.48, .055, .37), 0x303f46, 0, .35, 0);
  mesh(g, softBox(.075, .075, .022), GOLD, .025, .35, .201);
  for (const x of [-.12, .12]) {
    const skirt = mesh(g, softBox(.17, .19, .08), runner ? 0x513d62 : 0x805737, x, .28, .14); skirt.rotation.z = -x * .3;
  }
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = side < 0 ? 'armL' : 'armR'; arm.position.set(side * (heavy ? .36 : .29), .67, 0); g.add(arm);
    mesh(arm, orb(heavy ? .15 : .10), armor, 0, -.01, 0);
    mesh(arm, softBox(.12, .29, .14), skin, 0, -.18, .025);
    mesh(arm, softBox(.14, .1, .17), 0x454c4b, 0, -.27, .055);
    mesh(arm, orb(.071), skin, 0, -.34, .09);
    if (side > 0) {
      mesh(arm, cylinder(.025, .53, 8), WOOD, 0, -.17, .15);
      if (kind === 'guardian' || kind === 'beast') {
        mesh(arm, softBox(heavy ? .3 : .2, .2, .085), 0x9692a4, .09, .05, .15);
        mesh(arm, cone(.065, .18, 6), 0xd3d6d1, .25, .05, .15).rotation.z = -Math.PI / 2;
      } else if (runner) { mesh(arm, cone(.053, .37, 4), 0x9692a4, 0, .14, .15); }
      else { mesh(arm, orb(.11), 0x674629, 0, .095, .15); }
    } else if (heavy) {
      mesh(arm, softBox(.23, .31, .075), 0x303f46, 0, -.2, .21);
      mesh(arm, orb(.055), 0x9692a4, 0, -.2, .26);
    }
    const leg = new THREE.Group(); leg.name = side < 0 ? 'legL' : 'legR'; leg.position.set(side * .14, .34, 0); g.add(leg);
    mesh(leg, softBox(.14, .24, .16), 0x343943, 0, -.12, 0);
    mesh(leg, softBox(.18, .12, .25), 0x252a33, 0, -.285, .035);
  }
  if (heavy) {
    mesh(g, softBox(.52, .34, .085), 0x626174, 0, .54, .18);
    for (const x of [-.18, .18]) for (const y of [.41, .66]) mesh(g, orb(.028), 0xe1dac0, x, y, .239);
    mesh(g, softBox(.08, .28, .035), kind === 'guardian' ? 0x9c3f5c : 0x9692a4, 0, .54, .24);
    mesh(g, softBox(.39, .14, .32), 0x303f46, 0, 1.01, .015);
    for (const side of [-1, 1]) {
      const horn = mesh(g, cone(.068, kind === 'guardian' ? .36 : .20, 8), 0xd6c8a8, side * .20, 1.16, .025); horn.rotation.z = -side * .5;
    }
  } else {
    mesh(g, orb(.188), runner ? 0x513d62 : 0x454c4b, 0, 1.00, -.009).scale.y = .47;
    const strap = mesh(g, softBox(.05, .4, .022), WOOD_LIGHT, -.06, .53, .185); strap.rotation.z = .35;
    if (runner) { const cape = mesh(g, softBox(.31, .43, .06), 0x513d62, 0, .48, -.22); cape.rotation.x = .3; }
  }
  if (kind === 'guardian') mesh(g, octa(.074), 0xa35df1, 0, .57, .28, 0x622fc1);
  compact(g, ['legL', 'legR', 'armL', 'armR']);
  for (const name of ['legL', 'legR', 'armL', 'armR']) compact(g.getObjectByName(name) as THREE.Group);
  g.scale.setScalar(ENEMIES[kind].scale * 1.35); g.userData.healthHeight = kind === 'guardian' ? 1.62 : 1.43;
  return g;
}
export function enemyModel(kind: EnemyKind): THREE.Group {
  const key = `enemy-${kind}`; if (!templates.has(key)) templates.set(key, makeEnemy(kind)); return templates.get(key)!.clone(true);
}
export function pine(scale = 1): THREE.Group {
  const g = new THREE.Group(); mesh(g, cylinder(.09, .86, 5), WOOD, 0, .43, 0);
  const greens = [0x245d37, 0x2c773d, 0x3e9145, 0x64a447];
  for (let i = 0; i < 4; i++) {
    const crown = geometry(`pine-crown-${i}`, () => {
      const geo = new THREE.ConeGeometry(.55 - i * .10, 1.12 - i * .09, 10);
      const positions = geo.getAttribute('position');
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j), z = positions.getZ(j), angle = Math.atan2(z, x);
        const lobe = 1 + .14 * Math.cos(angle * 5 + i);
        positions.setXYZ(j, x * lobe, positions.getY(j), z * lobe);
      }
      geo.computeVertexNormals(); return geo;
    });
    const foliage = mesh(g, crown, greens[i], Math.sin(i * 3) * .035, 1.01 + i * .40, Math.cos(i * 3) * .04); foliage.rotation.y = i * .53; foliage.scale.z = .93;
    if (i < 3) for (const side of [-1, 1]) {
      const branch = mesh(g, cone(.20 - i * .04, .60 - i * .07, 7), greens[i], side * (.30 - i * .055), .95 + i * .43, side * .15);
      branch.rotation.z = -side * .18; branch.rotation.y = i * .9;
    }
  }
  g.scale.setScalar(scale); return g;
}
export function cottage(city = false): THREE.Group {
  const g = new THREE.Group();
  mesh(g, box(1.08, .93, .86), city ? EDGE : 0xe3d1ab, 0, .465, 0);
  for (const x of [-.48, .48]) mesh(g, box(.065, .94, .88), WOOD, x, .47, 0);
  for (const y of [.15, .81]) mesh(g, box(1.1, .055, .88), WOOD, 0, y, 0);
  const roof = mesh(g, cone(.90, .63, 4), city ? BLUE : 0xa15f43, 0, 1.22, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = .91;
  mesh(g, box(.27, .48, .026), WOOD, 0, .25, .443);
  for (const x of [-.34, .34]) { mesh(g, box(.18, .23, .026), 0x648c91, x, .59, .45); mesh(g, box(.026, .24, .03), EDGE, x, .59, .469); }
  mesh(g, box(.16, .38, .16), STONE, -.30, 1.41, -.12); return g;
}
export function projectileModel(kind: TowerKind): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'mage') { mesh(g, orb(.11), 0x72ddff, 0, 0, 0, 0x12b4e2); const light = glow(0x50ceff, .58); g.add(light); for (const [z, size] of [[-.18, .37], [-.32, .22]]) { const trail = glow(0x4bb4f5, size); trail.position.z = z; g.add(trail); } }
  else if (kind === 'cannon') { mesh(g, orb(.13), 0x27363d, 0, 0, 0); mesh(g, orb(.055), 0xffc765, 0, 0, -.13, 0xff8b1c); }
  else {
    const shaft = mesh(g, cylinder(kind === 'crossbow' ? .025 : .016, kind === 'crossbow' ? .58 : .4, 5), WOOD_LIGHT, 0, 0, 0); shaft.rotation.x = Math.PI / 2;
    const tip = mesh(g, cone(kind === 'crossbow' ? .07 : .045, .15, 4), 0xc0c9be, 0, 0, kind === 'crossbow' ? .36 : .27); tip.rotation.x = Math.PI / 2;
    for (const x of [-.05, .05]) { const feather = mesh(g, box(.014, .08, .09), 0xe6e1c2, x, 0, -.18); feather.rotation.z = -x * 5; }
  }
  g.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = false; o.receiveShadow = false; } }); return g;
}
