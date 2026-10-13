export type TowerKind = 'precision' | 'triple' | 'poison';
export type EnemyKind = 'minion' | 'runner' | 'beast' | 'guardian';
export type DamageKind = 'physical' | 'poison';
export type TargetPriority = 'first' | 'strongest' | 'gate';
export const TARGET_PRIORITIES: Record<TargetPriority, { name: string; description: string }> = {
  first: { name: 'Primero', description: 'Apunta al enemigo más avanzado en el recorrido.' },
  strongest: { name: 'Más resistente', description: 'Apunta al enemigo con más salud y armadura.' },
  gate: { name: 'Puerta', description: 'Prioriza a quienes golpean la puerta; después al más avanzado.' },
};
export interface TowerStats {
  name: string; cost: number; damage: number; range: number; interval: number;
  projectileSpeed: number; bolts: number; poisonDps: number; poisonDuration: number;
  damageKind: DamageKind; color: number; description: string;
}
export const MIN_SHOT_INTERVAL = 2.2;
export const TOWERS: Record<TowerKind, TowerStats> = {
  precision: { name: 'Precisión', cost: 150, damage: 65, range: 6, interval: 2.4, projectileSpeed: 21, bolts: 1, poisonDps: 0, poisonDuration: 0, damageKind: 'physical', color: 0xaad9ed, description: 'Daño inmediato · un virote potente para rematar y defender la puerta' },
  triple: { name: 'Triple', cost: 200, damage: 40, range: 5.2, interval: 2.8, projectileSpeed: 21, bolts: 2, poisonDps: 0, poisonDuration: 0, damageKind: 'physical', color: 0xf0c66d, description: 'Contra grupos · dos virotes a enemigos distintos; tres en nivel 3' },
  poison: { name: 'Veneno', cost: 250, damage: 12, range: 6, interval: 2.7, projectileSpeed: 20, bolts: 1, poisonDps: 20, poisonDuration: 4, damageKind: 'physical', color: 0x99d76b, description: 'Contra armaduras · desgaste lento; reaplicar renueva el efecto sin acumularlo' },
};
export const MAX_TOWER_LEVEL = 3;
interface TowerUpgrade { cost: number; damage: number; range: number; bolts: number; poisonDps: number; poisonDuration: number; }
export const TOWER_UPGRADES: Record<TowerKind, readonly [TowerUpgrade, TowerUpgrade]> = {
  precision: [{ cost: 110, damage: 90, range: 6.4, bolts: 1, poisonDps: 0, poisonDuration: 0 }, { cost: 200, damage: 120, range: 6.8, bolts: 1, poisonDps: 0, poisonDuration: 0 }],
  triple: [{ cost: 150, damage: 60, range: 5.6, bolts: 2, poisonDps: 0, poisonDuration: 0 }, { cost: 250, damage: 85, range: 6, bolts: 3, poisonDps: 0, poisonDuration: 0 }],
  poison: [{ cost: 170, damage: 18, range: 6.3, bolts: 1, poisonDps: 30, poisonDuration: 4.5 }, { cost: 280, damage: 24, range: 6.6, bolts: 1, poisonDps: 42, poisonDuration: 5 }],
};
export interface EnemyStats { name: string; hp: number; speed: number; armor: number; reward: number; score: number; gateDamage: number; attackInterval: number; scale: number; }
export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  minion: { name: 'Esbirro maldito', hp: 52, speed: 1.65, armor: .05, reward: 10, score: 120, gateDamage: 8, attackInterval: 1.2, scale: .7 },
  runner: { name: 'Corredor sombrío', hp: 38, speed: 2.8, armor: 0, reward: 11, score: 140, gateDamage: 6, attackInterval: .85, scale: .55 },
  beast: { name: 'Bestia acorazada', hp: 220, speed: 1.2, armor: .7, reward: 26, score: 300, gateDamage: 20, attackInterval: 1.9, scale: 1.05 },
  guardian: { name: 'Guardián maldito', hp: 600, speed: 1.15, armor: .55, reward: 60, score: 700, gateDamage: 40, attackInterval: 2.2, scale: 1.4 },
};
export const WORLD = { width: 34, depth: 26, elevation: 1.65, roadHalfWidth: 1.15, towerRadius: .72, preparation: 20, initialGold: 300, castleHp: 1000 };
export const BALANCE = { healthGrowth: 1.07, minimumSpawnInterval: .4, waveGoldBase: 25, waveGoldStep: 5 };
export function waveGold(wave: number): number { return BALANCE.waveGoldBase + wave * BALANCE.waveGoldStep; }
export function towerStats(kind: TowerKind, level: number): TowerStats {
  const base = TOWERS[kind], upgrade = TOWER_UPGRADES[kind][Math.min(MAX_TOWER_LEVEL, Math.max(1, Math.floor(level))) - 2];
  if (!upgrade) return { ...base };
  const { cost: _cost, ...stats } = upgrade;
  return { ...base, ...stats };
}
export function upgradeCost(kind: TowerKind, level: number): number { return TOWER_UPGRADES[kind][level - 1]?.cost ?? Infinity; }
export function refundGold(invested: number): number { return Math.floor(invested * 7 / 10); }
export function damageAfterResistance(damage: number, kind: DamageKind, enemy: EnemyStats): number {
  // Poison bypasses 75% of armor, but needs time; bolts retain their physical weakness.
  return damage * (1 - enemy.armor * (kind === 'poison' ? .25 : 1));
}
