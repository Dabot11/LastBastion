import * as THREE from 'three';
import { castleSpace, distance, roadDistance, type GameMap } from '../game/path';
import { box, cylinder, mesh, pine } from './models';
import { valleyHeight } from './surfaces';

function ridgeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2), vertices = geo.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const relief = 1 + .12 * Math.sin(x * 12 + z * 7) * Math.cos(y * 9 - z * 6) + .08 * Math.sin(y * 17 + x * 13);
    vertices.setXYZ(i, x * relief, y * relief, z * relief);
  }
  geo.computeVertexNormals(); return geo;
}
// Scenery is baked by terrain.ts. It never becomes a build surface or a game obstacle.
export function surroundingWorld(group: THREE.Group, map: GameMap): void {
  let seed = map.theme === 'forest' ? 719 : map.theme === 'village' ? 1281 : 1911;
  const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const stone = map.theme === 'citadel' ? 0x83939b : 0x90978b;
  // Broad wooded slopes connect the battle to a much larger valley.
  for (let i = 0; i < 1050; i++) {
    const x = (random() - .5) * 105, z = (random() - .5) * 92;
    const outside = Math.max(Math.abs(x) - 15, Math.abs(z) - 13);
    if (outside < 2.2 || outside > 35 || castleSpace({ x, z }, map, 3) || roadDistance({ x, z }, map) < 3.2 || distance({ x, z }, map.path[0]) < 6) continue;
    const grove = Math.sin(x * .31 + z * .17) + Math.cos(z * .42 - x * .10);
    if (grove < -.9 || random() > (outside < 8 ? .95 : .65)) continue;
    const scale = (outside < 8 ? 1.1 : 1.5) + random() * .8;
    const tree = pine(scale); tree.position.set(x, valleyHeight(x, z), z); tree.rotation.y = random() * Math.PI * 2; group.add(tree);
  }
  // Irregular rocky ridges, with grassy ledges and trees on their shoulders.
  for (const [x, z, width, height] of [
    [-22, -16, 5, 7], [-12, -20, 5, 6], [-3, -21, 6, 9], [8, -20, 5, 7], [20, -17, 5, 8],
    [-27, 1, 5, 6], [26, -4, 5, 7], [-23, 19, 5, 4], [27, 16, 5, 5],
    [-38, -28, 9, 14], [-20, -43, 11, 18], [4, -48, 13, 21], [28, -38, 10, 19], [42, -15, 8, 15],
  ]) {
    if (castleSpace({ x, z }, map, width + 1) || distance({ x, z }, map.path[0]) < width + 5) continue;
    const base = valleyHeight(x, z);
    const rock = mesh(group, ridgeGeometry(), stone, x, base + height * .27, z);
    rock.scale.set(width, height * .67, width * .8); rock.rotation.set(.08, random() * 6, -.1);
    for (let j = 0; j < 4; j++) {
      const px = x + (random() - .5) * width * 1.4, pz = z + (random() - .5) * width;
      const shelf = mesh(group, cylinder(width * .24, .48, 7), map.grass, px, base + height * (.38 + j * .055), pz);
      shelf.rotation.y = random() * 6;
      const tree = pine(.9 + random() * .5); tree.position.set(px, shelf.position.y + .24, pz); group.add(tree);
    }
  }
  // Smaller boulders break up the forest floor, rather than outlining a square.
  for (let i = 0; i < 120; i++) {
    const x = (random() - .5) * 75, z = (random() - .5) * 65;
    if ((Math.abs(x) < 17 && Math.abs(z) < 15) || castleSpace({ x, z }, map, 2) || roadDistance({ x, z }, map) < 2.6 || distance({ x, z }, map.path[0]) < 5) continue;
    const rock = mesh(group, new THREE.DodecahedronGeometry(1, 0), i % 2 ? stone : 0xa6aa91, x, valleyHeight(x, z) + .25, z);
    rock.scale.set(.5 + random() * 1.1, .4 + random() * 1.3, .5 + random()); rock.rotation.y = random() * 6;
  }
  // Distant watchtowers tie the background to the defended kingdom.
  for (const [x, z] of [[-22, -30], [31, -20]]) {
    const y = valleyHeight(x, z);
    mesh(group, box(1.4, 3.2, 1.4), 0xa9afa3, x, y + 1.6, z);
    mesh(group, cylinder(1.07, .22, 4), 0xddd0aa, x, y + 3.3, z);
    for (const dx of [-.6, .6]) for (const dz of [-.6, .6]) mesh(group, box(.32, .5, .32), 0xd8d3b9, x + dx, y + 3.6, z + dz);
  }
}
