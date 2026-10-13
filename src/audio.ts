import type { GameEvent, Simulation } from './game/simulation';
import { AUDIO_SAMPLE_RATE, renderMusic, renderSound, type SoundName } from './audio/sound-design';

export class AudioEffects {
  muted = true; musicEnabled = true; volume = .65;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicEnvelope: GainNode | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private musicBuffer: AudioBuffer | null = null;
  private readonly lastPlayed = new Map<string, number>();
  private voices = 0; private sequence = 0; private stepTimer = 0; private peaceful = true;
  constructor() {
    try { const settings = JSON.parse(localStorage.getItem('last-bastion-audio-v1') ?? '{}'); this.musicEnabled = settings.music !== false; if (Number.isFinite(settings.volume)) this.volume = Math.max(0, Math.min(1, settings.volume)); } catch { /* Defaults also work without storage. */ }
  }
  private save(): void { try { localStorage.setItem('last-bastion-audio-v1', JSON.stringify({ music: this.musicEnabled, volume: this.volume })); } catch { /* Audio remains usable without storage. */ } }
  private initialize(): void {
    if (this.context) return;
    this.context = new AudioContext(); this.master = this.context.createGain(); this.musicGain = this.context.createGain();
    const limiter = this.context.createDynamicsCompressor(); limiter.threshold.value = -9; limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = .004; limiter.release.value = .18;
    this.master.gain.value = 0; this.master.connect(limiter); limiter.connect(this.context.destination); this.musicGain.connect(this.master);
  }
  toggle(): boolean {
    this.initialize(); this.muted = !this.muted; void this.context!.resume();
    this.master!.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context!.currentTime, .025);
    if (this.muted) this.stopMusic(); else this.startMusic(); return this.muted;
  }
  setMusic(enabled: boolean): void { this.musicEnabled = enabled; this.save(); if (enabled && !this.muted) this.startMusic(); else this.stopMusic(); }
  setVolume(value: number): void { this.volume = Math.max(0, Math.min(1, value)); this.save(); if (this.context) this.master!.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, .025); }
  setVisible(visible: boolean): void { if (this.context) this.master!.gain.setTargetAtTime(visible && !this.muted ? this.volume : 0, this.context.currentTime, .06); }
  private startMusic(): void {
    if (!this.context || !this.musicEnabled || this.musicSource || this.muted) return;
    if (!this.musicBuffer) { const channels = renderMusic(); this.musicBuffer = this.context.createBuffer(2, channels[0].length, AUDIO_SAMPLE_RATE); channels.forEach((channel, i) => this.musicBuffer!.copyToChannel(channel as Float32Array<ArrayBuffer>, i)); }
    const source = this.context.createBufferSource(), envelope = this.context.createGain();
    source.buffer = this.musicBuffer; source.loop = true; envelope.gain.value = 0; envelope.gain.setTargetAtTime(1, this.context.currentTime, .12);
    source.connect(envelope); envelope.connect(this.musicGain!); source.start(); this.musicSource = source; this.musicEnvelope = envelope;
    this.musicGain!.gain.setValueAtTime(this.peaceful ? .16 : .23, this.context.currentTime);
  }
  private stopMusic(): void {
    if (!this.musicSource || !this.context) return;
    const source = this.musicSource, envelope = this.musicEnvelope;
    envelope?.gain.setTargetAtTime(0, this.context.currentTime, .02); source.stop(this.context.currentTime + .10);
    source.onended = () => { source.disconnect(); envelope?.disconnect(); }; this.musicSource = null; this.musicEnvelope = null;
  }
  private emit(name: SoundName, x = 0, z = 0, volume = .45, interval = .05): void {
    const ctx = this.context; if (this.muted || !ctx || ctx.state !== 'running' || document.hidden || this.voices >= 20) return;
    const now = ctx.currentTime; if (now - (this.lastPlayed.get(name) ?? -Infinity) < interval) return; this.lastPlayed.set(name, now);
    let buffer = this.buffers.get(name);
    if (!buffer) { const samples = renderSound(name); buffer = ctx.createBuffer(1, samples.length, AUDIO_SAMPLE_RATE); buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0); this.buffers.set(name, buffer); }
    const source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner(); source.buffer = buffer;
    source.playbackRate.value = name === 'upgrade' || name === 'victory' ? 1 : .97 + (++this.sequence % 7) * .01;
    gain.gain.value = volume; pan.pan.value = Math.max(-.7, Math.min(.7, (x * .94 + z * .35) / 24));
    source.connect(gain); gain.connect(pan); pan.connect(this.master!); this.voices++;
    source.onended = () => { source.disconnect(); gain.disconnect(); pan.disconnect(); this.voices--; }; source.start();
  }
  play(event: GameEvent): void {
    const weapon = event.kind === 'archer' ? 'arrow' : event.kind === 'mage' ? 'magic' : event.kind;
    if (event.type === 'shot' && weapon) this.emit(weapon, event.x, event.z, event.kind === 'cannon' ? .55 : .40);
    else if (event.type === 'impact' && weapon) this.emit(`impact-${weapon}`, event.x, event.z, .28, .10);
    else if (event.type === 'spawn' || event.type === 'kill' || event.type === 'damage') {
      if (event.enemyKind && (event.type !== 'spawn' || event.enemyKind === 'guardian' || event.enemyKind === 'beast' || (event.enemyId ?? 0) % 5 === 0)) this.emit(`voice-${event.enemyKind}`, event.x, event.z, event.type === 'spawn' ? .22 : .13, .85);
    } else if (event.type === 'gateHit') { this.emit('gate', event.x, event.z, .34, .15); if (event.enemyKind) this.emit(`voice-${event.enemyKind}`, event.x, event.z, .20, .8); }
    else if (['build', 'upgrade', 'wave', 'victory'].includes(event.type)) this.emit(event.type as SoundName, event.x, event.z, .30, .12);
    else if (event.type === 'gameover') this.emit('defeat', 0, 0, .35, 1);
  }
  update(sim: Simulation, active: boolean, dt: number): void {
    if (!this.context || this.muted) return;
    const hidden = document.hidden; this.master!.gain.setTargetAtTime(hidden ? 0 : this.volume, this.context.currentTime, .06);
    const peaceful = !active || sim.phase !== 'wave'; if (peaceful !== this.peaceful) { this.peaceful = peaceful; this.musicGain!.gain.setTargetAtTime(peaceful ? .16 : .23, this.context.currentTime, .8); }
    this.stepTimer -= dt;
    if (active && !hidden && sim.phase === 'wave' && this.stepTimer <= 0) { this.stepTimer = .38; const enemy = sim.enemies.find(e => e.state === 'marching'); if (enemy) this.emit('step', enemy.x, enemy.z, .09, .25); }
  }
  get playingMusic(): boolean { return !!this.musicSource; }
  get state(): AudioContextState | 'uninitialized' { return this.context?.state ?? 'uninitialized'; }
}
