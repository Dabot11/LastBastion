import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { naturalPine, naturalRockGeometry, naturalScenery } from '../src/scene/nature';
import { MISSIONS } from '../src/game/missions';

test('the visual sample is confined to the first mission', () => {
  assert.deepEqual(MISSIONS.map(m => naturalScenery(m.map)), [true, false, false, false, false, false, false, false, false, false]);
});
test('natural trees and rocks fit the existing solid obstacle clearances', () => {
  const point = new THREE.Vector3();
  for (let variant = 0; variant < 5; variant++) {
    const tree = naturalPine(1, variant); tree.updateMatrixWorld(true);
    tree.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const vertices = o.geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(o.matrixWorld);
        assert.ok(Math.hypot(point.x, point.z) <= .67, `Tree ${variant} exceeds its collision footprint`);
      }
    });
    const vertices = naturalRockGeometry(variant).getAttribute('position');
    for (let i = 0; i < vertices.count; i++) assert.ok(Math.hypot(vertices.getX(i) * .35, vertices.getZ(i) * .34) <= .46);
  }
});
