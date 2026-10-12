import { BALANCE, type EnemyKind, type TowerKind } from './config';
import { createMap, DEFAULT_MAP, type GameMap } from './path';
export interface WaveDefinition { minion: number; runner?: number; beast?: number; guardian?: number; interval?: number; }
export interface Mission { id: string; name: string; region: string; description: string; objective: string; map: GameMap; towers: TowerKind[]; waves: WaveDefinition[]; healthMultiplier: number; }
export const MISSIONS: Mission[] = [
  { id: 'pines', name: 'Aldea de los pinos', region: 'LA FRONTERA', description: 'La primera horda amenaza a los aldeanos. Protege su pequeño castillo entre los bosques.', objective: 'Resiste 5 oleadas. Aprende a cubrir las curvas.', map: DEFAULT_MAP, towers: ['archer', 'crossbow'], healthMultiplier: 1,
    waves: [{ minion: 6, interval: 1.15 }, { minion: 7, runner: 2, interval: .95 }, { minion: 8, runner: 3, beast: 1, interval: .9 }, { minion: 9, runner: 4, beast: 2, interval: .8 }, { minion: 10, runner: 6, beast: 4, interval: .7 }] },
  { id: 'market', name: 'Villa del mercado', region: 'LAS TIERRAS CENTRALES', description: 'El comercio del reino depende de estas calles. Los cañones llegan para detener a las bestias.', objective: 'Resiste 6 oleadas, incluyendo un guardián.', map: createMap([{ x: 12.5, z: 10.5 }, { x: 8.5, z: 8 }, { x: 8.5, z: -5.2 }, { x: 5, z: -8 }, { x: 1, z: -5.2 }, { x: 1, z: 7 }, { x: -3, z: 9.5 }, { x: -7, z: 7 }, { x: -7, z: -4.5 }, { x: -11.5, z: -8.8 }], 892, 'village'), towers: ['archer', 'crossbow', 'cannon'], healthMultiplier: 1.03,
    waves: [{ minion: 8, runner: 2, interval: 1.05 }, { minion: 9, runner: 3, interval: .95 }, { minion: 10, runner: 4, beast: 2, interval: .85 }, { minion: 11, runner: 6, beast: 2, interval: .8 }, { minion: 12, runner: 5, beast: 3, interval: .7 }, { minion: 13, runner: 7, beast: 3, guardian: 1, interval: .65 }] },
  { id: 'citadel', name: 'Ciudadela real', region: 'EL CORAZÓN DEL REINO', description: 'Las últimas murallas reúnen a todo el ejército. Los magos se unen a la defensa de la ciudad.', objective: 'Resiste 7 oleadas contra las hordas de guardianes.', map: createMap([{ x: 12.5, z: 10.5 }, { x: 7.5, z: 9 }, { x: -8.5, z: 9 }, { x: -11.5, z: 5 }, { x: -8, z: 1 }, { x: 8.5, z: 1 }, { x: 11.5, z: -3 }, { x: 8, z: -7 }, { x: -7, z: -7 }, { x: -11.5, z: -8.8 }], 1547, 'citadel'), towers: ['archer', 'crossbow', 'cannon', 'mage'], healthMultiplier: 1.08,
    waves: [{ minion: 9, runner: 3, interval: .95 }, { minion: 10, runner: 4, beast: 2, interval: .85 }, { minion: 11, runner: 5, beast: 2, interval: .8 }, { minion: 12, runner: 6, beast: 3, interval: .75 }, { minion: 13, runner: 6, beast: 3, guardian: 1, interval: .7 }, { minion: 14, runner: 7, beast: 4, guardian: 1, interval: .65 }, { minion: 15, runner: 8, beast: 4, guardian: 2, interval: .6 }] },
];
export function waveEnemies(wave: WaveDefinition): EnemyKind[] {
  // Guardians arrive with escorts, rather than leaving a long, isolated cleanup at the end.
  const queue: EnemyKind[] = [];
  const count = Math.max(wave.minion, wave.runner ?? 0, wave.beast ?? 0);
  for (let i = 0; i < count; i++) { if (i < wave.minion) queue.push('minion'); if (i < (wave.runner ?? 0)) queue.push('runner'); if (i < (wave.beast ?? 0)) queue.push('beast'); }
  const guardians = wave.guardian ?? 0, escorts = queue.length;
  for (let i = 0; i < guardians; i++) queue.splice(Math.floor(escorts * (i + 1) / (guardians + 2)) + i, 0, 'guardian');
  return queue;
}
export function earnedStars(hp: number, maxHp = 1000): number { return hp <= 0 ? 0 : hp / maxHp >= .9 ? 3 : hp / maxHp >= .6 ? 2 : 1; }
export function spawnInterval(mission: Mission, wave: number): number { return Math.max(BALANCE.minimumSpawnInterval, mission.waves[wave - 1]?.interval ?? 1.1 - wave * .018); }
export function waveSummary(wave: WaveDefinition): string {
  const counts: [number, string, string][] = [[wave.minion, 'esbirro', 'esbirros'], [wave.runner ?? 0, 'rápido', 'rápidos'], [wave.beast ?? 0, 'bestia', 'bestias'], [wave.guardian ?? 0, 'guardián', 'guardianes']];
  return counts.filter(([count]) => count > 0).map(([count, single, plural]) => `${count} ${count === 1 ? single : plural}`).join(' · ');
}
export function waveAdvice(wave: WaveDefinition, towers: readonly TowerKind[]): string {
  if (wave.guardian) return 'Guardián con escolta: prepara ballestas';
  if (wave.beast) return towers.includes('mage') ? 'Armaduras: ballestas o magia' : 'Armaduras: prepara ballestas';
  if (wave.runner) return 'Rápidos: cubre las curvas';
  return 'Esbirros: prepara arqueros';
}
export function towerUnlockMission(kind: TowerKind): number { return MISSIONS.findIndex(m => m.towers.includes(kind)) + 1; }
