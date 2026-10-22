let worker: Worker | null = null, sequence = 0;
let ready: Promise<void> | null = null;
const pending = new Map<number, { resolve: (text: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
function engine() {
  if (worker) return worker;
  worker = new Worker(new URL("./interview-stt.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return;
    clearTimeout(request.timer); pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(data.text || "");
  };
  worker.onerror = () => resetEngine("Local speech stopped unexpectedly. Prepare it again to retry.");
  return worker;
}
function resetEngine(message: string) {
  worker?.terminate(); worker = null; ready = null;
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error(message)); }
  pending.clear();
}
function request(audio?: Float32Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => resetEngine("Local speech took too long. Retry with a shorter recording."), 120000);
    pending.set(id, { resolve, reject, timer });
    try { engine().postMessage({ id, audio }, audio ? [audio.buffer] : []); }
    catch { clearTimeout(timer); pending.delete(id); reject(new Error("This browser could not start local speech.")); }
  });
}
export function prepareInterviewSpeech() {
  if (!ready) ready = request().then(() => {}).catch((error) => { ready = null; throw error; });
  return ready;
}
// Serialize inference; a single model instance stays off the UI thread.
let inference = Promise.resolve("");
export async function transcribeInterviewAudio(audio: Float32Array) {
  await prepareInterviewSpeech();
  const next = inference.catch(() => "").then(() => request(audio));
  inference = next;
  return next;
}
