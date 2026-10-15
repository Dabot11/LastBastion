import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { naturalPine, naturalTree, naturalRockGeometry, naturalScenery, TREE_SPECIES } from '../src/scene/nature';
import { MISSIONS } from '../src/game/missions';

test('the approved scenery is available throughout the ten-mission campaign', () => {
  assert.deepEqual(MISSIONS.map(m => naturalScenery(m.map)), Array(10).fill(true));
});
test('natural trees and rocks fit the existing solid obstacle clearances', () => {
  const point = new THREE.Vector3();
  for (const makeTree of [naturalPine, naturalTree]) for (let variant = 0; variant < 15; variant++) {
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

test('each tree species has a three-dimensional silhouette at both detail levels', () => {
  for (const distant of [false, true]) for (let variant = 0; variant < 15; variant++) {
    const tree = naturalTree(1, variant, distant), size = new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3());
    assert.equal(tree.userData.species, TREE_SPECIES[variant % TREE_SPECIES.length]);
    assert.ok(size.x > .5 && size.z > .5 && size.y > 2, `${tree.name} must keep volume from both horizontal directions`);
    tree.traverse(o => {
      if (!(o instanceof THREE.Mesh) || !(o.material as THREE.Material).userData.treeCanopy) return;
      const material = o.material as THREE.MeshStandardMaterial;
      assert.ok(material.isMeshStandardMaterial, 'Crowns must respond to the battlefield lights');
      assert.equal(material.alphaTest, 0, 'Foliage must be solid geometry');
    });
  }
});
