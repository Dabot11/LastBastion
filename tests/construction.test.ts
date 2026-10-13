import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOWERS } from '../src/game/config';
import { MISSIONS } from '../src/game/missions';
import { Simulation } from '../src/game/simulation';
import { PAD_RADIUS, distance, padAt, placementError, placementIssue, terrainPlacementError, terrainClearance, type Point } from '../src/game/path';

for (const mission of MISSIONS) test(`hexagonal foundations are clear, spaced and useful along the route: ${mission.name}`, () => {
  const map = mission.map;
  assert.ok(map.pads.length >= 12 && map.pads.length <= 16);
  assert.equal(new Set(map.pads.map(p => p.id)).size, map.pads.length);
  for (const [i, pad] of map.pads.entries()) {
    assert.equal(placementError(pad, [], 10000, 500, map), null);
    assert.ok(terrainClearance(pad, [], map) >= PAD_RADIUS - .72 + .04);
    for (const other of map.pads.slice(i + 1)) assert.ok(distance(pad, other) >= 3.1 - 1e-6);
  }
  for (const [low, high] of [[0, .3], [.3, .7], [.7, 1]]) assert.ok(map.pads.some(p => p.progress / map.length >= low && p.progress / map.length <= high));
});

test('a purchase snaps inside the hexagon, never duplicates a tower, and selling frees that same base', () => {
  const sim = new Simulation(), pad = sim.map.pads[0];
  const hit = { x: pad.x + .32, z: pad.z + .18 };
  assert.equal(padAt(hit, sim.map)?.id, pad.id);
  const tower = sim.build('precision', hit); assert.notEqual(typeof tower, 'string'); if (typeof tower === 'string') return;
  assert.equal(tower.x, pad.x); assert.equal(tower.z, pad.z); assert.equal(tower.padId, pad.id);
  assert.equal(sim.gold, 150); assert.equal(placementIssue(hit, sim.towers, sim.gold, 100, sim.map)?.code, 'occupied');
  assert.equal(typeof sim.build('precision', hit), 'string'); assert.equal(sim.gold, 150);
  assert.equal(sim.sell(tower.id), 105); assert.equal(placementError(pad, sim.towers, sim.gold, 100, sim.map), null);
  assert.equal(typeof sim.build('precision', pad), 'object'); assert.equal(sim.gold, 105);
});
test('clear grass is not a hidden construction slot; road and solid obstacles retain their own reasons', () => {
  const sim = new Simulation(), map = sim.map; let clear: Point | undefined;
  for (let x = -14; x <= 14 && !clear; x += .3) for (let z = -11; z <= 11; z += .3) if (!terrainPlacementError({ x, z }, [], 1000, 100, map) && !padAt({ x, z }, map)) { clear = { x, z }; break; }
  assert.ok(clear); assert.equal(placementIssue(clear, [], 1000, 100, map)?.code, 'pad');
  assert.equal(typeof sim.build('precision', clear), 'string'); assert.equal(sim.gold, 300);
  assert.equal(placementIssue(map.path[20], [], 1000, 100, map)?.code, 'road');
  for (const rock of map.obstacles.filter(o => o.type === 'rock')) assert.ok(placementError(rock, [], 1000, 100, map));
  assert.equal(placementIssue(map.pads[0], [], 99, TOWERS.precision.cost, map)?.code, 'gold');
  assert.equal(sim.build('poison', map.pads[0]), 'Esta defensa se desbloquea en otra misión');
});
test('all defense levels share a single foundation and keep their own cost and upgrade animation events', () => {
  const sim = new Simulation(MISSIONS[3]); sim.gold = 6000;
  for (const [i, kind] of sim.mission.towers.entries()) {
    const pad = sim.map.pads[i], tower = sim.build(kind, pad); assert.notEqual(typeof tower, 'string'); if (typeof tower === 'string') continue;
    const before = sim.towers.length; assert.equal(sim.upgrade(tower.id), null); assert.equal(sim.upgrade(tower.id), null);
    assert.equal(tower.level, 3); assert.equal(tower.padId, pad.id); assert.equal(sim.towers.length, before);
    assert.ok(sim.events.some(e => e.type === 'upgrade' && e.kind === kind && e.level === 3));
  }
});
