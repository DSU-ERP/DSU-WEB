import test from "node:test";
import assert from "node:assert/strict";
import { combineAudio, resampleAudio, audioEnergy } from "../src/features/student/lib/interview-audio";
test("microphone resampling preserves duration, level and segment order", () => {
  const chunks = [new Float32Array(24000).fill(0.2), new Float32Array(24000).fill(-0.2)];
  const output = resampleAudio(combineAudio(chunks), 48000);
  assert.equal(output.length, 16000);
  assert.ok(Math.abs(output[0] - 0.2) < 0.001);
  assert.ok(Math.abs(output[15999] + 0.2) < 0.001);
  assert.ok(Math.abs(audioEnergy(output) - 0.2) < 0.001);
  assert.equal(audioEnergy(new Float32Array(16000)), 0);
});
