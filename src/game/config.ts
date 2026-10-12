export type TowerKind = 'archer' | 'crossbow' | 'cannon' | 'mage';
export type EnemyKind = 'minion' | 'runner' | 'beast' | 'guardian';
export type DamageKind = 'physical' | 'piercing' | 'magic';
export interface TowerStats {
  name: string; cost: number; damage: number; range: number; interval: number;
  projectileSpeed: number; splash: number; damageKind: DamageKind; color: number; description: string;
}
export const TOWERS: Record<TowerKind, TowerStats> = {
  archer: { name: 'Arqueros', cost: 100, damage: 18, range: 4.5, interval: .65, projectileSpeed: 18, splash: 0, damageKind: 'physical', color: 0xd5b16a, description: 'Rápidos y precisos · daño individual' },
  crossbow: { name: 'Ballesta', cost: 150, damage: 65, range: 6, interval: 1.9, projectileSpeed: 21, splash: 0, damageKind: 'piercing', color: 0xe5d2a3, description: 'Gran alcance · perfora armaduras' },
  cannon: { name: 'Cañón', cost: 200, damage: 48, range: 4.2, interval: 2.1, projectileSpeed: 10, splash: 1.8, damageKind: 'physical', color: 0xffa64e, description: 'Daño explosivo · elimina grupos' },
  mage: { name: 'Mago', cost: 150, damage: 34, range: 4.8, interval: 1.15, projectileSpeed: 12, splash: 0, damageKind: 'magic', color: 0x65eaff, description: 'Magia arcana · ignora armadura física' },
};
export interface EnemyStats { name: string; hp: number; speed: number; armor: number; magicResist: number; reward: number; leak: number; scale: number; }
export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  minion: { name: 'Esbirro maldito', hp: 48, speed: 1.35, armor: .05, magicResist: 0, reward: 12, leak: 30, scale: .7 },
  runner: { name: 'Corredor sombrío', hp: 35, speed: 2.25, armor: 0, magicResist: .1, reward: 14, leak: 25, scale: .55 },
  beast: { name: 'Bestia acorazada', hp: 190, speed: .9, armor: .6, magicResist: .05, reward: 30, leak: 75, scale: 1.05 },
  guardian: { name: 'Guardián maldito', hp: 500, speed: .75, armor: .38, magicResist: .35, reward: 70, leak: 160, scale: 1.4 },
};
export const WORLD = { width: 30, depth: 26, elevation: 1.65, roadHalfWidth: 1.15, towerRadius: .72, preparation: 20, initialGold: 300, crystalHp: 1000 };
export function towerStats(kind: TowerKind, level: number): TowerStats {
  const base = TOWERS[kind];
  return { ...base, damage: Math.round(base.damage * (1 + (level - 1) * .65)), range: base.range + (level - 1) * .45, interval: base.interval * Math.pow(.87, level - 1), splash: base.splash + (base.splash ? (level - 1) * .25 : 0) };
}
export function upgradeCost(kind: TowerKind, level: number): number { return Math.round(TOWERS[kind].cost * (.65 + level * .35)); }
export function damageAfterResistance(damage: number, kind: DamageKind, enemy: EnemyStats): number {
  return damage * (1 - (kind === 'magic' ? enemy.magicResist : kind === 'piercing' ? enemy.armor * .2 : enemy.armor));
}
