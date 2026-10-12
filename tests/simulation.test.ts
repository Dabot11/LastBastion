import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, TOWERS, WORLD, damageAfterResistance, towerStats } from '../src/game/config';
import { DEFAULT_MAP, FENCES, OBSTACLES, PATH, PATH_LENGTH, TORCHES, SEGMENTS, distance, placementError, roadDistance, samplePath, type GameMap, type Point } from '../src/game/path';
import { MISSIONS } from '../src/game/missions';
import { Simulation } from '../src/game/simulation';
function validPoint(towers: Point[] = [], map: GameMap = DEFAULT_MAP): Point {
  for (let x = -13; x < 14; x += .5) for (let z = -11; z < 12; z += .5) {
    const p = { x, z }; if (!placementError(p, towers, 1000, 100, map)) return p;
  }
  throw new Error('No free build location');
}
function advance(sim: Simulation, seconds: number, dt = .02): void { for (let t = 0; t < seconds; t += dt) sim.update(Math.min(dt, seconds - t)); }

test('single continuous ordered route joins southeastern spawn to northwestern castle', () => {
  assert.ok(PATH[0].x > 0 && PATH[0].z > 0); assert.ok(PATH.at(-1)!.x < 0 && PATH.at(-1)!.z < 0);
  assert.ok(PATH_LENGTH > 75); assert.ok(SEGMENTS.every(s => s.length > 0));
  for (let i = 0; i < SEGMENTS.length - 1; i++) assert.deepEqual(SEGMENTS[i].end, SEGMENTS[i + 1].start);
  for (let progress = 0; progress <= PATH_LENGTH; progress += .1) assert.ok(roadDistance(samplePath(progress)) < 1e-8);
  assert.deepEqual({ x: samplePath(PATH_LENGTH + 10).x, z: samplePath(PATH_LENGTH + 10).z }, PATH.at(-1));
});
test('route has no crossing or alternative intersection', () => {
  function orientation(a: Point, b: Point, c: Point): number { return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x); }
  for (let i = 0; i < SEGMENTS.length; i++) for (let j = i + 2; j < SEGMENTS.length; j++) {
    const a = SEGMENTS[i], b = SEGMENTS[j];
    assert.equal(orientation(a.start, a.end, b.start) * orientation(a.start, a.end, b.end) < 0 && orientation(b.start, b.end, a.start) * orientation(b.start, b.end, a.end) < 0, false);
  }
});
test('placement rejects route, scenery, overlap, castle, portal, boundaries and insufficient gold', () => {
  for (const p of PATH) assert.ok(placementError(p, [], 1000, 100));
  assert.ok(placementError({ x: 20, z: 0 }, [], 1000, 100));
  assert.ok(placementError(OBSTACLES[0], [], 1000, 100));
  for (const solid of [...FENCES, ...TORCHES]) assert.ok(placementError(solid, [], 1000, 100));
  assert.ok(placementError({ x: PATH.at(-1)!.x + 2.7, z: PATH.at(-1)!.z - 2.5 }, [], 1000, 100));
  assert.ok(placementError({ x: NaN, z: 1 }, [], 1000, 100));
  const p = validPoint(); assert.equal(placementError(p, [], 100, 100), null);
  assert.ok(placementError(p, [p], 1000, 100)); assert.ok(placementError(p, [], 99, 100));
});
test('free construction works on both sides of all three long sections', () => {
  for (const z of [8.5, 1.5, -5.5]) for (const side of [-1, 1]) {
    let found = false;
    for (let x = -6; x <= 6; x += .2) { if (!placementError({ x, z: z + side * 2.8 }, [], 1000, 100)) { found = true; break; } }
    assert.ok(found, `No buildable land on side ${side} of z=${z}`);
  }
});
test('economy, three levels, actual stat changes, sale and rejection are transactional', () => {
  const sim = new Simulation(), p = validPoint(); const t = sim.build('archer', p); assert.equal(typeof t, 'object'); if (typeof t === 'string') return;
  assert.equal(Number(sim.gold), 200); assert.equal(typeof sim.build('archer', p), 'string'); assert.equal(Number(sim.gold), 200);
  assert.equal(sim.upgrade(t.id), null); assert.equal(Number(sim.gold), 100); assert.equal(Number(t.level), 2);
  assert.ok(towerStats('archer', 2).damage > TOWERS.archer.damage); assert.ok(towerStats('archer', 2).range > TOWERS.archer.range); assert.ok(towerStats('archer', 2).interval < TOWERS.archer.interval);
  assert.ok(sim.upgrade(t.id)); assert.equal(Number(t.level), 2); sim.gold += 100; assert.equal(sim.upgrade(t.id), null); assert.equal(Number(t.level), 3);
  const before = sim.gold; assert.ok(sim.upgrade(t.id)); assert.equal(Number(sim.gold), before);
  const expected = Math.floor(t.invested * .7); assert.equal(sim.sell(t.id), expected); assert.equal(sim.towers.length, 0); assert.equal(Number(sim.gold), before + expected); assert.equal(sim.sell(t.id), 0);
});
test('armor, piercing and magic have distinct damage behavior', () => {
  const beast = ENEMIES.beast;
  assert.equal(damageAfterResistance(100, 'physical', beast), 40);
  assert.equal(damageAfterResistance(100, 'piercing', beast), 88);
  assert.equal(damageAfterResistance(100, 'magic', beast), 95);
  assert.ok(damageAfterResistance(100, 'magic', ENEMIES.guardian) < 100);
});
test('enemy rewards are awarded exactly once', () => {
  const sim = new Simulation(); sim.wave = 1; const e = sim.spawn('minion'); sim.hit(e, 10000, 'magic'); sim.hit(e, 10000, 'magic');
  assert.equal(sim.kills, 1); assert.equal(Number(sim.gold), 300 + ENEMIES.minion.reward);
});
test('all four towers fire and apply projectile damage', () => {
  for (const kind of Object.keys(TOWERS) as (keyof typeof TOWERS)[]) {
    const sim = new Simulation(MISSIONS[2]); sim.wave = 1; sim.phase = 'wave'; sim.gold = 1000;
    let p: Point | null = null;
    for (let x = 7; x < 14 && !p; x += .25) for (let z = 7; z < 12; z += .25) {
      const candidate = { x, z };
      if (!placementError(candidate, [], 1000, TOWERS[kind].cost, sim.map) && distance(candidate, sim.map.path[0]) < 3.9) { p = candidate; break; }
    }
    assert.ok(p); const t = sim.build(kind, p); assert.equal(typeof t, 'object');
    const target = sim.spawn('guardian'); const hp = target.hp;
    advance(sim, 2.5); assert.ok(target.hp < hp, `${kind} did not damage its target`);
  }
});
test('towers only acquire enemies inside their actual range', () => {
  const sim = new Simulation(); sim.phase = 'wave'; sim.wave = 1; const t = sim.build('archer', validPoint()); assert.equal(typeof t, 'object');
  if (typeof t === 'string') return; t.x = -13; t.z = -11; sim.spawn('minion'); sim.update(.02); assert.equal(sim.projectiles.length, 0);
});
test('cannon splash damages multiple enemies within radius only', () => {
  const sim = new Simulation(); sim.phase = 'wave'; sim.wave = 1;
  const a = sim.spawn('beast'), b = sim.spawn('beast'), c = sim.spawn('beast'); b.progress = .6; c.progress = 5;
  Object.assign(b, samplePath(b.progress)); Object.assign(c, samplePath(c.progress));
  sim.projectiles.push({ id: 99, kind: 'cannon', origin: a, x: a.x, z: a.z, target: { x: a.x, z: a.z }, targetId: a.id, damage: 50, damageKind: 'physical', splash: 1.8, speed: 10, travelled: 0 });
  sim.update(.02); assert.ok(a.hp < a.maxHp && b.hp < b.maxHp); assert.equal(c.hp, c.maxHp);
});
test('movement follows every waypoint and is independent of frame rate', () => {
  const a = new Simulation(), b = new Simulation(); a.wave = b.wave = 1; a.phase = b.phase = 'wave';
  const ea = a.spawn('minion'), eb = b.spawn('minion'); advance(a, 20, 1 / 30); advance(b, 20, 1 / 144);
  assert.ok(distance(ea, eb) < .000001); assert.ok(roadDistance(ea) < 1e-8);
});
test('leaks damage castle without gold or kills, defeat stops gameplay and new game resets', () => {
  const sim = new Simulation(); sim.phase = 'wave'; sim.wave = 5; sim.castleHp = 100;
  const e = sim.spawn('guardian'); e.progress = PATH_LENGTH - .01; sim.update(.1);
  assert.equal(sim.castleHp, 0); assert.equal(sim.phase, 'gameover'); assert.equal(Number(sim.gold), 300); assert.equal(sim.kills, 0);
  assert.equal(typeof sim.build('archer', validPoint()), 'string'); assert.equal(sim.sell(1), 0);
  const wave = sim.wave; sim.startWave(); sim.update(100); assert.equal(sim.wave, wave);
  const reset = new Simulation(); assert.equal(reset.gold, 300); assert.equal(reset.castleHp, 1000); assert.equal(reset.wave, 0); assert.equal(reset.towers.length, 0);
});
test('missions have finite waves, introduce challenges and stop at their final wave', () => {
  const sim = new Simulation(MISSIONS[1]); sim.startWave(); const initial = sim.waveTotal;
  sim.phase = 'preparation'; sim.wave = sim.mission.waves.length - 1; sim.startWave();
  assert.ok(sim.spawnQueue.includes('guardian')); assert.ok(sim.spawnQueue.includes('beast')); assert.ok(sim.spawnQueue.includes('runner')); assert.ok(sim.waveTotal > initial);
  sim.phase = 'preparation'; sim.startWave(); assert.equal(sim.wave, sim.mission.waves.length);
});
test('wave completion grants preparation, bonus gold and early start works', () => {
  const sim = new Simulation(); sim.startWave(); sim.spawnQueue = []; sim.update(.01);
  assert.equal(sim.phase, 'preparation'); assert.equal(sim.preparation, WORLD.preparation); assert.equal(Number(sim.gold), 340); sim.startWave(); assert.equal(sim.wave, 2);
});
