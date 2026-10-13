import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOWERS, type EnemyKind, type TowerKind } from '../src/game/config';
import { MISSIONS, spawnInterval, waveAdvice, waveEnemies, waveSummary } from '../src/game/missions';
import { distance, samplePath } from '../src/game/path';
import { Simulation } from '../src/game/simulation';
import { runScenario, strategiesForMission, type Strategy } from '../scripts/balance-scenarios';

for (const [index, mission] of MISSIONS.entries()) test(`legal strategies can win and earn stars from the fixed foundations: ${mission.name}`, () => {
  const strategies: Strategy[] = ['mixed', 'mixed-expand'];
  let perfect = false, healthy = false;
  for (const strategy of strategies) for (const offset of [0, .25, .5]) {
    const result = runScenario(mission, strategy, offset);
    assert.equal(result.phase, 'victory', `${strategy}, offset ${offset}`);
    healthy ||= result.hp >= mission.gateHp * .6;
    assert.ok(result.combatSeconds >= 60 && result.combatSeconds <= mission.waves.length * 65, 'The extended route and gate combat should average at most 65 seconds per wave');
    assert.ok(result.waves.every((wave, i) => wave.seconds - (result.waves[i - 1]?.seconds ?? 0) <= 90), 'No successful wave should stall at the gate for a prolonged cleanup');
    assert.ok(result.spent > 300 && result.gold >= 0, 'Only legal earned-gold investments are allowed');
    perfect ||= result.stars === 3;
    if (index === 0) assert.ok(result.waves.slice(0, 2).every(w => w.hp === 1000), 'The introduction should teach before punishing');
  }
  assert.ok(healthy, 'At least one balanced investment plan must preserve enough gate health for two stars');
  if (!perfect) for (const strategy of ['arcane', 'artillery', 'mixed-upgrades'] as const) { if (!strategiesForMission(mission).includes(strategy)) continue; const result = runScenario(mission, strategy); perfect ||= result.phase === 'victory' && result.stars === 3 && result.spent > 300 && result.gold >= 0; }
  assert.ok(perfect, 'Three stars must remain attainable through a legal strategy using the unlocked defenses');
});

test('idle openings lose stars in the introduction and cannot coast through later missions', () => {
  for (const strategy of ['opening-archers', 'opening-crossbows', 'opening-mixed'] as const) {
    if (strategiesForMission(MISSIONS[0]).includes(strategy)) {
      const first = runScenario(MISSIONS[0], strategy);
      assert.equal(first.phase, 'victory', 'A competent opening should still let a new player advance');
      assert.ok(first.stars < 3, 'Perfect health must require reinvesting');
    }
    for (const mission of MISSIONS.slice(1)) assert.equal(runScenario(mission, strategy).phase, 'gameover', `${mission.name}: ${strategy}`);
  }
});
test('unprotected castles cannot win', () => {
  for (const mission of MISSIONS) assert.equal(runScenario(mission, 'none').phase, 'gameover');
});
test('wave forecasts match real queues, and guardians have escorts after them', () => {
  for (const mission of MISSIONS) for (const [index, wave] of mission.waves.entries()) {
    const queue = waveEnemies(wave);
    assert.equal(queue.length, wave.minion + (wave.runner ?? 0) + (wave.beast ?? 0) + (wave.guardian ?? 0));
    assert.ok(spawnInterval(mission, index + 1) >= .4);
    assert.ok(waveSummary(wave).includes(`${wave.minion} esbirros`));
    if (wave.beast && !wave.guardian) assert.equal(waveAdvice(wave, mission.towers).includes('magia'), mission.towers.includes('mage'), 'Never recommend a locked defense');
    if (wave.guardian) {
      assert.equal(queue.filter(e => e === 'guardian').length, wave.guardian);
      assert.ok(queue.indexOf('guardian') > 0 && queue.lastIndexOf('guardian') < queue.length - 1);
    }
  }
});

function targetFixture(kind: TowerKind, units: { kind: EnemyKind; progress: number }[]): { sim: Simulation; ids: number[] } {
  const sim = new Simulation(MISSIONS[3]); sim.gold = 1000; sim.wave = 1; sim.phase = 'wave';
  const point = sim.map.pads.find(pad => units.every(unit => distance(samplePath(pad.progress + unit.progress - 1.75, sim.map), pad) < TOWERS[kind].range - .2));
  assert.ok(point); assert.equal(typeof sim.build(kind, point), 'object');
  const ids = units.map(unit => { const enemy = sim.spawn(unit.kind); enemy.progress = point.progress + unit.progress - 1.75; Object.assign(enemy, samplePath(enemy.progress, sim.map)); return enemy.id; });
  sim.update(.02); assert.equal(sim.projectiles.length, 1); return { sim, ids };
}
test('archers stop the front line, crossbows focus heavy armor and mages prefer vulnerable armor', () => {
  const units: { kind: EnemyKind; progress: number }[] = [{ kind: 'minion', progress: 2.5 }, { kind: 'beast', progress: 1.3 }, { kind: 'guardian', progress: .2 }];
  for (const [kind, index] of [['archer', 0], ['crossbow', 2], ['mage', 1]] as const) {
    const { sim, ids } = targetFixture(kind, units); assert.equal(sim.projectiles[0].targetId, ids[index]);
  }
});
test('cannons select a dense group instead of wasting the explosion on an isolated leader', () => {
  const { sim, ids } = targetFixture('cannon', [{ kind: 'guardian', progress: 3.5 }, { kind: 'minion', progress: .1 }, { kind: 'minion', progress: .5 }, { kind: 'minion', progress: .9 }]);
  assert.equal(sim.projectiles[0].targetId, ids[3]);
});
