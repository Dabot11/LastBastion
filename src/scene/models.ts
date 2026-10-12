import * as THREE from 'three';
import { ENEMIES, type EnemyKind, type TowerKind } from '../game/config';
const mats = new Map<string, THREE.MeshStandardMaterial>();
const geos = new Map<string, THREE.BufferGeometry>();
export function material(color: number, emissive = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${emissive}`; let m = mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: .84, flatShading: true, emissive, emissiveIntensity: emissive ? 1.4 : 0 }); mats.set(key, m); } return m;
}
export function box(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `b${w},${h},${d}`; if (!geos.has(key)) geos.set(key, new THREE.BoxGeometry(w, h, d)); return geos.get(key) as THREE.BoxGeometry;
}
export function cone(r: number, h: number, sides = 6): THREE.ConeGeometry {
  const key = `c${r},${h},${sides}`; if (!geos.has(key)) geos.set(key, new THREE.ConeGeometry(r, h, sides)); return geos.get(key) as THREE.ConeGeometry;
}
export function cylinder(r: number, h: number, sides = 8): THREE.CylinderGeometry {
  const key = `y${r},${h},${sides}`; if (!geos.has(key)) geos.set(key, new THREE.CylinderGeometry(r, r, h, sides)); return geos.get(key) as THREE.CylinderGeometry;
}

export function orb(r: number): THREE.IcosahedronGeometry {
  const key = `orb${r}`; if (!geos.has(key)) geos.set(key, new THREE.IcosahedronGeometry(r, 0)); return geos.get(key) as THREE.IcosahedronGeometry;
}
export function octa(r: number): THREE.OctahedronGeometry {
  const key = `octa${r}`; if (!geos.has(key)) geos.set(key, new THREE.OctahedronGeometry(r)); return geos.get(key) as THREE.OctahedronGeometry;
}
export function circle(r: number, segments = 12): THREE.CircleGeometry {
  const key = `circle${r},${segments}`; if (!geos.has(key)) geos.set(key, new THREE.CircleGeometry(r, segments)); return geos.get(key) as THREE.CircleGeometry;
}
export function torus(r: number, tube: number, sides: number, segments: number, arc = Math.PI * 2): THREE.TorusGeometry {
  const key = `torus${r},${tube},${sides},${segments},${arc}`; if (!geos.has(key)) geos.set(key, new THREE.TorusGeometry(r, tube, sides, segments, arc)); return geos.get(key) as THREE.TorusGeometry;
}

export function mesh(group: THREE.Group, geometry: THREE.BufferGeometry, color: number, x: number, y: number, z: number, emissive = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material(color, emissive)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}
const STONE = 0xd1c8ad, EDGE = 0xe5dcc5, DARK = 0x6c665d, WOOD = 0x835634, BLUE = 0x214f98, GOLD = 0xf6bf55;
export function banner(group: THREE.Group, x: number, y: number, z: number): void {
  mesh(group, box(.33, .65, .035), BLUE, x, y, z);
  mesh(group, box(.04, .34, .045), GOLD, x, y, z + .028);
  mesh(group, box(.17, .045, .045), GOLD, x, y + .06, z + .03);
  const tip = mesh(group, cone(.19, .2, 3), BLUE, x, y - .38, z); tip.rotation.z = Math.PI;
}
export function torch(group: THREE.Group, x: number, y: number, z: number): void {
  mesh(group, cylinder(.06, .43), WOOD, x, y, z);
  mesh(group, cone(.13, .23, 5), 0xff941f, x, y + .26, z, 0xff7400);
  mesh(group, cone(.055, .16, 5), 0xfff1a0, x, y + .32, z, 0xffbb33);
}
function crenellations(g: THREE.Group, width: number, y: number): void {
  for (const x of [-width / 2, 0, width / 2]) for (const z of [-width / 2, width / 2]) mesh(g, box(.23, .3, .23), EDGE, x, y, z);
  for (const x of [-width / 2, width / 2]) mesh(g, box(.23, .3, .23), EDGE, x, y, 0);
}
function person(g: THREE.Group, mage: boolean): void {
  mesh(g, cone(.2, .4, 6), BLUE, 0, .27, 0);
  mesh(g, cylinder(.12, .2, 6), mage ? BLUE : 0xd7ac7f, 0, .57, 0);
  if (mage) mesh(g, cone(.15, .24, 6), BLUE, 0, .73, 0);
  else mesh(g, cone(.16, .16, 6), BLUE, 0, .73, 0);
  for (const x of [-.08, .08]) mesh(g, box(.09, .16, .1), 0x373e44, x, .04, 0);
}
export function towerModel(kind: TowerKind, level = 1): THREE.Group {
  const g = new THREE.Group();
  mesh(g, box(1.22, .2, 1.22), DARK, 0, .1, 0);
  mesh(g, box(1.06, .17, 1.06), EDGE, 0, .25, 0);
  const height = kind === 'cannon' ? .85 : 1.4;
  mesh(g, box(.85, height, .85), STONE, 0, .3 + height / 2, 0);
  for (const x of [-.42, .42]) for (const z of [-.42, .42]) mesh(g, box(.16, height, .16), EDGE, x, .3 + height / 2, z);
  mesh(g, box(.97, .15, .97), EDGE, 0, .34 + height, 0);
  crenellations(g, .86, height + .58);
  mesh(g, box(.2, .43, .04), 0x53534c, 0, .9, .438);
  banner(g, .28, 1.04, .46);
  const turret = new THREE.Group(); turret.name = 'turret'; turret.position.y = height + .42; g.add(turret);
  if (kind === 'archer' || kind === 'mage') {
    person(turret, kind === 'mage');
    if (kind === 'mage') {
      mesh(turret, cylinder(.035, .85), GOLD, .3, .43, .12);
      mesh(turret, octa(.13), 0x66e7ff, .3, .92, .12, 0x00aaff);
      mesh(turret, box(.3, .07, .07), BLUE, .17, .43, .08);
    } else {
      const bow = mesh(turret, torus(.24, .033, 4, 9, Math.PI), WOOD, .25, .45, .25); bow.rotation.y = Math.PI / 2;
      mesh(turret, box(.035, .035, .48), EDGE, .25, .47, .27);
    }
  } else if (kind === 'crossbow') {
    mesh(turret, box(.17, .43, .2), WOOD, 0, .26, 0);
    mesh(turret, box(.22, .13, .94), WOOD, 0, .54, .08);
    const arms = mesh(turret, torus(.49, .055, 5, 10, Math.PI), WOOD, 0, .55, .32); arms.rotation.x = Math.PI / 2; arms.rotation.z = Math.PI;
    mesh(turret, box(.86, .025, .025), EDGE, 0, .55, .33);
    mesh(turret, box(.04, .04, .83), 0x444b52, 0, .62, .12);
  } else {
    for (const x of [-.29, .29]) { const wheel = mesh(turret, cylinder(.24, .13), WOOD, x, .25, -.07); wheel.rotation.z = Math.PI / 2; }
    const barrel = mesh(turret, cylinder(.23, .87, 10), 0x354149, 0, .47, .22); barrel.rotation.x = Math.PI / 2 - .13;
    const lip = mesh(turret, torus(.235, .05, 5, 10), GOLD, 0, .53, .67);
    lip.rotation.x = -.13;
    mesh(turret, circle(.19, 10), 0x151e23, 0, .53, .69);
  }
  for (let i = 1; i < level; i++) {
    mesh(g, box(.1, .12, .06), GOLD, -.22 + i * .13, height + .3, .51);
    mesh(g, box(1 + i * .03, .07, 1 + i * .03), GOLD, 0, .45 + i * .38, 0);
  }
  return g;
}
export function enemyModel(kind: EnemyKind): THREE.Group {
  const g = new THREE.Group(), armor = kind === 'beast' || kind === 'guardian';
  const body = mesh(g, orb(.4), armor ? 0x36303b : 0x29283c, 0, .5, 0); body.scale.set(1, 1, kind === 'runner' ? 1.55 : 1);
  mesh(g, orb(.25), 0x302638, 0, .64, .33);
  for (const x of [-.12, .12]) mesh(g, box(.07, .06, .055), 0xff334c, x, .7, .54, 0xb60020);
  for (const x of [-.28, .28]) {
    const arm = mesh(g, box(.19, .41, .2), armor ? 0x554553 : 0x30283b, x, .39, .04); arm.rotation.z = -x;
    const leg = mesh(g, box(.16, .28, .22), 0x282534, x * .65, .13, 0); leg.name = x < 0 ? 'legL' : 'legR';
    if (armor) mesh(g, cone(.14, .28, 4), 0x91283a, x, .87, .05);
  }
  if (kind === 'guardian') { mesh(g, cone(.3, .37, 5), 0x7b2947, 0, .94, .07); mesh(g, octa(.12), 0xca67ff, 0, .62, -.34, 0x7829af); }
  g.scale.setScalar(ENEMIES[kind].scale); return g;
}
export function pine(scale = 1): THREE.Group {
  const g = new THREE.Group(); mesh(g, cylinder(.09, .65, 5), WOOD, 0, .32, 0);
  mesh(g, cone(.66, 1.35, 6), 0x346b46, 0, 1.05, 0);
  mesh(g, cone(.54, 1.17, 6), 0x3e8151, 0, 1.6, 0);
  mesh(g, cone(.37, .98, 6), 0x51965b, 0, 2.08, 0);
  g.scale.setScalar(scale); return g;
}
export function castleModel(): THREE.Group {
  const g = new THREE.Group();
  mesh(g, box(3.4, .25, 3), DARK, 0, .12, -1);
  // Two gate pillars leave a real opening aligned with the end of the route.
  for (const x of [-.92, .92]) mesh(g, box(.85, 1.8, .65), STONE, x, .95, .03);
  mesh(g, box(2.7, .5, .66), EDGE, 0, 2.1, .03);
  const arch = mesh(g, torus(.48, .16, 4, 10, Math.PI), EDGE, 0, 1.44, .43);
  arch.rotation.z = 0;
  mesh(g, box(.83, 1.42, .13), WOOD, 0, .73, -.15);
  for (const x of [-.26, 0, .26]) mesh(g, box(.035, 1.34, .02), 0x553a25, x, .71, -.07);
  for (const x of [-1.5, 1.5]) for (const z of [-1.9, .1]) {
    mesh(g, box(.85, 2.35, .85), STONE, x, 1.18, z);
    mesh(g, box(.97, .18, .97), EDGE, x, 2.36, z);
    const crown = new THREE.Group(); crown.position.set(x, 0, z); crenellations(crown, .84, 2.6); g.add(crown);
    if (z > 0) banner(g, x, 1.6, z + .45);
    torch(g, x, 2.69, z);
  }
  for (const x of [-1.5, 1.5]) mesh(g, box(.4, 1.5, 1.8), STONE, x, .8, -.95);
  mesh(g, box(2.8, 1.6, .5), STONE, 0, .85, -1.9);
  mesh(g, box(1.45, .43, 1.45), EDGE, 0, .68, -1.05);
  const crystal = mesh(g, octa(.75), 0x18bdde, 0, 2.02, -1.05, 0x006c99); crystal.scale.y = 1.65; crystal.name = 'crystal';
  for (const x of [-.62, .62]) { const shard = mesh(g, octa(.3), 0x30bce7, x, 1.27, -.95, 0x006ba6); shard.scale.y = 1.65; shard.rotation.z = -x / 2; }
  return g;
}
export function portalModel(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.02, 1.02]) mesh(g, box(.65, 1.7, .8), 0x716965, x, .85, 0);
  mesh(g, box(2.5, .5, .84), 0x958478, 0, 1.82, 0);
  mesh(g, box(1.37, 1.58, .15), 0x201c2b, 0, .78, -.25);
  for (const x of [-1.03, 1.03]) { banner(g, x, 1.05, .43); torch(g, x, 1.86, 0); }
  mesh(g, octa(.18), 0x8a48b3, 0, 1.81, .48, 0x512676);
  return g;
}
