import { mkdir, stat, writeFile, rename, copyFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const revision = "79fb389fc764e7c395bd330e9531d9d32ada7049";
const target = resolve(root, "public/interview-speech");
const model = "Xenova/whisper-tiny.en";
const files = ["config.json", "generation_config.json", "preprocessor_config.json", "tokenizer_config.json", "tokenizer.json", "normalizer.json", "special_tokens_map.json", "added_tokens.json", "onnx/encoder_model_quantized.onnx", "onnx/decoder_model_merged_quantized.onnx"];
await mkdir(target, { recursive: true });
await Promise.all(files.map(async (name) => {
  const path = resolve(target, "models", model, name);
  if (await stat(path).then((s) => s.size > 0).catch(() => false)) return;
  console.log(`Preparing local interview speech: ${name}`);
  await mkdir(dirname(path), { recursive: true });
  const response = await fetch(`https://huggingface.co/${model}/resolve/${revision}/${name}`, { signal: AbortSignal.timeout(180000) });
  if (!response.ok || !response.body) throw Error(`Speech asset ${name}: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path + ".part"));
  await rename(path + ".part", path);
}));
await mkdir(resolve(target, "runtime"), { recursive: true });
for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"]) {
  const source = resolve(root, "node_modules/onnxruntime-web/dist", file);
  const destination = resolve(target, "runtime", file);
  // During local development the browser may still hold the generated runtime
  // open. Do not overwrite a file that is already the current dependency.
  const [sourceStat, destinationStat] = await Promise.all([
    stat(source),
    stat(destination).catch(() => null),
  ]);
  if (destinationStat?.size === sourceStat.size) continue;
  await copyFile(source, destination);
}
await writeFile(resolve(target, "ready.json"), JSON.stringify({ model, revision, license: "Apache-2.0", processing: "browser-local" }));
console.log("Offline interview speech is ready. Audio is processed in the browser; no transcription API is used.");
