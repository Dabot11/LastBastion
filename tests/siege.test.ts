import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, TOWERS, damageAfterResistance, type EnemyKind } from '../src/game/config';
import { MISSIONS } from '../src/game/missions';
import { castleSpace, distance, gateDefenceSites, gateLocal, gatePoint, placementError, roadHeight } from '../src/game/path';
import { Simulation } from '../src/game/simulation';

function advance(sim: Simulation, duration: number, step = .02): void {
  for (let elapsed = 0; elapsed < duration - 1e-9; elapsed += step) sim.update(Math.min(step, duration - elapsed));
}
function arrival(kind: EnemyKind): { sim: Simulation; enemy: ReturnType<Simulation['spawn']> } {
  const sim = new Simulation(); sim.phase = 'wave'; sim.wave = 1;
  const enemy = sim.spawn(kind); enemy.progress = sim.map.length - .85;
  return { sim, enemy };
}
test('every enemy winds up, repeatedly attacks the gate with its own stats and stays targetable', () => {
  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
    const { sim, enemy } = arrival(kind), stats = ENEMIES[kind];
    advance(sim, .4); assert.equal(sim.castleHp, 1000); assert.equal(enemy.state, 'attacking'); assert.equal(enemy.hp, enemy.maxHp);
    advance(sim, .06); assert.equal(sim.castleHp, 1000 - stats.gateDamage);
    advance(sim, stats.attackInterval); assert.equal(sim.castleHp, 1000 - 2 * stats.gateDamage);
    assert.equal(sim.kills, 0); assert.equal(sim.gold, 300); assert.equal(sim.phase, 'wave');
    const hits = sim.events.filter(e => e.type === 'gateHit'); assert.equal(hits.length, 2);
    assert.ok(hits.every(e => e.damage === stats.gateDamage && e.enemyId === enemy.id));
    assert.ok(distance(enemy, sim.map.path.at(-1)!) < 1.3);
  }
});
test('gate damage and travel to the gate remain independent of update frequency', () => {
  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
    const a = arrival(kind), b = arrival(kind); a.enemy.progress -= 2; b.enemy.progress -= 2;
    advance(a.sim, 9, 1 / 30); advance(b.sim, 9, 1 / 144);
    assert.equal(a.sim.castleHp, b.sim.castleHp);
    assert.ok(Math.abs(a.enemy.attackCooldown - b.enemy.attackCooldown) < 1e-7);
    assert.ok(distance(a.enemy, b.enemy) < 1e-7);
  }
});
test('attackers occupy distinct gate positions and followers queue; a kill frees the front position', () => {
  const { sim, enemy } = arrival('minion');
  const others = ['runner', 'beast', 'guardian'].map(kind => { const e = sim.spawn(kind as EnemyKind); e.progress = sim.map.length - .85; return e; });
  sim.update(.02); const front = sim.enemies.filter(e => e.state === 'attacking');
  assert.equal(front.length, 2); assert.ok(distance(front[0], front[1]) >= 1.5);
  assert.ok(others.slice(1).every(e => e.state === 'waiting'));
  assert.ok(distance(others[1], others[2]) >= 1);
  const hp = sim.castleHp; sim.hit(enemy, 10000, 'physical'); assert.equal(sim.kills, 1);
  advance(sim, 2); assert.ok(sim.enemies.some(e => e.id === others[1].id && e.state === 'attacking'));
  assert.ok(sim.castleHp < hp); assert.equal(sim.enemies.some(e => e.id === enemy.id), false);
});
test('killing the final attacker stops gate damage and allows victory; actual damage events never include overkill', () => {
  const { sim, enemy } = arrival('guardian'); sim.wave = sim.mission.waves.length;
  advance(sim, .5); assert.equal(sim.phase, 'wave'); const hp = sim.castleHp, before = enemy.hp;
  sim.hit(enemy, 40, 'physical');
  assert.equal(sim.events.filter(e => e.type === 'damage').at(-1)!.damage, damageAfterResistance(40, 'physical', ENEMIES.guardian));
  const remaining = enemy.hp; sim.hit(enemy, 10000, 'physical'); sim.hit(enemy, 10000, 'physical');
  assert.equal(enemy.hp, 0); assert.equal(sim.kills, 1);
  const damages = sim.events.filter(e => e.type === 'damage'); assert.equal(damages.length, 2); assert.equal(damages[1].damage, remaining);
  assert.ok(Math.abs(damages.reduce((sum, e) => sum + e.damage!, 0) - before) < 1e-8);
  advance(sim, 3); assert.equal(sim.phase, 'victory'); assert.equal(sim.castleHp, hp);
});
test('a fast follower cannot overtake or jitter backwards through a slower unit in the gate queue', () => {
  const { sim, enemy } = arrival('minion');
  const other = sim.spawn('minion'); other.progress = sim.map.length - .85;
  const slow = sim.spawn('beast'); slow.progress = sim.map.length - 2.25;
  const fast = sim.spawn('runner'); fast.progress = sim.map.length - 3.65;
  sim.update(.02); sim.hit(enemy, 10000, 'physical');
  for (let tick = 0; tick < 100; tick++) {
    const before = fast.progress; sim.update(.02);
    assert.ok(fast.progress >= before - 1e-8, 'Queued units must keep moving towards the gate');
    if (slow.state !== 'attacking') assert.ok(slow.progress - fast.progress >= 1.4 - 1e-8);
  }
  assert.equal(slow.state, 'attacking'); assert.equal(fast.state, 'waiting');
});
test('a legally placed tower can kill an attacker at the gate with real projectiles', () => {
  const { sim, enemy } = arrival('minion'); let built = false;
  for (const p of sim.map.pads) {
    if (placementError(p, [], sim.gold, TOWERS.precision.cost, sim.map) || distance(p, gatePoint(-.8, .85, sim.map)) > TOWERS.precision.range - .2) continue;
    assert.equal(typeof sim.build('precision', p), 'object'); built = true; break;
  }
  assert.ok(built); advance(sim, 4); assert.equal(enemy.hp, 0); assert.equal(sim.kills, 1);
  assert.ok(sim.castleHp > 950); assert.ok(sim.events.some(e => e.type === 'damage'));
});
test('all castle footprints sit behind their gates and every road meets the elevated threshold', () => {
  for (const mission of MISSIONS) {
    const map = mission.map, gate = map.path.at(-1)!;
    assert.ok(Math.abs(roadHeight(gate, map) - 1.7) < 1e-8);
    const inside = gatePoint(0, -5.7, map); assert.ok(castleSpace(inside, map)); assert.ok(placementError(inside, [], 1000, 100, map));
    const approach = gatePoint(0, 5, map); assert.ok(gateLocal(approach, map).z > 4.99); assert.equal(castleSpace(approach, map), false);
    assert.ok(roadHeight(approach, map) < roadHeight(gate, map));
    for (const site of gateDefenceSites(map)) assert.equal(placementError(site, [], 1000, 100, map), null, 'Both gate flanks must allow real construction');
    assert.ok(map.path[0].x > 20 && map.path[0].z > 13, 'The cave is outside the old playable rectangle');
  }
});
