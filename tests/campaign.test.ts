import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, earnedStars, towerUnlockMission, waveEnemies } from '../src/game/missions';
import { CampaignProgress, PROGRESS_KEY, type StorageAdapter } from '../src/game/progress';
import { placementError, roadDistance, samplePath, type Point } from '../src/game/path';
import { Simulation } from '../src/game/simulation';
function storage(initial = '{}'): StorageAdapter {
  const values = new Map<string, string>([[PROGRESS_KEY, initial]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
function finishMission(sim: Simulation): void {
  for (let wave = 0; wave < sim.mission.waves.length; wave++) {
    sim.startWave(); let ticks = 0;
    while (sim.phase === 'wave' && ticks++ < 10000) {
      sim.update(.02); for (const enemy of sim.enemies) sim.hit(enemy, 100000, 'magic');
    }
    assert.ok(ticks < 10000, 'Wave did not finish');
  }
}
test('all mission maps are distinct, continuous and have no crossing, with free construction', () => {
  assert.equal(new Set(MISSIONS.map(m => JSON.stringify(m.map.path))).size, MISSIONS.length);
  function orient(a: Point, b: Point, c: Point): number { return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x); }
  for (const mission of MISSIONS) {
    const map = mission.map; assert.ok(map.path[0].x > 0 && map.path[0].z > 0); assert.ok(map.path.at(-1)!.x < 0 && map.path.at(-1)!.z < 0);
    for (let d = 0; d < map.length; d += .1) assert.ok(roadDistance(samplePath(d, map), map) < 1e-7);
    for (let i = 0; i < map.segments.length; i++) for (let j = i + 2; j < map.segments.length; j++) {
      const a = map.segments[i], b = map.segments[j];
      assert.equal(orient(a.start, a.end, b.start) * orient(a.start, a.end, b.end) < 0 && orient(b.start, b.end, a.start) * orient(b.start, b.end, a.end) < 0, false, mission.name);
    }
    assert.ok(map.pads.length >= 12 && map.pads.length <= 16, `${mission.name}: enough strategic bases without overcrowding`);
    for (const pad of map.pads) assert.equal(placementError(pad, [], 1000, 500, map), null);
    for (const obstacle of map.obstacles) assert.ok(placementError(obstacle, [], 1000, 100, map));
  }
});
test('star thresholds reward survival and castle preservation with clear boundaries', () => {
  assert.equal(earnedStars(1000), 3); assert.equal(earnedStars(900), 3); assert.equal(earnedStars(899), 2);
  assert.equal(earnedStars(600), 2); assert.equal(earnedStars(599), 1); assert.equal(earnedStars(1), 1); assert.equal(earnedStars(0), 0);
});
test('every mission reaches real victory after its finite waves and terminal state stays frozen', () => {
  for (const mission of MISSIONS) {
    const sim = new Simulation(mission); finishMission(sim);
    assert.equal(sim.phase, 'victory'); assert.equal(sim.wave, mission.waves.length); assert.equal(sim.stars, 3);
    assert.equal(sim.kills, mission.waves.reduce((count, wave) => count + waveEnemies(wave).length, 0));
    const before = { wave: sim.wave, gold: sim.gold, score: sim.score, hp: sim.castleHp };
    sim.update(100); sim.startWave(); assert.equal(typeof sim.build('archer', { x: 0, z: 0 }), 'string'); assert.equal(sim.sell(1), 0);
    assert.deepEqual({ wave: sim.wave, gold: sim.gold, score: sim.score, hp: sim.castleHp }, before);
  }
});
test('victory waits for all spawns, enemies and projectiles; a surviving gate attacker prevents victory and can cause defeat', () => {
  const sim = new Simulation(); sim.wave = sim.mission.waves.length; sim.phase = 'wave'; sim.spawnQueue = ['minion']; sim.update(.02);
  assert.equal(sim.phase, 'wave'); assert.equal(sim.enemies.length, 1);
  sim.hit(sim.enemies[0], 10000, 'magic');
  sim.projectiles.push({ id: 99, kind: 'mage', targetId: -1, target: { x: 0, z: 0 }, origin: { x: 8, z: 8 }, x: 8, z: 8, damage: 10, damageKind: 'magic', speed: 10, splash: 0, travelled: 0 });
  sim.update(.02); assert.equal(sim.phase, 'wave');
  for (let i = 0; i < 100; i++) sim.update(.02); assert.equal(sim.phase, 'victory');
  const loss = new Simulation(); loss.phase = 'wave'; loss.wave = loss.mission.waves.length; loss.castleHp = 1;
  loss.spawn('minion').progress = loss.map.length - .001; loss.update(.02); assert.equal(loss.phase, 'wave'); assert.equal(loss.enemies.length, 1); for (let i = 0; i < 30; i++) loss.update(.02); assert.equal(loss.phase, 'gameover'); assert.equal(loss.stars, 0);
});
test('progress unlocks missions in order, persists, keeps best stars and score, and counts wins once', () => {
  const adapter = storage(), progress = new CampaignProgress(adapter);
  assert.ok(progress.isUnlocked(0)); assert.equal(progress.isUnlocked(1), false); assert.equal(progress.isUnlocked(2), false);
  assert.equal(progress.complete(2, 3, 100), false); assert.equal(progress.complete(0, 0, 100), false);
  assert.ok(progress.complete(0, 2, 500)); assert.ok(progress.isUnlocked(1)); assert.equal(progress.isUnlocked(2), false);
  progress.complete(0, 1, 300); assert.equal(progress.totalStars, 2); assert.equal(progress.completed, 1);
  progress.complete(0, 3, 400); assert.deepEqual(progress.records.pines, { stars: 3, score: 500 });
  progress.complete(1, 1, 200); assert.ok(progress.isUnlocked(2));
  progress.complete(2, 3, 1000); assert.equal(progress.totalStars, 7); assert.equal(progress.completed, 3);
  const restored = new CampaignProgress(adapter); assert.equal(restored.totalStars, 7); assert.ok(restored.isUnlocked(2));
  assert.ok(restored.isUnlocked(3), 'Old three-mission saves must immediately unlock the fourth map');
  assert.ok(restored.complete(3, 3, 1500)); assert.equal(restored.totalStars, 10); assert.equal(restored.completed, 4);
});
test('invalid and unavailable storage cannot corrupt progress or stop playing', () => {
  assert.equal(new CampaignProgress(storage('broken json')).totalStars, 0);
  assert.equal(new CampaignProgress(storage('{"pines":{"stars":9,"score":2}}')).isUnlocked(1), false);
  assert.equal(new CampaignProgress(storage('{"pines":{"stars":3,"score":null}}')).isUnlocked(1), false);
  const blocked = new CampaignProgress({ getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } });
  assert.equal(blocked.complete(0, 2, 500), false); assert.ok(blocked.isUnlocked(1)); assert.equal(blocked.totalStars, 2);
});
test('weapon availability belongs to the mission and retries reset gold, castle and upgrades', () => {
  const first = new Simulation(); assert.equal(typeof first.build('cannon', { x: 0, z: 0 }), 'string'); assert.equal(typeof first.build('mage', { x: 0, z: 0 }), 'string'); assert.equal(first.gold, 300);
  assert.deepEqual(MISSIONS.slice(0, 4).map(m => m.towers), [['archer'], ['archer', 'crossbow'], ['archer', 'crossbow', 'mage'], ['archer', 'crossbow', 'mage', 'cannon']]);
  assert.deepEqual(['archer', 'crossbow', 'mage', 'cannon'].map(kind => towerUnlockMission(kind as 'archer' | 'crossbow' | 'mage' | 'cannon')), [1, 2, 3, 4]);
  assert.equal(typeof first.build('crossbow', { x: 0, z: 0 }), 'string');
  first.castleHp = 200; first.gold = 2; const retry = new Simulation(first.mission);
  assert.equal(retry.castleHp, 1000); assert.equal(retry.gold, 300); assert.equal(retry.wave, 0); assert.equal(retry.towers.length, 0);
});

test('ten missions keep the original saves and unlock the new campaign sequentially', () => {
  assert.equal(MISSIONS.length, 10);
  const oldRecords = Object.fromEntries(MISSIONS.slice(0, 4).map((m, i) => [m.id, { stars: i % 3 + 1, score: 1000 + i }]));
  const adapter = storage(JSON.stringify(oldRecords)), progress = new CampaignProgress(adapter);
  assert.deepEqual(progress.records, oldRecords); assert.equal(progress.completed, 4);
  assert.ok(progress.isUnlocked(4)); assert.equal(progress.isUnlocked(5), false);
  for (let i = 4; i < MISSIONS.length; i++) {
    assert.equal(progress.complete(i, 3, 5000), true);
    if (i < 9) assert.ok(new CampaignProgress(adapter).isUnlocked(i + 1));
  }
  assert.equal(new CampaignProgress(adapter).completed, 10);
  for (const mission of MISSIONS.slice(4)) assert.deepEqual(mission.towers, ['archer', 'crossbow', 'mage', 'cannon']);
});
test('gate health scales per mission; stars use its percentage and retries restore its maximum', () => {
  let previous = 0;
  for (const mission of MISSIONS) {
    const sim = new Simulation(mission); assert.ok(sim.maxGateHp > previous); previous = sim.maxGateHp;
    assert.equal(sim.castleHp, mission.gateHp); sim.phase = 'victory';
    for (const [ratio, count] of [[1, 3], [.9, 3], [.899, 2], [.6, 2], [.599, 1], [0, 0]]) {
      sim.castleHp = Math.round(sim.maxGateHp * ratio); assert.equal(sim.stars, count, `${mission.id}: ${ratio}`);
    }
    sim.gold = 0; const retry = new Simulation(mission);
    assert.equal(retry.castleHp, mission.gateHp); assert.equal(retry.gold, 300); assert.equal(retry.stars, 0);
  }
});
