import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ENEMIES, TOWERS, type EnemyKind, type TowerKind } from '../game/config';
const mats = new Map<string, THREE.MeshStandardMaterial>();
const geos = new Map<string, THREE.BufferGeometry>();
const templates = new Map<string, THREE.Group>();
export function material(color: number, emissive = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${emissive}`; let m = mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: color === 0xe9b849 ? .38 : .83, metalness: color === 0xe9b849 ? .45 : 0, flatShading: true, emissive, emissiveIntensity: emissive ? .9 : 0 }); mats.set(key, m); } return m;
}
function geometry<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  if (!geos.has(key)) { const g = make(); g.userData.shared = true; geos.set(key, g); } return geos.get(key) as T;
}
export const box = (w: number, h: number, d: number): THREE.BoxGeometry => geometry(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cone = (r: number, h: number, sides = 6): THREE.ConeGeometry => geometry(`c${r},${h},${sides}`, () => new THREE.ConeGeometry(r, h, sides));
export const cylinder = (r: number, h: number, sides = 8): THREE.CylinderGeometry => geometry(`y${r},${h},${sides}`, () => new THREE.CylinderGeometry(r, r, h, sides));
export const orb = (r: number): THREE.IcosahedronGeometry => geometry(`orb${r}`, () => new THREE.IcosahedronGeometry(r, 0));
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
function makeTower(kind: TowerKind, level: number): THREE.Group {
  const g = new THREE.Group();
  mesh(g, cylinder(.70, .14, 8), 0x858c80, 0, .07, 0);
  mesh(g, box(.99, .17, .99), EDGE, 0, .22, 0);
  const height = kind === 'cannon' ? .9 : 1.5;
  mesh(g, box(.86, height, .86), STONE, 0, .31 + height / 2, 0); stoneBands(g, .86, .86, .31, height);
  for (const x of [-.44, .44]) for (const z of [-.44, .44]) mesh(g, box(.14, height, .14), EDGE, x, .31 + height / 2, z);
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
    for (const x of [-.30, .30]) { const wheel = mesh(turret, cylinder(.24, .10), WOOD, x, .25, -.04); wheel.rotation.z = Math.PI / 2; const axle = mesh(turret, cylinder(.08, .115), GOLD, x, .25, -.04); axle.rotation.z = Math.PI / 2; }
    mesh(turret, box(.56, .16, .68), WOOD_LIGHT, 0, .25, .02);
    const barrel = mesh(turret, cylinder(.255, .90, 12), 0x303f46, 0, .52, .24); barrel.rotation.x = Math.PI / 2 - .12; barrel.name = 'barrel';
    for (const z of [-.13, .55]) { const band = mesh(turret, torus(.258, .04, 5, 12), GOLD, 0, .52 + z * .1, z); band.rotation.x = -.12; }
    mesh(turret, circle(.20, 12), 0x15232b, 0, .58, .70);
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
    turret.scale.setScalar(level === 3 ? 1.10 : 1.04);
  }
  if (level === 3) {
    for (const x of [-.45, .45]) {
      mesh(g, cylinder(.065, .40, 6), GOLD, x, height + .81, -.44);
      mesh(g, octa(.09), TOWERS[kind].color, x, height + 1.06, -.44, kind === 'mage' ? 0x008da7 : 0);
    }
    mesh(g, box(.26, .12, .08), GOLD, 0, height + .23, .47);
    mesh(g, octa(.075), TOWERS[kind].color, 0, height + .24, .54);
  }
  compact(g, ['turret']); compact(turret, ['barrel']); return g;
}
export function towerModel(kind: TowerKind, level = 1): THREE.Group {
  const key = `tower-${kind}-${level}`; if (!templates.has(key)) templates.set(key, makeTower(kind, level)); return templates.get(key)!.clone(true);
}
function makeEnemy(kind: EnemyKind): THREE.Group {
  const g = new THREE.Group(), heavy = kind === 'beast' || kind === 'guardian', runner = kind === 'runner';
  const body = mesh(g, orb(heavy ? .41 : .34), heavy ? 0x454252 : 0x323242, 0, .47, runner ? -.08 : 0); body.scale.set(heavy ? 1.08 : 1, runner ? .75 : 1, runner ? 1.45 : 1);
  mesh(g, orb(.23), 0x423240, 0, .64, .30);
  mesh(g, box(.25, .11, .19), 0x692c40, 0, .50, .38);
  for (const x of [-.11, .11]) { mesh(g, box(.067, .055, .035), 0xff4d5c, x, .67, .50, 0xc72545); const fang = mesh(g, cone(.027, .10, 4), 0xd3c8b3, x, .49, .50); fang.rotation.z = Math.PI; }
  for (const x of [-.27, .27]) {
    const arm = mesh(g, box(.16, .33, .18), heavy ? 0x675a66 : 0x3b303d, x, .34, .04); arm.rotation.z = -x * 1.4;
    mesh(g, orb(heavy ? .18 : .12), heavy ? 0x782f45 : 0x513441, x, .56, -.02);
    const leg = mesh(g, box(.15, .24, .21), 0x252a33, x * .68, .14, .04); leg.name = x < 0 ? 'legL' : 'legR';
    mesh(g, cone(heavy ? .09 : .055, heavy ? .27 : .14, 4), 0xb48887, x * .62, .87, .20).rotation.z = -x * .8;
    if (heavy) mesh(g, cone(.075, .21, 4), 0x99475b, x, .74, -.06);
  }
  if (heavy) { mesh(g, box(.46, .30, .08), 0x626174, 0, .51, .31); mesh(g, box(.16, .12, .10), 0x9c3f5c, 0, .55, .37); }
  if (kind === 'guardian') {
    mesh(g, cone(.29, .29, 6), 0x693648, 0, .97, .12);
    for (const x of [-.25, .25]) { const horn = mesh(g, cone(.09, .38, 4), 0xc9a6a0, x, 1.16, .16); horn.rotation.z = -x * 1.4; }
    mesh(g, cylinder(.045, .7), WOOD, .47, .4, .16); mesh(g, box(.29, .26, .10), 0x9692a4, .47, .78, .16);
    const badge = mesh(g, octa(.09), 0xa35df1, 0, .56, .38, 0x622fc1); badge.scale.y = 1.3;
  }
  compact(g, ['legL', 'legR']); g.scale.setScalar(ENEMIES[kind].scale * 1.35); g.userData.healthHeight = kind === 'guardian' ? 1.55 : 1.22;
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
export function castleModel(): THREE.Group {
  const g = new THREE.Group(); mesh(g, box(3.75, .2, 3.05), 0x858d82, 0, .1, -1);
  for (const x of [-.97, .97]) { mesh(g, box(.82, 1.8, .68), STONE, x, .97, .04); const p = new THREE.Group(); p.position.x = x; stoneBands(p, .82, .68, .1, 1.8); g.add(p); }
  mesh(g, box(2.8, .52, .68), EDGE, 0, 2.06, .04);
  mesh(g, torus(.48, .13, 5, 13, Math.PI), EDGE, 0, 1.45, .45);
  mesh(g, box(.85, 1.46, .12), WOOD, 0, .76, -.08);
  for (const x of [-.29, -.145, 0, .145, .29]) mesh(g, box(.027, 1.37, .026), 0x513d2e, x, .73, -.01);
  for (const y of [.36, 1.0]) mesh(g, box(.79, .06, .03), DARK, 0, y, .006);
  for (const x of [-1.5, 1.5]) for (const z of [-1.9, .1]) {
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    mesh(p, box(.83, 2.28, .83), STONE, 0, 1.2, 0); stoneBands(p, .83, .83, .1, 2.2); crenellations(p, .86, 2.55);
    if (z > 0) { banner(p, 0, 1.5, .43, 1.25); mesh(p, box(.12, .32, .025), DARK, 0, .68, .435); }
    torch(p, 0, 2.75, 0);
  }
  for (const x of [-1.5, 1.5]) mesh(g, box(.41, 1.62, 1.8), STONE, x, .92, -.95);
  mesh(g, box(2.85, 1.67, .48), STONE, 0, .96, -1.9);
  mesh(g, box(1.35, 2.60, 1.15), STONE, 0, 1.55, -1.02);
  const keep = new THREE.Group(); keep.position.set(0, 0, -1.02); stoneBands(keep, 1.35, 1.15, .3, 2.6); g.add(keep);
  mesh(g, box(1.49, .18, 1.34), EDGE, 0, 2.92, -1.02);
  const roof = mesh(g, cone(1.06, .92, 4), BLUE, 0, 3.43, -1.02); roof.rotation.y = Math.PI / 4;
  mesh(g, cylinder(.028, .67), GOLD, 0, 4.17, -1.02);
  mesh(g, box(.53, .26, .028), BLUE, .24, 4.37, -1.02); mesh(g, box(.035, .20, .028), GOLD, .24, 4.37, -.999);
  for (const x of [-.33, .33]) { mesh(g, box(.15, .42, .026), DARK, x, 2.3, -.43); mesh(g, torus(.075, .025, 4, 8, Math.PI), EDGE, x, 2.51, -.40); }
  banner(g, 0, 1.43, -.425, 1.03); return g;
}
export function portalModel(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.01, 1.01]) {
    mesh(g, box(.62, 1.87, .75), MORTAR, x, .97, 0);
    for (let y = .35; y < 1.8; y += .34) mesh(g, box(.66, .025, .78), STONE, x, y, 0);
    torch(g, x, 2.00, 0);
  }
  mesh(g, box(2.58, .43, .77), STONE, 0, 1.97, 0);
  mesh(g, torus(.67, .20, 5, 12, Math.PI), 0x878982, 0, 1.13, .25);
  mesh(g, box(1.31, 1.65, .05), 0x202932, 0, .83, -.25);
  banner(g, -1.03, 1.05, .395, .83); banner(g, 1.03, 1.05, .395, .83);
  mesh(g, box(.18, .18, .07), 0x784752, 0, 2.03, .44); return g;
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
