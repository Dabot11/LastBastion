import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD } from '../src/game/config';
import { MISSIONS } from '../src/game/missions';
import { placementError, samplePath } from '../src/game/path';
import { landscape } from '../src/scene/landscape';

for (const mission of MISSIONS) test(`rendered terrain matches road and complete tower footprints: ${mission.name}`, () => {
  const land = landscape(mission.map); land.group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  function height(x: number, z: number): number {
    ray.set(new THREE.Vector3(x, 10, z), down);
    const hit = ray.intersectObjects(land.surfaces, false)[0]; assert.ok(hit, `No surface at ${x}, ${z}`); return hit.point.y;
  }
  for (let progress = 0; progress <= mission.map.length; progress += .8) {
    const p = samplePath(progress, mission.map); assert.ok(Math.abs(height(p.x, p.z) - .13) < .001, 'The road must remain sunken and clear');
  }
  let checked = 0;
  for (let x = -13; x <= 13; x += 2) for (let z = -11; z <= 11; z += 2) {
    if (placementError({ x, z }, [], 10000, 100, mission.map)) continue;
    checked++;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const h = height(x + Math.cos(angle) * WORLD.towerRadius, z + Math.sin(angle) * WORLD.towerRadius);
      assert.ok(Math.abs(h - (WORLD.elevation + .05)) < .001, `A legal tower footprint falls off the plateau at ${x}, ${z}`);
    }
  }
  assert.ok(checked >= 10, 'Check enough independent locations to exercise both sides of the road');
  // Ground continues beyond all four old board edges, including the former corners.
  for (const [x, z] of [[-18, 0], [18, 0], [0, -16], [0, 16], [-22, -20], [22, 20]]) {
    assert.ok(Number.isFinite(height(x, z)), 'The valley must extend beyond the playable rectangle');
    assert.ok(placementError({ x, z }, [], 10000, 100, mission.map), 'Background land must not extend construction rules');
  }
  land.group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
});
