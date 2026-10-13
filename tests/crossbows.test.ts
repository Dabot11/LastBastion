import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, MIN_SHOT_INTERVAL, TOWERS, towerStats, type EnemyKind, type TowerKind } from '../src/game/config';
import { MISSIONS } from '../src/game/missions';
import { distance, gateDefenceSites, gatePoint, samplePath } from '../src/game/path';
import { Simulation, type Enemy, type Tower } from '../src/game/simulation';
function advance(sim: Simulation, seconds: number, dt = .02): void { for (let time = 0; time < seconds - 1e-9; time += dt) sim.update(Math.min(dt, seconds - time)); }
function fixture(kind: TowerKind, units: EnemyKind[] = ['guardian', 'beast', 'minion']): { sim: Simulation; tower: Tower; enemies: Enemy[] } {
  const sim = new Simulation(MISSIONS[2]); sim.phase = 'wave'; sim.wave = 1;
  const pad = sim.map.pads.find(p => distance(p, samplePath(p.progress, sim.map)) < TOWERS[kind].range - 1)!;
  const tower = sim.build(kind, pad); assert.notEqual(typeof tower, 'string');
  const enemies = units.map((kind, index) => { const enemy = sim.spawn(kind); enemy.progress = pad.progress + 1 - index * .35; Object.assign(enemy, samplePath(enemy.progress, sim.map)); return enemy; });
  return { sim, tower: tower as Tower, enemies };
}
test('only crossbow specializations are available, with slow unchanged cadence across all upgrades', () => {
  assert.deepEqual(Object.keys(TOWERS), ['precision', 'triple', 'poison']);
  for (const kind of Object.keys(TOWERS) as TowerKind[]) for (const level of [1, 2, 3]) {
    assert.ok(towerStats(kind, level).interval >= MIN_SHOT_INTERVAL);
    assert.equal(towerStats(kind, level).interval, TOWERS[kind].interval);
  }
});
test('Triple sends two or three bolts to distinct enemies and emits one sound event per volley', () => {
  for (const level of [1, 2, 3]) {
    const { sim, tower } = fixture('triple'); tower.level = level;
    sim.update(.02);
    assert.equal(sim.projectiles.length, level === 3 ? 3 : 2);
    assert.equal(new Set(sim.projectiles.map(p => p.targetId)).size, sim.projectiles.length);
    assert.equal(sim.events.filter(e => e.type === 'shot').length, 1);
    assert.ok(sim.projectiles.every(p => p.damage === towerStats('triple', level).damage));
    const fired = sim.nextId; sim.update(1); assert.equal(sim.nextId, fired, 'No rapid follow-up shots');
  }
});
test('Triple never multiplies damage against one isolated enemy', () => {
  const { sim, tower, enemies } = fixture('triple', ['guardian']); tower.level = 3;
  sim.update(.02); assert.equal(sim.projectiles.length, 1);
  tower.cooldown = 100; const hp = enemies[0].hp; advance(sim, 1);
  assert.ok(Math.abs(hp - enemies[0].hp - 85 * (1 - ENEMIES.guardian.armor)) < 1e-8);
});
test('target priorities select the front or strongest enemy and can change per tower without cost', () => {
  const { sim, tower, enemies } = fixture('precision', ['minion', 'guardian', 'beast']);
  sim.update(.02); assert.equal(sim.projectiles[0].targetId, enemies[0].id);
  const gold = sim.gold; assert.equal(sim.setPriority(tower.id, 'strongest'), true); assert.equal(sim.gold, gold);
  sim.projectiles = []; tower.cooldown = 0; sim.update(.02); assert.equal(sim.projectiles[0].targetId, enemies[1].id);
  assert.equal(sim.setPriority(tower.id, 'unknown' as 'first'), false); assert.equal(sim.setPriority(-1, 'gate'), false);
});
test('gate priority protects active attackers over a larger nearby marching unit', () => {
  const sim = new Simulation(MISSIONS[2]); sim.phase = 'wave'; sim.wave = 1;
  const tower = sim.build('precision', gateDefenceSites(sim.map)[0]); assert.notEqual(typeof tower, 'string');
  const weak = sim.spawn('minion'); weak.progress = sim.map.length - .85; weak.siegeSlot = 0; weak.state = 'attacking'; Object.assign(weak, gatePoint(-.8, .85, sim.map));
  const strong = sim.spawn('guardian'); strong.progress = sim.map.length - 3; Object.assign(strong, samplePath(strong.progress, sim.map));
  assert.equal(sim.setPriority((tower as Tower).id, 'gate'), true); sim.update(.02);
  assert.equal(sim.projectiles[0].targetId, weak.id);
});
test('poison is applied by projectile impact, wears off and has actual green damage events', () => {
  const { sim, tower, enemies } = fixture('poison', ['beast']); sim.update(.02); tower.cooldown = 100;
  assert.equal(enemies[0].poisonRemaining, 0);
  advance(sim, .8); assert.ok(enemies[0].poisonRemaining > 0);
  advance(sim, 5); assert.equal(enemies[0].poisonRemaining, 0); assert.equal(enemies[0].poisonDps, 0);
  const poison = sim.events.filter(e => e.type === 'damage' && e.damageKind === 'poison');
  assert.ok(poison.length >= 8);
  assert.ok(Math.abs(poison.reduce((sum, event) => sum + event.damage!, 0) - 80 * .825) < 1e-7);
});
test('refreshing poison does not stack DPS, weaken an active dose or reset its next damage tick', () => {
  const sim = new Simulation(); sim.phase = 'wave'; sim.wave = 1; const enemy = sim.spawn('guardian');
  sim.applyPoison(enemy, 20, 4); advance(sim, .3);
  sim.applyPoison(enemy, 10, 4); sim.applyPoison(enemy, 20, 4);
  assert.equal(enemy.poisonDps, 20); assert.equal(enemy.poisonRemaining, 4);
  const hp = enemy.hp; advance(sim, .2); assert.ok(hp > enemy.hp);
  const hit = sim.events.filter(e => e.type === 'damage').at(-1)!;
  assert.ok(Math.abs(hit.damage! - 10 * (1 - ENEMIES.guardian.armor * .25)) < 1e-7);
  sim.applyPoison(enemy, 28, 5); assert.equal(enemy.poisonDps, 28);
});
test('poison spreads between armored threats without abandoning them for untreated minions', () => {
  const group = fixture('poison', ['guardian', 'beast', 'minion']);
  group.sim.applyPoison(group.enemies[0], 20, 4); group.sim.update(.02);
  assert.equal(group.sim.projectiles[0].targetId, group.enemies[1].id);
  const isolated = fixture('poison', ['guardian', 'minion']);
  isolated.sim.applyPoison(isolated.enemies[0], 20, 4); isolated.sim.update(.02);
  assert.equal(isolated.sim.projectiles[0].targetId, isolated.enemies[0].id);
});
test('poison damage is independent of frame size, flushes its final partial tick and rewards a kill once', () => {
  const a = new Simulation(), b = new Simulation(); a.phase = b.phase = 'wave'; a.wave = b.wave = 1;
  const ea = a.spawn('guardian'), eb = b.spawn('guardian'); a.applyPoison(ea, 10, 1.17); b.applyPoison(eb, 10, 1.17);
  advance(a, 2, 1 / 30); advance(b, 2, 1 / 144);
  assert.ok(Math.abs(ea.hp - eb.hp) < 1e-7); assert.ok(Math.abs(ea.maxHp - ea.hp - 11.7 * (1 - ENEMIES.guardian.armor * .25)) < 1e-7);
  const sim = new Simulation(); sim.phase = 'wave'; sim.wave = 1; const enemy = sim.spawn('minion'); enemy.hp = 2;
  sim.applyPoison(enemy, 10, 4); advance(sim, 1);
  assert.equal(sim.kills, 1); assert.equal(sim.gold, 300 + ENEMIES.minion.reward + 30);
  sim.hit(enemy, 100, 'physical'); assert.equal(sim.kills, 1);
});
