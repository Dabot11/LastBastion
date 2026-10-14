import { MISSIONS } from '../src/game/missions';
import { runScenario, strategiesForMission } from './balance-scenarios';

const results = MISSIONS.flatMap(mission => strategiesForMission(mission).map(strategy => runScenario(mission, strategy)));
if (results.some(r => r.phase !== 'victory' && r.phase !== 'gameover')) process.exitCode = 1;
if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
else {
  console.table(results.map(r => ({ mission: r.mission, strategy: r.strategy, result: r.phase, hp: `${r.hp}/${r.maxHp}`, health: `${Math.round(r.hp / r.maxHp * 100)}%`, stars: r.stars, wave: r.wave, spent: r.spent, gold: r.gold, towers: r.towers.length, combatSeconds: r.combatSeconds, minutesWithPreparation: r.minutesWithPreparation })));
  console.log('Decisiones cada 2 s y entre oleadas, solo oro ganado, posiciones legales y combate real a pasos de 20 ms. Las primeras tres misiones tienen preparación manual sin tiempo estimado; las demás incluyen 20 s por oleada. Las pausas y decisiones humanas pueden alargarlos. Estas estrategias son referencias, no representan a todos los jugadores.');
}
