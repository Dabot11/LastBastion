import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, spawnInterval, waveAdvice, waveEnemies, waveSummary } from '../src/game/missions';
import { runScenario, strategiesForMission, type Strategy } from '../scripts/balance-scenarios';

for (const [index, mission] of MISSIONS.entries()) test(`legal crossbow strategies can earn three stars: ${mission.name}`, () => {
  const strategies: Strategy[] = ['mixed', 'mixed-expand', 'poison-front', 'balanced'];
  const results = strategies.filter(s => strategiesForMission(mission).includes(s)).flatMap(strategy => [0, .25, .5, .75].map(offset => runScenario(mission, strategy, offset)));
  assert.ok(results.every(r => ['victory', 'gameover'].includes(r.phase)), 'No strategy may leave a stalled simulation');
  const victories = results.filter(r => r.phase === 'victory');
  assert.ok(victories.length, 'A legal mixed investment plan must win');
  const best = victories.reduce((a, b) => a.hp > b.hp ? a : b);
  assert.equal(best.stars, 3, 'Three stars must remain attainable with the unlocked crossbows and earned gold');
  for (const result of victories) {
    assert.ok(result.combatSeconds >= 60 && result.combatSeconds <= mission.waves.length * 90);
    assert.ok(result.waves.every((wave, i) => wave.seconds - (result.waves[i - 1]?.seconds ?? 0) <= 120), 'Successful waves must not stall at the gate');
    assert.ok(result.spent > 300 && result.gold >= 0);
  }
  if (index === 0) assert.ok(best.waves.slice(0, 2).every(w => w.hp === 1000));
});
test('frozen openings cannot coast through the new campaign', () => {
  for (const mission of MISSIONS) for (const strategy of ['opening-precision', 'opening-triple', 'opening-mixed'] as const) {
    if (strategiesForMission(mission).includes(strategy)) assert.equal(runScenario(mission, strategy).phase, 'gameover', `${mission.name}: ${strategy} must require reinvesting`);
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
    if (wave.beast && !wave.guardian) assert.equal(waveAdvice(wave, mission.towers).includes('Veneno'), mission.towers.includes('poison'), 'Never recommend a locked defense');
    if (wave.guardian) {
      assert.equal(queue.filter(e => e === 'guardian').length, wave.guardian);
      assert.ok(queue.indexOf('guardian') > 0 && queue.lastIndexOf('guardian') < queue.length - 1);
    }
  }
});
