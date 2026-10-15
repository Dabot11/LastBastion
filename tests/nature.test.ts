import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { naturalPine, naturalRockGeometry, naturalBanks, naturalScenery } from '../src/scene/nature';
import { MISSIONS } from '../src/game/missions';
import { PAD_RADIUS, roadDistance, distance } from '../src/game/path';
import { WORLD } from '../src/game/config';

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
test('decorative banks leave the road and complete construction bases free', () => {
  const map = MISSIONS[0].map, group = new THREE.Group(); naturalBanks(group, map);
  const stones = group.children[0] as THREE.InstancedMesh, matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  const vertices = stones.geometry.getAttribute('position');
  assert.ok(stones.count > 0);
  for (let j = 0; j < stones.count; j++) {
    stones.getMatrixAt(j, matrix);
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
      const p = { x: point.x, z: point.z };
      assert.ok(roadDistance(p, map) > WORLD.roadHalfWidth, 'Bank rock intrudes into the enemy route');
      assert.ok(map.pads.every(pad => distance(p, pad) > PAD_RADIUS), 'Bank rock covers a construction base');
    }
  }
});
