import type { EnemyKind, TowerKind } from './config';
import { createMap, DEFAULT_MAP, type GameMap } from './path';
export interface WaveDefinition { minion: number; runner?: number; beast?: number; guardian?: number; }
export interface Mission { id: string; name: string; region: string; description: string; objective: string; map: GameMap; towers: TowerKind[]; waves: WaveDefinition[]; healthMultiplier: number; }
export const MISSIONS: Mission[] = [
  { id: 'pines', name: 'Aldea de los pinos', region: 'LA FRONTERA', description: 'La primera horda amenaza a los aldeanos. Protege su pequeño castillo entre los bosques.', objective: 'Resiste 5 oleadas. Aprende a cubrir las curvas.', map: DEFAULT_MAP, towers: ['archer', 'crossbow'], healthMultiplier: 1,
    waves: [{ minion: 6 }, { minion: 6, runner: 2 }, { minion: 7, runner: 3 }, { minion: 7, runner: 4, beast: 1 }, { minion: 8, runner: 4, beast: 2 }] },
  { id: 'market', name: 'Villa del mercado', region: 'LAS TIERRAS CENTRALES', description: 'El comercio del reino depende de estas calles. Los cañones llegan para detener a las bestias.', objective: 'Resiste 6 oleadas, incluyendo un guardián.', map: createMap([{ x: 12.5, z: 10.5 }, { x: 8.5, z: 8 }, { x: 8.5, z: -5.2 }, { x: 5, z: -8 }, { x: 1, z: -5.2 }, { x: 1, z: 7 }, { x: -3, z: 9.5 }, { x: -7, z: 7 }, { x: -7, z: -4.5 }, { x: -11.5, z: -8.8 }], 892, 'village'), towers: ['archer', 'crossbow', 'cannon'], healthMultiplier: 1.05,
    waves: [{ minion: 7, runner: 2 }, { minion: 7, runner: 3, beast: 1 }, { minion: 8, runner: 3, beast: 2 }, { minion: 8, runner: 6, beast: 2 }, { minion: 8, runner: 4, beast: 3 }, { minion: 9, runner: 6, beast: 3, guardian: 1 }] },
  { id: 'citadel', name: 'Ciudadela real', region: 'EL CORAZÓN DEL REINO', description: 'Las últimas murallas reúnen a todo el ejército. Los magos se unen a la defensa de la ciudad.', objective: 'Resiste 7 oleadas contra las hordas de guardianes.', map: createMap([{ x: 12.5, z: 10.5 }, { x: 7.5, z: 9 }, { x: -8.5, z: 9 }, { x: -11.5, z: 5 }, { x: -8, z: 1 }, { x: 8.5, z: 1 }, { x: 11.5, z: -3 }, { x: 8, z: -7 }, { x: -7, z: -7 }, { x: -11.5, z: -8.8 }], 1547, 'citadel'), towers: ['archer', 'crossbow', 'cannon', 'mage'], healthMultiplier: 1.12,
    waves: [{ minion: 9, runner: 3, beast: 1 }, { minion: 9, runner: 4, beast: 2 }, { minion: 10, runner: 5, beast: 2 }, { minion: 11, runner: 5, beast: 3 }, { minion: 11, runner: 6, beast: 3, guardian: 1 }, { minion: 12, runner: 7, beast: 4 }, { minion: 14, runner: 8, beast: 4, guardian: 2 }] },
];
export function waveEnemies(wave: WaveDefinition): EnemyKind[] {
  // Interleave the lighter enemies, then end each challenge with its elite units.
  const queue: EnemyKind[] = [];
  const count = Math.max(wave.minion, wave.runner ?? 0, wave.beast ?? 0);
  for (let i = 0; i < count; i++) { if (i < wave.minion) queue.push('minion'); if (i < (wave.runner ?? 0)) queue.push('runner'); if (i < (wave.beast ?? 0)) queue.push('beast'); }
  for (let i = 0; i < (wave.guardian ?? 0); i++) queue.push('guardian');
  return queue;
}
export function earnedStars(hp: number, maxHp = 1000): number { return hp <= 0 ? 0 : hp / maxHp >= .9 ? 3 : hp / maxHp >= .6 ? 2 : 1; }
export function towerUnlockMission(kind: TowerKind): number { return MISSIONS.findIndex(m => m.towers.includes(kind)) + 1; }
