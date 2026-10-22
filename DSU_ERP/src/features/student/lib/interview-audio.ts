export const SPEECH_SAMPLE_RATE = 16000;
export function resampleAudio(input: Float32Array, rate: number): Float32Array {
  if (rate === SPEECH_SAMPLE_RATE) return input.slice();
  const ratio = rate / SPEECH_SAMPLE_RATE;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index++) {
    const start = Math.floor(index * ratio), end = Math.min(input.length, Math.max(start + 1, Math.floor((index + 1) * ratio)));
    let total = 0;
    for (let sample = start; sample < end; sample++) total += input[sample];
    output[index] = total / (end - start);
  }
  return output;
}
export function combineAudio(chunks: readonly Float32Array[]): Float32Array {
  const output = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
export function audioEnergy(input: Float32Array) {
  let sum = 0;
  for (const sample of input) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, input.length));
}
