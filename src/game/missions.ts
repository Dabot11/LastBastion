import { BALANCE, type EnemyKind, type TowerKind } from './config';
import { createMap, DEFAULT_MAP, type GameMap, type Point } from './path';
export interface WaveDefinition { minion: number; runner?: number; beast?: number; guardian?: number; interval?: number; }
export interface Mission { id: string; name: string; region: string; description: string; objective: string; map: GameMap; towers: TowerKind[]; waves: WaveDefinition[]; healthMultiplier: number; gateHp: number; manualPreparation?: boolean; }
// Stable mission IDs preserve campaign saves. Teach, practice, then combine each new threat.
const route = (points: [number, number][], seed: number, theme: GameMap['theme'], pads: number): GameMap =>
  createMap(points.map(([x, z]): Point => ({ x, z })), seed, theme, pads);
export const MISSIONS: Mission[] = [
  { id: 'pines', name: 'Aldea de los pinos', region: 'LA FRONTERA', description: 'Empieza con Precisión junto a la puerta. Las bases iluminadas son una sugerencia: tú decides dónde construir.', objective: 'Resiste 3 oleadas. Protege la puerta para conservar tus estrellas.',
    map: DEFAULT_MAP, towers: ["precision"], healthMultiplier: 0.9, gateHp: 1000, manualPreparation: true,
    waves: [{ minion: 4, interval: 2.4 }, { minion: 6, interval: 2.1 }, { minion: 8, interval: 1.8 }] },
  { id: 'market', name: 'Villa del mercado', region: 'LAS TIERRAS CENTRALES', description: 'La puerta es tu última línea de defensa. Usa el oro ganado para mejorar una ballesta entre oleadas.', objective: 'Resiste 4 oleadas. Aprende a mejorar tus defensas.',
    map: route([[12.5, 10.5], [8, 7], [-6, 7], [-9, -3], [-11.5, -8.8]], 892, 'village', 5), towers: ["precision"], healthMultiplier: 0.98, gateHp: 1200, manualPreparation: true,
    waves: [{ minion: 6, interval: 1.8 }, { minion: 9, interval: 1.5 }, { minion: 12, interval: 1.3 }, { minion: 16, interval: 1.1 }] },
  { id: 'citadel', name: 'Ciudadela real', region: 'EL CORAZÓN DEL REINO', description: 'Los corredores se mueven rápido. Conserva una ballesta cerca de la puerta y añade cobertura por el camino.', objective: 'Resiste 4 oleadas. Detén a los primeros corredores.',
    map: route([[12.5, 10.5], [6, 8], [-5, 8], [-8, 3], [-3, -2], [-8, -6], [-11.5, -8.8]], 1547, 'citadel', 6), towers: ["precision"], healthMultiplier: 1.02, gateHp: 1400, manualPreparation: true,
    waves: [{ minion: 8, interval: 1.5 }, { minion: 10, runner: 2, interval: 1.3 }, { minion: 12, runner: 4, interval: 1.1 }, { minion: 16, runner: 6, interval: 0.9 }] },
  { id: 'siege', name: 'El último bastión', region: 'EL PASO DEL NORTE', description: 'Desbloqueas Triple: alcanza enemigos distintos en cada descarga. Pruébala contra grupos y conserva Precisión cerca de la puerta.', objective: 'Resiste 5 oleadas. Combina Triple y Precisión.',
    map: route([[12.5, 10.5], [9, 7], [9, -3], [3, -5], [-2, 3], [-8, 3], [-9, -5], [-11.5, -8.8]], 2311, 'citadel', 7), towers: ["precision", "triple"], healthMultiplier: 1.04, gateHp: 1600, manualPreparation: false,
    waves: [{ minion: 10, runner: 2, interval: 1.2 }, { minion: 14, runner: 4, interval: 1 }, { minion: 18, runner: 6, interval: 0.8 }, { minion: 22, runner: 8, interval: 0.65 }, { minion: 26, runner: 10, interval: 0.55 }] },
  { id: 'woodland', name: 'Bosque de los ecos', region: 'EL BOSQUE PROFUNDO', description: 'Los corredores llegan en grupos mayores. Triple cubre los grupos; Precisión remata junto al castillo.', objective: 'Resiste 5 oleadas. Refuerza la cobertura contra grupos rápidos.',
    map: route([[12.5, 10.5], [8, 8], [8, -4], [2, -6], [-1, 5], [-7, 7], [-9, -4], [-11.5, -8.8]], 3107, 'forest', 8), towers: ["precision", "triple"], healthMultiplier: 1.08, gateHp: 1800, manualPreparation: false,
    waves: [{ minion: 12, runner: 4, interval: 1.1 }, { minion: 16, runner: 6, interval: 0.9 }, { minion: 20, runner: 10, interval: 0.7 }, { minion: 24, runner: 14, interval: 0.55 }, { minion: 28, runner: 18, interval: 0.45 }] },
  { id: 'crossroads', name: 'Villa de las caravanas', region: 'LA RUTA DEL COMERCIO', description: 'Desbloqueas Veneno para las bestias acorazadas. Colócalo temprano para que actúe y mantén protegida la puerta.', objective: 'Resiste 6 oleadas. Aprende a desgastar armaduras.',
    map: route([[12.5, 10.5], [9, 7], [9, -4.5], [5.5, -7.5], [2, -4.5], [2, 6.5], [-2, 9], [-6.5, 6.5], [-6.5, -3], [-11.5, -8.8]], 3893, 'village', 9), towers: ["precision", "triple", "poison"], healthMultiplier: 1.09, gateHp: 2000, manualPreparation: false,
    waves: [{ minion: 12, runner: 4, interval: 1 }, { minion: 16, runner: 5, interval: 0.85 }, { minion: 18, runner: 6, beast: 1, interval: 0.75 }, { minion: 22, runner: 8, beast: 1, interval: 0.65 }, { minion: 26, runner: 10, beast: 2, interval: 0.55 }, { minion: 30, runner: 12, beast: 2, interval: 0.45 }] },
  { id: 'watch', name: 'Fortaleza de la colina', region: 'LAS COLINAS DEL ESTE', description: 'Las curvas dejan compartir cobertura entre tramos. Elige dónde ampliar tus defensas y dónde mejorar las existentes.', objective: 'Resiste 6 oleadas. Combina cobertura y mejoras.',
    map: route([[12.5, 10.5], [5, 10], [2, 6], [10, 3], [10, -3.5], [6, -5.5], [0.5, -2], [-0.5, 5.5], [-5, 7], [-9.5, 3.5], [-6.5, -2.5], [-11.5, -8.8]], 4679, 'citadel', 10), towers: ["precision", "triple", "poison"], healthMultiplier: 1.1, gateHp: 2200, manualPreparation: false,
    waves: [{ minion: 14, runner: 5, interval: 0.95 }, { minion: 18, runner: 7, beast: 1, interval: 0.8 }, { minion: 22, runner: 9, beast: 1, interval: 0.65 }, { minion: 26, runner: 11, beast: 2, interval: 0.55 }, { minion: 30, runner: 13, beast: 2, interval: 0.45 }, { minion: 34, runner: 16, beast: 2, interval: 0.4 }] },
  { id: 'river', name: 'Aldea del viejo molino', region: 'EL VALLE DEL MOLINO', description: 'Un guardián marcha con escoltas. Veneno necesita tiempo para debilitarlo; Precisión protege la puerta de quienes sobrevivan.', objective: 'Resiste 7 oleadas. Detén al primer guardián.',
    map: route([[12.5, 10.5], [7, 9.5], [-8, 9.5], [-11, 5.5], [-7, 2], [8, 2], [11, -2], [7, -5.5], [-6.5, -5.5], [-11.5, -8.8]], 5465, 'village', 11), towers: ["precision", "triple", "poison"], healthMultiplier: 1.11, gateHp: 2400, manualPreparation: false,
    waves: [{ minion: 16, runner: 5, interval: 0.9 }, { minion: 20, runner: 7, beast: 1, interval: 0.75 }, { minion: 24, runner: 9, beast: 2, interval: 0.65 }, { minion: 28, runner: 11, beast: 2, interval: 0.55 }, { minion: 32, runner: 13, beast: 2, interval: 0.45 }, { minion: 36, runner: 15, beast: 2, guardian: 1, interval: 0.4 }, { minion: 40, runner: 18, beast: 2, guardian: 1, interval: 0.4 }] },
  { id: 'highlands', name: 'Paso de los guardianes', region: 'LAS TIERRAS ALTAS', description: 'Corredores, bestias y guardianes combinan sus fuerzas. Prepara cada oleada y conserva una última línea de defensa junto al castillo.', objective: 'Resiste 8 oleadas. Ajusta tu estrategia a cada horda.',
    map: route([[12.5, 10.5], [7.5, 9], [-8.5, 9], [-11.5, 5], [-8, 1], [8.5, 1], [11.5, -3], [8, -7], [-7, -7], [-11.5, -8.8]], 6251, 'forest', 12), towers: ["precision", "triple", "poison"], healthMultiplier: 1.12, gateHp: 2700, manualPreparation: false,
    waves: [{ minion: 18, runner: 6, interval: 0.85 }, { minion: 22, runner: 8, beast: 1, interval: 0.7 }, { minion: 26, runner: 10, beast: 2, interval: 0.6 }, { minion: 30, runner: 12, beast: 2, interval: 0.5 }, { minion: 34, runner: 14, beast: 2, guardian: 1, interval: 0.45 }, { minion: 38, runner: 16, beast: 2, guardian: 1, interval: 0.4 }, { minion: 42, runner: 18, beast: 2, guardian: 1, interval: 0.4 }, { minion: 46, runner: 20, beast: 2, guardian: 1, interval: 0.4 }] },
  { id: 'crown', name: 'Castillo de la corona', region: 'LA ÚLTIMA MARCHA', description: 'El primer capítulo culmina con hordas combinadas. Usa las tres ballestas y refuerza la puerta para conservar tus estrellas.', objective: 'Resiste 8 oleadas. Supera el desafío del primer capítulo.',
    map: route([[12.5, 10.5], [7.5, 8.5], [-9, 8.5], [-12, 5], [-9, 1.5], [9, 1.5], [12, -2], [9, -5.5], [-8, -5.5], [-11.5, -8.8]], 7037, 'citadel', 14), towers: ["precision", "triple", "poison"], healthMultiplier: 1.13, gateHp: 3000, manualPreparation: false,
    waves: [{ minion: 20, runner: 7, interval: 0.8 }, { minion: 24, runner: 9, beast: 1, interval: 0.65 }, { minion: 28, runner: 12, beast: 2, interval: 0.55 }, { minion: 32, runner: 15, beast: 2, guardian: 1, interval: 0.5 }, { minion: 36, runner: 18, beast: 2, guardian: 1, interval: 0.45 }, { minion: 40, runner: 21, beast: 2, guardian: 1, interval: 0.4 }, { minion: 44, runner: 24, beast: 2, guardian: 1, interval: 0.4 }, { minion: 50, runner: 28, beast: 2, guardian: 1, interval: 0.4 }] },
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
  if (wave.guardian) return towers.includes('poison') ? 'Guardián: Veneno temprano y Precisión al final' : 'Guardián: mejora Precisión y protege la puerta';
  if (wave.beast) return towers.includes('poison') ? 'Armaduras: aplica Veneno al principio' : 'Armaduras: concentra Precisión mejorada';
  if (wave.runner) return towers.includes('triple') ? 'Grupos rápidos: Triple en las curvas' : 'Rápidos: cubre las curvas con Precisión';
  return 'Esbirros: prepara Precisión';
}
export function towerUnlockMission(kind: TowerKind): number { return MISSIONS.findIndex(m => m.towers.includes(kind)) + 1; }
