import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOWERS, type EnemyKind, type TowerKind } from '../src/game/config';
import { MISSIONS, spawnInterval, waveAdvice, waveEnemies, waveSummary } from '../src/game/missions';
import { distance, placementError, samplePath, type Point } from '../src/game/path';
import { Simulation } from '../src/game/simulation';
import { runScenario, strategiesForMission, type Strategy } from '../scripts/balance-scenarios';

for (const [index, mission] of MISSIONS.entries()) test(`legal strategies can win without pixel-perfect placement: ${mission.name}`, () => {
  const strategies: Strategy[] = index === 0 ? ['mixed', 'mixed-expand'] : index === 1 || index === 3 ? ['mixed', 'mixed-expand'] : ['mixed', 'arcane'];
  let perfect = false;
  for (const strategy of strategies) for (const offset of [0, .25, .5]) {
    const result = runScenario(mission, strategy, offset);
    assert.equal(result.phase, 'victory', `${strategy}, offset ${offset}`);
    assert.ok(result.hp >= 600, `${strategy} must allow a reasonable castle-health margin`);
    assert.ok(result.combatSeconds >= 60 && result.combatSeconds <= 360, 'Successful combat should not be instant or a prolonged cleanup');
    assert.ok(result.spent > 300 && result.gold >= 0, 'Only legal earned-gold investments are allowed');
    perfect ||= result.stars === 3;
    if (index === 0) assert.ok(result.waves.slice(0, 2).every(w => w.hp === 1000), 'The introduction should teach before punishing');
  }
  assert.ok(perfect, 'Three stars must remain attainable');
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
test('unprotected castles and towers outside useful coverage cannot win', () => {
  for (const mission of MISSIONS) for (const strategy of ['none', 'poor-positions'] as const) assert.equal(runScenario(mission, strategy).phase, 'gameover');
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
  const positions = units.map(e => samplePath(e.progress, sim.map)); let point: Point | undefined;
  for (let x = 7; x < 14 && !point; x += .25) for (let z = 6; z < 12; z += .25) {
    const p = { x, z };
    if (!placementError(p, [], sim.gold, TOWERS[kind].cost, sim.map) && positions.every(e => distance(e, p) < TOWERS[kind].range - .2)) { point = p; break; }
  }
  assert.ok(point); assert.equal(typeof sim.build(kind, point), 'object');
  const ids = units.map(unit => { const enemy = sim.spawn(unit.kind); enemy.progress = unit.progress; Object.assign(enemy, samplePath(enemy.progress, sim.map)); return enemy.id; });
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
