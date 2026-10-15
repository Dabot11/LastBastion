import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { naturalPine, naturalTree, naturalRockGeometry, naturalScenery } from '../src/scene/nature';
import { MISSIONS } from '../src/game/missions';

test('the approved scenery is available throughout the ten-mission campaign', () => {
  assert.deepEqual(MISSIONS.map(m => naturalScenery(m.map)), Array(10).fill(true));
});
test('natural trees and rocks fit the existing solid obstacle clearances', () => {
  const point = new THREE.Vector3();
  for (const makeTree of [naturalPine, naturalTree]) for (let variant = 0; variant < 5; variant++) {
    const tree = makeTree(1, variant); tree.updateMatrixWorld(true);
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
