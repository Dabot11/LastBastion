import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MISSIONS } from '../src/game/missions';
import { WORLD } from '../src/game/config';
import { roadHeight } from '../src/game/path';
import { fortressModel } from '../src/scene/fortress';
import { battlefieldFraming, modelFramingPoints, CAMERA_OFFSET } from '../src/scene/framing';

// Only the torch's decorative canvas texture needs a DOM; the meshes and projections stay real.
before(() => { globalThis.document = { createElement: () => ({ width: 64, height: 64, getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }) }) } as unknown as Document; });
after(() => { Reflect.deleteProperty(globalThis, 'document'); });

for (const [width, height, top, bottom] of [[1536, 844, 108, 766], [1920, 1080, 108, 1002], [900, 700, 104, 622], [390, 844, 154, 719]]) test(`camera centers the playable route and preserves real castle geometry at ${width}×${height}`, () => {
  for (const mission of MISSIONS) {
    const map = mission.map;
    const castle = fortressModel(); castle.position.set(map.path.at(-1)!.x, WORLD.elevation + .05, map.path.at(-1)!.z); castle.rotation.y = map.gateAngle; castle.updateMatrixWorld(true);
    const fit = battlefieldFraming(map, { width, height, top, bottom, left: 24, right: width - 24 }, modelFramingPoints(castle));
    const camera = new THREE.OrthographicCamera(-fit.height * width / height / 2, fit.height * width / height / 2, fit.height / 2, -fit.height / 2, .1, 260);
    camera.position.set(...CAMERA_OFFSET).add(fit.focus); camera.lookAt(fit.focus); camera.updateMatrixWorld();
    const screen = (point: THREE.Vector3) => { const p = point.clone().project(camera); return { x: (p.x + 1) / 2 * width, y: (1 - p.y) / 2 * height }; };
    const route = map.path.map(p => screen(new THREE.Vector3(p.x, roadHeight(p, map), p.z)));
    for (const p of route) assert.ok(p.x >= 24 - .01 && p.x <= width - 24 + .01 && p.y >= top - .01 && p.y <= bottom + .01, `${mission.name}: route clipped`);
    const playable = route.filter((_, i) => Math.abs(map.path[i].x) <= WORLD.width / 2 && Math.abs(map.path[i].z) <= WORLD.depth / 2);
    const center = (Math.min(...playable.map(p => p.y)) + Math.max(...playable.map(p => p.y))) / 2;
    assert.ok(center > top + (bottom - top) * .5 && center < top + (bottom - top) * .6, 'Focus follows the playable road rather than distant scenery');
    castle.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const positions = object.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const p = screen(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
        assert.ok(p.x >= 0 && p.x <= width && p.y >= top - 1 && p.y <= bottom + 1, `${mission.name}: castle clipped (${p.x}, ${p.y})`);
      }
    });
  }
});
