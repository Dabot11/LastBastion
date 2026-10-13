import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLD } from '../src/game/config';
import { MISSIONS } from '../src/game/missions';
import { Simulation } from '../src/game/simulation';
import { buildArea, createPlacementField } from '../src/game/build-areas';
import { distance, gateDefenceSites, gatePoint, obstacleRadius, placementError, placementIssue, type GameMap, type Point } from '../src/game/path';

function emptyMap(): GameMap { return { ...MISSIONS[0].map, obstacles: [], torches: [], fences: [] }; }
function openPoint(map: GameMap): Point {
  for (let x = -15; x <= 15; x += .3) for (let z = -11; z <= 11; z += .3) if (!placementError({ x, z }, [], 1000, 100, map)) return { x, z };
  throw new Error('No open terrain');
}

for (const mission of MISSIONS) test(`every construction contour stays legal beside roads, obstacles and a tower: ${mission.name}`, () => {
  const towers = [gateDefenceSites(mission.map)[0]], area = buildArea(createPlacementField(mission.map), towers);
  assert.ok(area.triangles.length > 1000); assert.ok(area.boundary.length > 100);
  for (let i = 0; i < area.triangles.length; i += 3) {
    const [a, b, c] = area.triangles.slice(i, i + 3);
    // Interior interpolation can cross a circular obstruction even when all corners are legal.
    for (const weights of [[1 / 3, 1 / 3, 1 / 3], [.1, .45, .45]]) {
      const p = { x: a.x * weights[0] + b.x * weights[1] + c.x * weights[2], z: a.z * weights[0] + b.z * weights[1] + c.z * weights[2] };
      assert.equal(placementError(p, towers, 10000, 500, mission.map), null, `False green interior at ${p.x}, ${p.z}`);
    }
  }
  for (const p of area.boundary) assert.equal(placementError(p, towers, 10000, 500, mission.map), null, 'The visible outline must also remain legal');
});

test('road, solid obstacle and tower margins include the complete footprint and expose brief reasons', () => {
  const map = emptyMap(), p = { x: 5, z: -10 }, road = map.segments.find(s => distance(s.start, s.end) > 4 && Math.abs((s.start.x + s.end.x) / 2) < 10 && Math.abs((s.start.z + s.end.z) / 2) < 10)!;
  assert.equal(placementError(p, [], 1000, 100, map), null);
  const mid = { x: (road.start.x + road.end.x) / 2, z: (road.start.z + road.end.z) / 2 };
  assert.equal(placementIssue(mid, [], 1000, 100, map)?.brief, 'Sobre el camino');
  assert.equal(placementIssue(p, [p], 1000, 100, map)?.brief, 'Demasiado cerca de otra defensa');
  const radius = WORLD.towerRadius * 2 + .15;
  assert.equal(placementIssue({ x: p.x + radius - .001, z: p.z }, [p], 1000, 100, map)?.code, 'tower');
  assert.equal(placementError({ x: p.x + radius + .001, z: p.z }, [p], 1000, 100, map), null);
  map.obstacles = [{ ...p, radius: .38, type: 'rock' }];
  const rockRadius = obstacleRadius(map.obstacles[0], 0) + WORLD.towerRadius;
  assert.equal(placementIssue({ x: p.x + rockRadius - .001, z: p.z }, [], 1000, 100, map)?.code, 'obstacle');
  assert.equal(placementError({ x: p.x + rockRadius + .001, z: p.z }, [], 1000, 100, map), null);
  assert.equal(placementIssue(p, [], 1000, 100, map)?.brief, 'Obstáculo · Árbol, roca o edificio');
  // The widened gate approach is terrain carved by landscape.ts, not a hidden solid prop.
  assert.equal(placementIssue(gatePoint(2.65, 2.1, map), [], 1000, 100, map)?.code, 'road');
});

function areaSize(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 3) { const [a, b, c] = points.slice(i, i + 3); area += Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2; }
  return area;
}
test('building removes available terrain; selling restores it without constraining arbitrary coordinates', () => {
  const sim = new Simulation(), field = createPlacementField(sim.map), original = areaSize(buildArea(field, sim.towers).triangles);
  const p = gateDefenceSites(sim.map)[1], arbitrary = { x: p.x + .0371, z: p.z + .0293 };
  const tower = sim.build('archer', arbitrary); assert.notEqual(typeof tower, 'string'); if (typeof tower === 'string') return;
  assert.equal(tower.x, arbitrary.x); assert.equal(tower.z, arbitrary.z);
  const occupied = areaSize(buildArea(field, sim.towers).triangles); assert.ok(occupied < original - 1);
  assert.equal(sim.sell(tower.id), 70); assert.equal(areaSize(buildArea(field, sim.towers).triangles), original);
});
test('only recognizable solid scenery blocks construction, without adding decorative collision regions', () => {
  const map = emptyMap(), p = openPoint(map);
  assert.equal(placementError(p, [], 1000, 100, map), null);
  for (const type of ['tree', 'rock', 'house'] as const) { map.obstacles = [{ ...p, radius: .38, type }]; assert.equal(placementIssue(p, [], 1000, 100, map)?.code, 'obstacle'); }
  map.obstacles = []; map.fences = [p]; assert.equal(placementIssue(p, [], 1000, 100, map)?.code, 'fence');
  map.fences = []; map.torches = [p]; assert.equal(placementIssue(p, [], 1000, 100, map)?.code, 'torch');
  map.torches = []; assert.equal(placementIssue(p, [], 99, 100, map)?.code, 'gold');
});
