import { ART, tiledRoof } from './art';
import { naturalPine, naturalRock } from './nature';
import * as THREE from 'three';
import { banner, box, cone, cylinder, mesh, orb, pine, softBox, torch, torus, weatheredRock } from './models';

const STONE = ART.stone, EDGE = ART.edge, MORTAR = ART.mortar, WOOD = ART.wood, IRON = 0x454c4b, BLUE = ART.blue;

function masonry(group: THREE.Group, width: number, height: number, depth: number): void {
  mesh(group, softBox(width, height, depth), MORTAR, 0, height / 2, 0);
  // Individually laid, bevelled courses leave real mortar joints and broken silhouettes.
  for (let row = 0; row < Math.ceil(height / .52); row++) {
    const y = Math.min(height - .24, .26 + row * .52);
    for (let x = -width / 2; x < width / 2 - .05;) {
      const remaining = width / 2 - x, w = Math.min(remaining, row % 2 && x === -width / 2 ? .45 : .88);
      if (w > .06) {
        mesh(group, softBox(w - .025, .485, .16), (row + Math.round(x * 2)) % 3 ? STONE : EDGE, x + w / 2, y, depth / 2 + .025);
        mesh(group, softBox(w - .025, .485, .16), STONE, x + w / 2, y, -depth / 2 - .025);
      }
      x += w;
    }
  }
  mesh(group, softBox(width + .22, .22, depth + .25), EDGE, 0, height + .08, 0);
  for (let x = -width / 2 + .2; x <= width / 2; x += .73) mesh(group, softBox(.38, .57, depth + .21), EDGE, x, height + .43, 0);
}

export function fortressModel(): THREE.Group {
  const g = new THREE.Group(); g.name = 'fortress';
  mesh(g, softBox(11.1, .42, 10.1), 0x858d82, 0, -.19, -4.75);
  mesh(g, softBox(10.6, .14, 9.65), EDGE, 0, .025, -4.8);
  // Three times the previous footprint, with the main door precisely at local (0, 0, 0).
  for (const x of [-3.2, 3.2]) {
    const wall = new THREE.Group(); wall.position.set(x, 0, -.45); g.add(wall); masonry(wall, 3.1, 3.9, .9);
    banner(wall, 0, 2.7, .61, 2.1);
  }
  for (const x of [-5, 5]) {
    const wall = new THREE.Group(); wall.position.set(x, 0, -4.85); wall.rotation.y = Math.PI / 2; g.add(wall); masonry(wall, 8.5, 3.7, .75);
  }
  const rear = new THREE.Group(); rear.position.z = -9; g.add(rear); masonry(rear, 10, 3.8, .8);
  // A stone arch has an open centre: its timber leaves, iron straps and handles are independent.
  for (const x of [-1.65, 1.65]) {
    for (let row = 0; row < 6; row++) mesh(g, softBox(.44, .48, 1.05), row % 2 ? EDGE : STONE, x, .24 + row * .49, -.1);
    torch(g, x * 1.3, 2.9, .43);
  }
  for (let i = 0; i < 13; i++) {
    const a = i / 12 * Math.PI;
    const stone = mesh(g, softBox(.43, .53, 1.03), i % 3 ? EDGE : STONE, Math.cos(a) * 1.65, 2.55 + Math.sin(a) * 1.25, -.12);
    stone.rotation.z = a - Math.PI / 2;
  }
  mesh(g, softBox(3.5, .65, .98), STONE, 0, 4, -.28);
  for (const x of [-1.45, -.72, 0, .72, 1.45]) mesh(g, softBox(.42, .57, .96), EDGE, x, 4.59, -.28);
  banner(g, 0, 4.09, .25, .8);

  const door = new THREE.Group(); door.name = 'castle-door'; g.add(door);
  mesh(door, softBox(2.91, 2.82, .24), 0x513d2e, 0, 1.44, -.075);
  for (let i = 0; i < 12; i++) {
    const x = -1.38 + i * .25, height = 2.62 + .43 * Math.sqrt(Math.max(0, 1 - (x / 1.5) ** 2));
    mesh(door, softBox(.232, height, .12), i % 3 ? WOOD : 0x93633b, x, height / 2 + .025, .087);
  }
  for (const x of [-.74, .74]) for (const y of [.53, 1.55, 2.42]) {
    mesh(door, softBox(1.32, .12, .075), IRON, x, y, .185);
    for (const dx of [-.47, -.2, .2, .47]) mesh(door, orb(.032), 0x9692a4, x + dx, y, .234);
  }
  for (const x of [-.2, .2]) mesh(door, torus(.10, .025, 6, 16), IRON, x, 1.23, .255);
  for (let stage = 1; stage <= 2; stage++) {
    const cracks = new THREE.Group(); cracks.name = `gate-damage-${stage}`; cracks.visible = false; door.add(cracks);
    for (let j = 0; j < 8; j++) {
      const crack = mesh(cracks, box(.025 + stage * .018, .33, .009), 0x302d28, Math.sin(j * 2.4 + stage) * 1.1, .45 + j * .28, .256);
      crack.rotation.z = Math.sin(j * 1.7) * .9;
    }
  }
  for (const x of [-4.8, 4.8]) for (const z of [-.65, -8.55]) {
    const tower = new THREE.Group(); tower.position.set(x, 0, z); g.add(tower);
    mesh(tower, cylinder(1.25, .25, 16), EDGE, 0, .16, 0);
    mesh(tower, cylinder(1.04, 5.05, 24), STONE, 0, 2.66, 0);
    for (let y = .55; y < 5.3; y += .5) {
      mesh(tower, torus(1.045, .024, 4, 24), MORTAR, 0, y, 0).rotation.x = Math.PI / 2;
      for (let j = 0; j < 8; j++) {
        const a = j * Math.PI / 4 + (Math.round(y * 2) % 2 ? .19 : 0);
        const joint = mesh(tower, box(.015, .43, .022), MORTAR, Math.sin(a) * 1.05, y + .24, Math.cos(a) * 1.05); joint.rotation.y = a;
      }
    }
    mesh(tower, cylinder(1.26, .24, 16), EDGE, 0, 5.3, 0);
    for (let j = 0; j < 10; j++) {
      const a = j * Math.PI / 5; const merlon = mesh(tower, softBox(.42, .63, .39), EDGE, Math.sin(a) * 1.05, 5.68, Math.cos(a) * 1.05); merlon.rotation.y = a;
    }
    for (const y of [1.2, 3.6]) mesh(tower, softBox(.16, .65, .02), 0x303d42, 0, y, 1.051);
    if (z > -1) banner(tower, 0, 2.6, 1.095, 2);
    tiledRoof(tower, 1.46, 1.95, 5.84);
    mesh(tower, orb(.10), ART.gold, 0, 7.82, 0);
    mesh(tower, cylinder(.035, .75), ART.gold, 0, 8.12, 0);
    mesh(tower, softBox(.65, .29, .025), BLUE, .31, 8.31, 0);
  }
  const keep = new THREE.Group(); keep.position.z = -5.7; g.add(keep);
  masonry(keep, 3.3, 5.9, 3.1);
  for (const x of [-1, 0, 1]) for (const y of [1.5, 3.2, 4.9]) {
    mesh(keep, softBox(.32, .61, .06), 0x354852, x, y, 1.66);
    mesh(keep, torus(.16, .055, 5, 16, Math.PI), EDGE, x, y + .29, 1.72);
  }
  const roof = new THREE.Group(); roof.rotation.y = Math.PI / 4; keep.add(roof); tiledRoof(roof, 2.6, 1.65, 6.25, 8, 4);
  mesh(keep, cylinder(.045, .91, 8), 0xe9b849, 0, 8.25, 0);
  mesh(keep, softBox(.98, .46, .032), BLUE, .46, 8.51, 0); banner(keep, .47, 8.41, .032, .48);
  banner(keep, 0, 4, 1.75, 2.2);
  // Small courtyard buildings, paving and barrels make the fortress feel inhabited.
  for (const x of [-3.25, 3.25]) {
    mesh(g, softBox(1.55, 1.72, 2.3), STONE, x, .89, -5.1);
    const roof = mesh(g, cone(1.65, .85, 4), BLUE, x, 2.13, -5.1); roof.rotation.y = Math.PI / 4; roof.scale.x = .8;
    mesh(g, cylinder(.19, .44, 12), WOOD, x, .24, -2.6);
  }
  for (let z = -1.5; z > -4; z -= .55) for (const x of [-.52, 0, .52]) mesh(g, softBox(.48, .025, .5), EDGE, x, .105, z);
  return g;
}

