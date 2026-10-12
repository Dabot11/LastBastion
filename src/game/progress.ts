import { MISSIONS } from './missions';
export const PROGRESS_KEY = 'last-bastion-campaign-v1';
export interface MissionRecord { stars: number; score: number; }
export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export class CampaignProgress {
  records: Record<string, MissionRecord> = {};
  constructor(private storage?: StorageAdapter) {
    try {
      const raw: unknown = JSON.parse(storage?.getItem(PROGRESS_KEY) ?? '{}');
      if (typeof raw !== 'object' || raw === null) return;
      for (const mission of MISSIONS) {
        const record = (raw as Record<string, unknown>)[mission.id];
        if (typeof record !== 'object' || record === null) continue;
        const { stars, score } = record as Record<string, unknown>;
        if (typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 3 && typeof score === 'number' && Number.isFinite(score) && score >= 0) this.records[mission.id] = { stars, score };
      }
    } catch { /* A damaged or unavailable save does not prevent playing. */ }
  }
  isUnlocked(index: number): boolean { return Number.isInteger(index) && index >= 0 && index < MISSIONS.length && (index === 0 || MISSIONS.slice(0, index).every(m => (this.records[m.id]?.stars ?? 0) > 0)); }
  get totalStars(): number { return Object.values(this.records).reduce((sum, r) => sum + r.stars, 0); }
  get completed(): number { return MISSIONS.filter(m => (this.records[m.id]?.stars ?? 0) > 0).length; }
  complete(index: number, stars: number, score: number): boolean {
    if (!this.isUnlocked(index) || !Number.isInteger(stars) || stars < 1 || stars > 3 || !Number.isFinite(score) || score < 0) return false;
    const mission = MISSIONS[index], before = this.records[mission.id];
    this.records[mission.id] = { stars: Math.max(before?.stars ?? 0, stars), score: Math.max(before?.score ?? 0, Math.round(score)) };
    try { this.storage?.setItem(PROGRESS_KEY, JSON.stringify(this.records)); return !!this.storage; } catch { return false; }
  }
}
