import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

// Every model/runtime request stays on this origin. No microphone audio or
// transcript is sent to a recognition service, including on a failed load.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/interview-speech/models/";
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.proxy = false;
env.backends.onnx.wasm!.wasmPaths = {
  mjs: "/interview-speech/runtime/ort-wasm-simd-threaded.asyncify.mjs",
  wasm: "/interview-speech/runtime/ort-wasm-simd-threaded.asyncify.wasm",
};
let loading: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
function prepare() {
  if (!loading) loading = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
    device: "wasm", dtype: "q8", local_files_only: true,
    progress_callback: (progress) => {
      if (progress.status === "progress") self.postMessage({ type: "progress", progress: progress.progress });
    },
  }).then(async (transcriber) => {
    // Compile/warm inference during preflight, before the microphone starts.
    // Otherwise the first live caption pays this cost while the user speaks.
    await transcriber(new Float32Array(16000), { max_new_tokens: 1, do_sample: false, return_timestamps: false });
    return transcriber;
  }).catch((error) => { loading = null; throw error; });
  return loading;
}
self.onmessage = async ({ data }: MessageEvent<{ id: number; audio?: Float32Array }>) => {
  try {
    const transcriber = await prepare();
    if (!data.audio) { self.postMessage({ id: data.id, ready: true }); return; }
    const maxTokens = Math.min(128, Math.max(24, Math.ceil(data.audio.length / 16000 * 6) + 12));
    const result = await transcriber(data.audio, { max_new_tokens: maxTokens, do_sample: false, return_timestamps: false });
    self.postMessage({ id: data.id, text: Array.isArray(result) ? result[0]?.text || "" : result.text });
  } catch {
    self.postMessage({ id: data.id, error: "Local speech could not load or process this audio. Recheck offline speech setup, then retry. Typing remains available in mock mode." });
  }
};