export function caveModel(natural = false): THREE.Group {
  const g = new THREE.Group(); g.name = 'enemy-cave';
  const stone = (radius: number, variant: number, tint: number, x: number, y: number, z: number): THREE.Object3D => {
    if (!natural) return mesh(g, weatheredRock(radius, variant), tint, x, y, z);
    const holder = new THREE.Group(), rock = naturalRock(variant); rock.scale.setScalar(radius);
    holder.add(rock); holder.position.set(x, y, z); g.add(holder); return holder;
  };
  const shape = new THREE.Shape(); shape.moveTo(-1.48, 0); shape.lineTo(1.48, 0); shape.lineTo(1.48, 1.22); shape.absellipse(0, 1.22, 1.48, 1.5, 0, Math.PI, false); shape.lineTo(-1.48, 0);
  const opening = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), new THREE.MeshBasicMaterial({ color: 0x10181b })); opening.position.z = .74; g.add(opening);
  const inner = mesh(g, torus(1.43, .17, 8, 24, Math.PI), 0x454c4b, 0, 1.2, .84); inner.scale.y = 1.1;
  for (let i = 0; i < 17; i++) {
    const a = i / 16 * Math.PI, x = Math.cos(a) * 1.95, y = 1.17 + Math.sin(a) * 1.92;
    const rock = stone(.83, i % 3, i % 3 ? 0x95988a : 0xbebdab, x, y, .10 + Math.sin(i * 3) * .17); rock.scale.set(.92, .76 + .15 * Math.sin(i), .88); rock.rotation.set(i * .3, i * .6, a);
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 5; j++) {
      const rock = stone(1.32, j % 3, j % 2 ? 0x7f8c83 : 0x95988a, side * (2.75 + j * .17), .65 + j * .3, -1.1 - j * .52); rock.scale.set(1.2, 1.0, 1.25); rock.rotation.y = j * 1.1;
    }
    const tree = natural ? naturalPine(1.24, side > 0 ? 1 : 0) : pine(1.24); tree.position.set(side * 3.7, 2.1, -2.5); g.add(tree);
    for (let j = 0; j < 3; j++) {
      const stone = mesh(g, orb(.14), 0x95988a, side * (1.3 + j * .31), .09, .8 + Math.sin(j) * .4); stone.scale.y = .5;
    }
    const strut = mesh(g, softBox(.18, 1.56, .2), 0x805737, side * 1.47, .74, .4); strut.rotation.z = side * .08;
  }
  for (let j = 0; j < 6; j++) {
    const rock = stone(1.13, j % 3, 0x7f8c83, (j - 2.5) * .88, 3.6 + Math.sin(j * 2) * .27, -1.6); rock.scale.set(1.2, .7, 1.5);
  }
  mesh(g, softBox(3.25, .19, .22), 0x674629, 0, 2.67, .38).rotation.z = -.045;
  return g;
}
