import * as THREE from 'three';

// Shared art direction: warm masonry, cobalt roofs and one red enemy faction.
export const ART = {
  stone: 0xd9c49b, edge: 0xf3dfb7, mortar: 0xa38e70,
  wood: 0x985d2e, woodLight: 0xc48a43, blue: 0x2462b9, gold: 0xe9b849,
  enemySkin: 0xd63829, enemyShadow: 0xa92324,
} as const;
const forms = new Map<string, THREE.BufferGeometry>();
export function roundedForm(radius: number, detail = 12): THREE.BufferGeometry {
  const key = `${radius}-${detail}`;
  if (!forms.has(key)) {
    const g = new THREE.SphereGeometry(radius, detail, Math.max(6, Math.floor(detail * .65)));
    g.userData.shared = true; forms.set(key, g);
  }
  return forms.get(key)!;
}

// Overlapping courses form real roof eaves; alternating panels suggest individual tiles.
const roofs = new Map<string, THREE.BufferGeometry>();
export function roofCourse(radius: number, height: number, top: number, sides = 20): THREE.BufferGeometry {
  const key = `${radius}-${height}-${top}-${sides}`;
  if (!roofs.has(key)) {
    const g = new THREE.CylinderGeometry(top, radius, height, sides, 1);
    const p = g.getAttribute('position'), colors: number[] = [], tint = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      tint.setHex(ART.blue).multiplyScalar(.87 + .18 * Math.sin(Math.floor((a + Math.PI) / (Math.PI * 2) * sides) * 2.7) + (p.getY(i) > 0 ? .12 : 0));
      colors.push(tint.r, tint.g, tint.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.userData.shared = true; roofs.set(key, g);
  }
  return roofs.get(key)!;
}
let roofSkin: THREE.MeshStandardMaterial | undefined;
export function tiledRoof(group: THREE.Group, radius: number, height: number, bottom: number, tiers = 7, sides = 20): void {
  roofSkin ??= new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .7 });
  for (let i = 0; i < tiers; i++) {
    const step = height / tiers;
    const tile = new THREE.Mesh(roofCourse(radius * (1 - i / tiers), step * 1.16, radius * Math.max(0, 1 - (i + 1) / tiers) * .94, sides), roofSkin);
    tile.position.y = bottom + i * step + step / 2; tile.castShadow = tile.receiveShadow = true; group.add(tile);
  }
}
