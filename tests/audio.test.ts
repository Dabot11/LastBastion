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
test('a crossbow release and its impact are brief and have distinct waveforms', () => {
  const shot = renderSound('crossbow'), impact = renderSound('impact-crossbow');
  assert.ok(shot.length / AUDIO_SAMPLE_RATE < .2 && impact.length / AUDIO_SAMPLE_RATE < .15);
  let dot = 0, left = 0, right = 0;
  for (let i = 0; i < impact.length; i++) { dot += shot[i] * impact[i]; left += shot[i] ** 2; right += impact[i] ** 2; }
  assert.ok(Math.abs(dot / Math.sqrt(left * right)) < .95);
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
