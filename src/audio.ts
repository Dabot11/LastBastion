import type { GameEvent } from './game/simulation';
export class AudioEffects {
  muted = true; private context: AudioContext | null = null;
  toggle(): boolean { this.muted = !this.muted; if (!this.muted) { this.context ??= new AudioContext(); void this.context.resume(); } return this.muted; }
  play(event: GameEvent): void {
    if (this.muted || !this.context) return;
    const frequencies: Partial<Record<GameEvent['type'], number>> = { shot: event.kind === 'mage' ? 670 : event.kind === 'cannon' ? 75 : 220, impact: event.kind === 'cannon' ? 90 : event.kind === 'mage' ? 740 : undefined, build: 460, upgrade: 780, leak: 110, kill: 140, gameover: 65, wave: 350 };
    const frequency = frequencies[event.type]; if (!frequency) return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = event.type === 'shot' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(frequency, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(frequency * .5, ctx.currentTime + .12);
    gain.gain.setValueAtTime(.035, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .16);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .17);
  }
}
