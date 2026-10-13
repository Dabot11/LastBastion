import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_SAMPLE_RATE, MUSIC_SECONDS, SOUND_NAMES, renderMusic, renderSound } from '../src/audio/sound-design';

test('every weapon, impact, creature and reward has a non-silent finite waveform with safe headroom', () => {
  for (const name of SOUND_NAMES) {
    const sound = renderSound(name); let energy = 0, peak = 0;
    for (const value of sound) { assert.ok(Number.isFinite(value)); energy += value ** 2; peak = Math.max(peak, Math.abs(value)); }
    assert.ok(energy / sound.length > .00001, `${name} is inaudible`); assert.ok(peak <= .821, `${name} clips`);
    assert.equal(sound[0], 0); assert.ok(Math.abs(sound.at(-1)!) < .002);
  }
});
test('bow, crossbow, cannon and magic have distinct textures, envelopes and durations', () => {
  const sounds = ['arrow', 'crossbow', 'cannon', 'magic'].map(name => renderSound(name as 'arrow'));
  for (let i = 0; i < sounds.length; i++) for (const other of sounds.slice(i + 1)) {
    const a = sounds[i]; let dot = 0, left = 0, right = 0;
    for (let n = 0; n < Math.min(a.length, other.length); n++) { dot += a[n] * other[n]; left += a[n] ** 2; right += other[n] ** 2; }
    assert.ok(Math.abs(dot / Math.sqrt(left * right)) < .95, 'Do not reuse the same beep across weapons');
  }
  assert.ok(sounds[2].length > sounds[0].length * 3, 'A cannon blast needs a rumbling tail');
});
test('original stereo music loops without silence, clipped peaks or a discontinuity at the seam', () => {
  const [left, right] = renderMusic(); assert.equal(left.length, MUSIC_SECONDS * AUDIO_SAMPLE_RATE); assert.equal(right.length, left.length);
  let difference = 0;
  for (const channel of [left, right]) {
    let energy = 0;
    for (const value of channel) { assert.ok(Number.isFinite(value) && Math.abs(value) <= .551); energy += value ** 2; }
    assert.ok(energy / channel.length > .0001); assert.ok(Math.abs(channel[0] - channel.at(-1)!) < .04, 'Avoid a click at every loop');
  }
  for (let i = 0; i < left.length; i++) difference += Math.abs(left[i] - right[i]);
  assert.ok(difference > 10, 'The instrumental bed should have stereo space');
});
