export type TowerKind = 'archer' | 'crossbow' | 'mage' | 'cannon';
export type EnemyKind = 'minion' | 'runner' | 'beast' | 'guardian';
export type DamageKind = 'physical' | 'piercing' | 'magic';
export interface TowerStats {
  name: string; cost: number; damage: number; range: number; interval: number;
  projectileSpeed: number; splash: number; damageKind: DamageKind; color: number; description: string;
}
export const TOWERS: Record<TowerKind, TowerStats> = {
  archer: { name: 'Arqueros', cost: 100, damage: 18, range: 4.5, interval: .7, projectileSpeed: 18, splash: 0, damageKind: 'physical', color: 0xd5b16a, description: 'Rápidos y precisos · frenan al enemigo más cercano al castillo' },
  crossbow: { name: 'Ballesta', cost: 200, damage: 65, range: 6, interval: 2.2, projectileSpeed: 21, splash: 0, damageKind: 'piercing', color: 0xe5d2a3, description: 'Gran alcance · prioriza amenazas acorazadas y perfora su armadura' },
  mage: { name: 'Mago', cost: 350, damage: 95, range: 4.8, interval: 1.3, projectileSpeed: 12, splash: 0, damageKind: 'magic', color: 0x65eaff, description: 'Contra armaduras · concentra magia en bestias acorazadas' },
  cannon: { name: 'Cañón', cost: 500, damage: 110, range: 4.6, interval: 2.4, projectileSpeed: 10, splash: 2.1, damageKind: 'physical', color: 0xffa64e, description: 'Contra grupos · lento, pero daña a todos en la explosión' },
};
export const MAX_TOWER_LEVEL = 3;
interface TowerUpgrade { cost: number; damage: number; range: number; interval: number; splash: number; }
// Incremental prices, paid by each placed tower. Expansion buys coverage; upgrades concentrate power.
export const TOWER_UPGRADES: Record<TowerKind, readonly [TowerUpgrade, TowerUpgrade]> = {
  archer: [{ cost: 80, damage: 30, range: 4.8, interval: .65, splash: 0 }, { cost: 140, damage: 48, range: 5.1, interval: .6, splash: 0 }],
  crossbow: [{ cost: 160, damage: 110, range: 6.4, interval: 2.1, splash: 0 }, { cost: 280, damage: 180, range: 6.8, interval: 2, splash: 0 }],
  mage: [{ cost: 250, damage: 155, range: 5.1, interval: 1.2, splash: 0 }, { cost: 450, damage: 245, range: 5.4, interval: 1.1, splash: 0 }],
  cannon: [{ cost: 350, damage: 180, range: 4.9, interval: 2.25, splash: 2.5 }, { cost: 600, damage: 280, range: 5.2, interval: 2.1, splash: 2.9 }],
};
export interface EnemyStats { name: string; hp: number; speed: number; armor: number; magicResist: number; reward: number; score: number; leak: number; scale: number; }
export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  minion: { name: 'Esbirro maldito', hp: 52, speed: 1.65, armor: .05, magicResist: 0, reward: 10, score: 120, leak: 30, scale: .7 },
  runner: { name: 'Corredor sombrío', hp: 38, speed: 2.8, armor: 0, magicResist: .1, reward: 11, score: 140, leak: 25, scale: .55 },
  beast: { name: 'Bestia acorazada', hp: 220, speed: 1.2, armor: .6, magicResist: .05, reward: 26, score: 300, leak: 75, scale: 1.05 },
  guardian: { name: 'Guardián maldito', hp: 600, speed: 1.15, armor: .38, magicResist: .35, reward: 60, score: 700, leak: 160, scale: 1.4 },
};
export const WORLD = { width: 30, depth: 26, elevation: 1.65, roadHalfWidth: 1.15, towerRadius: .72, preparation: 20, initialGold: 300, castleHp: 1000 };
export const BALANCE = { healthGrowth: 1.1, minimumSpawnInterval: .4, waveGoldBase: 25, waveGoldStep: 5 };
export function waveGold(wave: number): number { return BALANCE.waveGoldBase + wave * BALANCE.waveGoldStep; }
export function towerStats(kind: TowerKind, level: number): TowerStats {
  const base = TOWERS[kind];
  const upgrade = TOWER_UPGRADES[kind][Math.min(MAX_TOWER_LEVEL, Math.max(1, Math.floor(level))) - 2];
  if (!upgrade) return { ...base };
  const { damage, range, interval, splash } = upgrade;
  return { ...base, damage, range, interval, splash };
}
export function upgradeCost(kind: TowerKind, level: number): number { return TOWER_UPGRADES[kind][level - 1]?.cost ?? Infinity; }
export function refundGold(invested: number): number { return Math.floor(invested * 7 / 10); }
export function damageAfterResistance(damage: number, kind: DamageKind, enemy: EnemyStats): number {
  return damage * (1 - (kind === 'magic' ? enemy.magicResist : kind === 'piercing' ? enemy.armor * .2 : enemy.armor));
}
