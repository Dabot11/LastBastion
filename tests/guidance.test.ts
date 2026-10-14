import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS } from '../src/game/missions';
import { Simulation, type Tower } from '../src/game/simulation';
import { coversGate, gateIsProtected, nextGuidance, recommendedGatePad } from '../src/game/guidance';
import { runScenario } from '../scripts/balance-scenarios';

test('a legal optional gate recommendation tracks real coverage, sale and combat', () => {
  for (const mission of MISSIONS) {
    const sim = new Simulation(mission), pad = recommendedGatePad(sim);
    assert.ok(pad); assert.equal(gateIsProtected(sim), false);
    const tower = sim.build('precision', pad); assert.equal(typeof tower, 'object');
    assert.equal(coversGate(sim, tower as Tower), true); assert.equal(gateIsProtected(sim), true);
    assert.equal(recommendedGatePad(sim), null);
    assert.equal(sim.sell((tower as Tower).id), 105); assert.ok(recommendedGatePad(sim));
    sim.startWave(); assert.equal(recommendedGatePad(sim), null);
  }
});
test('guidance follows menu, choice, purchase and upgrade without blocking other locations', () => {
  const sim = new Simulation();
  assert.equal(nextGuidance(sim, null, null, false)?.target, 'build');
  assert.equal(nextGuidance(sim, null, null, true)?.target, 'precision');
  assert.equal(nextGuidance(sim, 'precision', null, false)?.target, 'pad');
  const other = sim.map.pads.find(p => p !== recommendedGatePad(sim))!;
  assert.equal(typeof sim.build('precision', other), 'object', 'Recommendations never restrict a legal purchase');
  const second = new Simulation(MISSIONS[1]);
  const tower = second.build('precision', recommendedGatePad(second)!) as Tower;
  assert.equal(nextGuidance(second, null, null, false)?.target, 'wave');
  second.wave = 1;
  assert.equal(nextGuidance(second, null, null, false)?.target, 'tower');
  assert.equal(nextGuidance(second, null, tower.id, false)?.target, 'upgrade');
  second.upgrade(tower.id);
  assert.equal(nextGuidance(second, null, tower.id, false)?.target, 'wave');
});
test('introductory preparation waits indefinitely; later missions retain timed pressure', () => {
  for (const mission of MISSIONS.slice(0, 3)) {
    const sim = new Simulation(mission); sim.update(300);
    assert.equal(sim.phase, 'preparation'); assert.equal(sim.wave, 0); assert.equal(sim.gold, 300);
    sim.startWave(); assert.equal(sim.phase, 'wave');
    sim.spawnQueue = []; sim.update(.02); assert.equal(sim.phase, 'preparation');
    sim.update(300); assert.equal(sim.wave, 1, 'Every preparation phase waits, not just the opening');
  }
  const later = new Simulation(MISSIONS[3]); later.update(21); assert.equal(later.phase, 'wave');
});
test('first three missions earn three stars with purchases only between waves', () => {
  for (const mission of MISSIONS.slice(0, 3)) {
    const result = runScenario(mission, 'precision', 0, true);
    assert.equal(result.phase, 'victory'); assert.equal(result.stars, 3);
  }
  assert.equal(runScenario(MISSIONS[0], 'opening-precision').stars, 3);
});
test('campaign grows its route, choices and pressure while introducing one threat at a time', () => {
  assert.deepEqual(MISSIONS.map(m => m.waves.length), [3, 4, 4, 5, 5, 6, 6, 7, 8, 8]);
  assert.deepEqual(MISSIONS.map(m => m.map.pads.length), [4, 5, 6, 7, 8, 9, 10, 11, 12, 14]);
  for (let i = 1; i < MISSIONS.length; i++) {
    assert.ok(MISSIONS[i].map.length > MISSIONS[i - 1].map.length);
    assert.ok(MISSIONS[i].healthMultiplier >= MISSIONS[i - 1].healthMultiplier);
  }
  assert.ok(MISSIONS.slice(0, 2).every(m => m.waves.every(w => !w.runner)));
  assert.ok(MISSIONS.slice(0, 5).every(m => m.waves.every(w => !w.beast)));
  assert.ok(MISSIONS.slice(0, 7).every(m => m.waves.every(w => !w.guardian)));
  assert.ok(MISSIONS[5].waves[2].beast); assert.ok(MISSIONS[7].waves[5].guardian);
});

test('following the single suggested gate defense earns three stars in the introduction', () => {
  const sim = new Simulation();
  assert.equal(typeof sim.build('precision', recommendedGatePad(sim)!), 'object');
  for (let ticks = 0; ticks < 15000 && !sim.finished; ticks++) {
    if (sim.phase === 'preparation') sim.startWave();
    sim.update(.02); sim.events.length = 0;
  }
  assert.equal(sim.phase, 'victory'); assert.equal(sim.stars, 3); assert.equal(sim.towers.length, 1);
});
