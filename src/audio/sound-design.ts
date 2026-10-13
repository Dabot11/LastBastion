// Original synthesis for music, other effects and unpitched weapon fallbacks.
export const SOUND_NAMES = ['crossbow', 'impact-crossbow', 'gate', 'build', 'upgrade', 'wave', 'victory', 'defeat', 'step', 'voice-minion', 'voice-runner', 'voice-beast', 'voice-guardian'] as const;
export type SoundName = typeof SOUND_NAMES[number];
export const AUDIO_SAMPLE_RATE = 22050;
export const MUSIC_SECONDS = 24;
const durations: Record<SoundName, number> = { crossbow: .18, 'impact-crossbow': .13, gate: .40, build: .38, upgrade: .85, wave: .80, victory: 1.8, defeat: 1.6, step: .16, 'voice-minion': .35, 'voice-runner': .28, 'voice-beast': .58, 'voice-guardian': .70 };
function random(seed: number): () => number { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296 * 2 - 1; }; }
function envelope(t: number, duration: number, decay = 6): number { return Math.min(1, t / .003) * Math.exp(-decay * t / duration) * Math.min(1, (duration - t) / .015); }
function noise(data: Float32Array, rate: number, start: number, duration: number, amplitude: number, low: number, high: number, rng: () => number, decay = 6): void {
  const fast = 1 - Math.exp(-Math.PI * 2 * Math.min(high, rate * .44) / rate), slow = 1 - Math.exp(-Math.PI * 2 * low / rate);
  let hi = 0, lo = 0;
  for (let i = 0; i < duration * rate; i++) { const t = i / rate, index = Math.round(start * rate) + i; if (index >= data.length) break; const white = rng(); hi += fast * (white - hi); lo += slow * (white - lo); data[index] += (hi - lo) * amplitude * envelope(t, duration, decay); }
}
function tone(data: Float32Array, rate: number, start: number, duration: number, amplitude: number, from: number, to = from, decay = 6): void {
  let phase = 0;
  for (let i = 0; i < duration * rate; i++) { const t = i / rate, index = Math.round(start * rate) + i; if (index >= data.length) break; phase += Math.PI * 2 * (from + (to - from) * t / duration) / rate; data[index] += (Math.sin(phase) + Math.sin(phase * 2) * .13) * amplitude * envelope(t, duration, decay); }
}
function pluck(data: Float32Array, rate: number, start: number, duration: number, amplitude: number, frequency: number, rng: () => number): void {
  const delay = Float32Array.from({ length: Math.round(rate / frequency) }, rng); let previous = 0;
  for (let i = 0; i < duration * rate; i++) { const index = Math.round(start * rate) + i; if (index >= data.length) break; const head = i % delay.length, value = delay[head]; delay[head] = (value + previous) * .495; previous = value; data[index] += value * amplitude * envelope(i / rate, duration, 3); }
}
function voice(data: Float32Array, rate: number, pitch: number, rng: () => number): void {
  const duration = data.length / rate; let phase = 0, rasp = 0;
  const harmonics = Array.from({ length: 12 }, (_, i) => { const n = i + 1, f = n * pitch; return (.2 + Math.exp(-(((f - 340) / 190) ** 2)) + .7 * Math.exp(-(((f - 840) / 240) ** 2))) / n; });
  for (let i = 0; i < data.length; i++) { const t = i / rate; phase += Math.PI * 2 * pitch * (1 - .25 * t / duration + .025 * Math.sin(t * 47)) / rate; rasp += .18 * (rng() - rasp); let throat = 0; harmonics.forEach((amplitude, h) => { throat += Math.sin(phase * (h + 1)) * amplitude; }); data[i] += (throat * .48 + rasp * .7) * envelope(t, duration, 3) * (.72 + .28 * Math.sin(t * 35) ** 2); }
}
function limit(data: Float32Array, ceiling = .82): void { let peak = 0; for (const value of data) peak = Math.max(peak, Math.abs(value)); if (peak > ceiling) for (let i = 0; i < data.length; i++) data[i] *= ceiling / peak; }
export function renderSound(name: SoundName, rate = AUDIO_SAMPLE_RATE, seed = 71): Float32Array {
  const data = new Float32Array(Math.ceil(durations[name] * rate)), rng = random(seed);
  const n = (start: number, duration: number, amp: number, lo: number, hi: number, decay = 6) => noise(data, rate, start, duration, amp, lo, hi, rng, decay);
  const t = (start: number, duration: number, amp: number, from: number, to = from, decay = 6) => tone(data, rate, start, duration, amp, from, to, decay);
  if (name === 'crossbow') { n(0, .022, 1.2, 600, 7400, 8); n(.002, .048, .80, 120, 2300, 7); n(.014, .11, .60, 1200, 7800, 5); }
  else if (name.startsWith('voice-')) { const pitch: Record<string, number> = { 'voice-minion': 106, 'voice-runner': 158, 'voice-beast': 62, 'voice-guardian': 43 }; voice(data, rate, pitch[name], rng); }
  else if (name === 'gate') { n(0, .15, 1.3, 80, 3200); t(0, .22, .28, 148, 63); n(.08, .25, .40, 900, 5900); }
  else if (name === 'impact-crossbow') { n(0, .045, .92, 200, 4400, 8); n(.006, .10, .55, 45, 540, 7); n(.008, .065, .24, 1500, 7200, 8); }
  else if (name === 'step') { n(0, .08, .65, 100, 1400); n(.02, .11, .28, 1900, 5900); }
  else if (name === 'build') { for (const start of [0, .09, .21]) { n(start, .10, .8, 160, 3900); t(start, .09, .18, 280, 150); } }
  else if (name === 'upgrade') { for (const [i, frequency] of [587, 698, 880, 1174].entries()) { t(i * .11, .4, .30, frequency, frequency, 4); pluck(data, rate, i * .11, .23, .30, frequency / 2, rng); } n(0, .14, .35, 1600, 5900); }
  else if (name === 'wave') { t(0, .7, .4, 146, 146, 2); t(.06, .6, .20, 220, 220, 2); n(0, .11, .45, 120, 2900); }
  else if (name === 'victory') { for (const [i, frequency] of [293.66, 369.99, 440, 587.33].entries()) { t(i * .16, 1.1, .28, frequency, frequency, 3); pluck(data, rate, i * .16, .8, .35, frequency, rng); } }
  else if (name === 'defeat') { t(0, 1.4, .38, 146, 73, 3); t(.18, 1.2, .24, 110, 55, 3); n(.1, 1.3, .35, 50, 500); }
  // A final fade also covers layers whose resonant tail extends past the sound's envelope.
  const fade = Math.round(rate * .01);
  for (let i = 0; i < fade; i++) data[data.length - 1 - i] *= i / fade;
  limit(data); return data;
}
export function renderMusic(rate = AUDIO_SAMPLE_RATE): [Float32Array, Float32Array] {
  const count = MUSIC_SECONDS * rate, left = new Float32Array(count), right = new Float32Array(count), rng = random(913);
  const beat = .75, chords = [[50, 53, 57], [50, 53, 57], [46, 50, 53], [46, 50, 53], [53, 57, 60], [53, 57, 60], [48, 52, 55], [48, 52, 55]], notes = new Map<number, Float32Array>();
  function note(midi: number): Float32Array { if (!notes.has(midi)) { const sound = new Float32Array(rate * 2.4); pluck(sound, rate, 0, 2.4, .7, 440 * 2 ** ((midi - 69) / 12), rng); notes.set(midi, sound); } return notes.get(midi)!; }
  function add(sound: Float32Array, start: number, amplitude: number, pan: number): void { for (let i = 0; i < sound.length; i++) { const index = (Math.round(start * rate) + i) % count; left[index] += sound[i] * amplitude * (1 - pan * .4); right[index] += sound[i] * amplitude * (1 + pan * .4); } }
  const drum = new Float32Array(rate * .35); noise(drum, rate, 0, .20, .5, 80, 1700, rng); tone(drum, rate, 0, .26, .3, 90, 45);
  chords.forEach((chord, bar) => {
    for (const [index, pulse] of [0, .5, 1.5, 2, 2.5, 3.5].entries()) add(note(chord[[0, 2, 1, 2, 0, 1][index]] + 12), (bar * 4 + pulse) * beat, .32, index % 2 ? .45 : -.45);
    add(note(chord[0] - 12), bar * 4 * beat, .5, 0);
    for (const midi of chord) { const bow = new Float32Array(rate * 3.6), frequency = 440 * 2 ** ((midi - 69) / 12); tone(bow, rate, 0, 3.6, .075, frequency, frequency * 1.001, 1.6); add(bow, bar * 4 * beat, .8, 0); }
    add(drum, bar * 4 * beat, .18, -.15); add(drum, (bar * 4 + 2) * beat, .10, .15);
  });
  let peak = 0; for (let i = 0; i < count; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  if (peak) for (let i = 0; i < count; i++) { left[i] *= .55 / peak; right[i] *= .55 / peak; }
  return [left, right];
}
