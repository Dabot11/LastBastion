import { ENEMIES, TOWERS, WORLD, damageAfterResistance, towerStats, upgradeCost, type EnemyKind, type TowerKind, type DamageKind } from './config';
import { PATH_LENGTH, distance, placementError, samplePath, type Point } from './path';
export interface Enemy extends Point { id: number; kind: EnemyKind; hp: number; maxHp: number; progress: number; angle: number; }
export interface Tower extends Point { id: number; kind: TowerKind; level: number; cooldown: number; invested: number; targetAngle: number; }
export interface Projectile extends Point { id: number; kind: TowerKind; targetId: number; target: Point; damage: number; damageKind: DamageKind; splash: number; speed: number; origin: Point; travelled: number; }
export type GameEvent = { type: 'shot' | 'impact' | 'kill' | 'build' | 'upgrade' | 'leak' | 'wave' | 'gameover'; x: number; z: number; kind?: TowerKind };
export class Simulation {
  gold = WORLD.initialGold; crystalHp = WORLD.crystalHp; wave = 0; kills = 0; score = 0;
  phase: 'preparation' | 'wave' | 'gameover' = 'preparation'; preparation = WORLD.preparation;
  enemies: Enemy[] = []; towers: Tower[] = []; projectiles: Projectile[] = []; events: GameEvent[] = [];
  spawnQueue: EnemyKind[] = []; spawned = 0; waveTotal = 0; spawnTimer = 0; nextId = 1;
  get alive(): number { return this.enemies.length; }
  build(kind: TowerKind, p: Point): string | Tower {
    if (this.phase === 'gameover') return 'La partida ha terminado';
    const error = placementError(p, this.towers, this.gold, TOWERS[kind].cost); if (error) return error;
    this.gold -= TOWERS[kind].cost;
    const tower: Tower = { ...p, id: this.nextId++, kind, level: 1, cooldown: 0, invested: TOWERS[kind].cost, targetAngle: 0 };
    this.towers.push(tower); this.events.push({ type: 'build', ...p }); return tower;
  }
  upgrade(id: number): string | null {
    const t = this.towers.find(t => t.id === id); if (!t || this.phase === 'gameover') return 'Torre no disponible';
    if (t.level >= 3) return 'Nivel máximo alcanzado';
    const cost = upgradeCost(t.kind, t.level); if (this.gold < cost) return 'No tienes suficiente oro';
    this.gold -= cost; t.invested += cost; t.level++; this.events.push({ type: 'upgrade', x: t.x, z: t.z }); return null;
  }
  sell(id: number): number {
    if (this.phase === 'gameover') return 0;
    const t = this.towers.find(t => t.id === id); if (!t) return 0;
    const refund = Math.floor(t.invested * .7); this.gold += refund; this.towers = this.towers.filter(t => t.id !== id); return refund;
  }
  startWave(): void {
    if (this.phase !== 'preparation') return;
    this.wave++; this.phase = 'wave'; this.spawnTimer = 0; this.spawned = 0;
    const count = Math.min(160, 6 + this.wave * 3);
    this.spawnQueue = Array.from({ length: count }, (_, i): EnemyKind => {
      if (this.wave >= 5 && i === count - 1 && this.wave % 5 === 0) return 'guardian';
      if (this.wave >= 10 && i % 11 === 9) return 'guardian';
      if (this.wave >= 3 && i % 5 === 3) return 'beast';
      if (this.wave >= 2 && i % 3 === 1) return 'runner'; return 'minion';
    });
    this.waveTotal = count; this.events.push({ type: 'wave', x: 0, z: 0 });
  }
  spawn(kind: EnemyKind): Enemy {
    const hp = ENEMIES[kind].hp * Math.pow(1.115, Math.min(500, this.wave - 1));
    const e: Enemy = { id: this.nextId++, kind, hp, maxHp: hp, progress: 0, ...samplePath(0) };
    this.enemies.push(e); return e;
  }
  hit(e: Enemy, damage: number, kind: DamageKind): void {
    if (e.hp <= 0) return;
    e.hp -= damageAfterResistance(damage, kind, ENEMIES[e.kind]);
    if (e.hp <= 0) { this.kills++; this.gold += ENEMIES[e.kind].reward; this.score += ENEMIES[e.kind].reward * 10 + this.wave * 5; this.events.push({ type: 'kill', x: e.x, z: e.z }); }
  }
  update(dt: number): void {
    if (this.phase === 'gameover' || dt <= 0) return;
    if (this.phase === 'preparation') { this.preparation = Math.max(0, this.preparation - dt); if (!this.preparation) this.startWave(); }
    if (this.phase === 'wave') {
      this.spawnTimer -= dt;
      while (this.spawnTimer <= 0 && this.spawnQueue.length) { this.spawn(this.spawnQueue.shift()!); this.spawned++; this.spawnTimer += Math.max(.4, 1.1 - this.wave * .018); }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.progress += ENEMIES[e.kind].speed * (1 + Math.min(.6, this.wave * .012)) * dt;
      Object.assign(e, samplePath(e.progress));
      if (e.progress >= PATH_LENGTH) {
        e.hp = 0; this.crystalHp = Math.max(0, this.crystalHp - ENEMIES[e.kind].leak);
        this.events.push({ type: 'leak', x: e.x, z: e.z });
        if (this.crystalHp === 0) { this.phase = 'gameover'; this.events.push({ type: 'gameover', x: e.x, z: e.z }); return; }
      }
    }
    for (const t of this.towers) {
      const stats = towerStats(t.kind, t.level); t.cooldown -= dt;
      const target = this.enemies.filter(e => e.hp > 0 && distance(e, t) <= stats.range).sort((a, b) => b.progress - a.progress)[0];
      if (!target) { t.cooldown = Math.max(0, t.cooldown); continue; }
      t.targetAngle = Math.atan2(target.x - t.x, target.z - t.z);
      if (t.cooldown <= 0) {
        t.cooldown = stats.interval;
        this.projectiles.push({ id: this.nextId++, x: t.x, z: t.z, origin: { x: t.x, z: t.z }, targetId: target.id, target: { x: target.x, z: target.z }, damage: stats.damage, damageKind: stats.damageKind, splash: stats.splash, speed: stats.projectileSpeed, kind: t.kind, travelled: 0 });
        this.events.push({ type: 'shot', x: t.x, z: t.z, kind: t.kind });
      }
    }
    const remaining: Projectile[] = [];
    for (const p of this.projectiles) {
      const target = this.enemies.find(e => e.id === p.targetId && e.hp > 0);
      if (target) p.target = { x: target.x, z: target.z };
      const d = distance(p, p.target), step = p.speed * dt;
      if (d <= step) {
        if (p.splash) { for (const e of this.enemies) if (e.hp > 0 && distance(e, p.target) <= p.splash) this.hit(e, p.damage, p.damageKind); }
        else if (target) this.hit(target, p.damage, p.damageKind);
        this.events.push({ type: 'impact', ...p.target, kind: p.kind });
      } else { p.x += (p.target.x - p.x) / d * step; p.z += (p.target.z - p.z) / d * step; p.travelled += step; remaining.push(p); }
    }
    this.projectiles = remaining; this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.phase === 'wave' && !this.spawnQueue.length && !this.enemies.length && !this.projectiles.length) {
      this.phase = 'preparation'; this.preparation = WORLD.preparation;
      const reward = 35 + this.wave * 5; this.gold += reward; this.score += this.wave * 100;
    }
  }
}
