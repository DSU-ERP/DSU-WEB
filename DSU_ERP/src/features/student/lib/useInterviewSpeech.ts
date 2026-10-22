"use client";
import { useEffect, useRef, useState } from "react";
import { audioEnergy, combineAudio, resampleAudio } from "./interview-audio";
import { prepareInterviewSpeech, transcribeInterviewAudio } from "./interview-speech-engine";
import { joinSpeech, INTERVIEW_SILENCE_SUBMIT_MS } from "./speech-text";

export function useInterviewSpeech(onText: (text: string) => void, onSilence?: () => void) {
  const [available, setAvailable] = useState(false), [listening, setListening] = useState(false),
    [loading, setLoading] = useState(false), [ready, setReady] = useState(false),
    [transcribing, setTranscribing] = useState(false), [requesting, setRequesting] = useState(false), [error, setError] = useState(""), [level, setLevel] = useState(0),
    [partial, setPartial] = useState(false), [silenceRemaining, setSilenceRemaining] = useState<number | null>(null);
  const live = useRef(true), generation = useRef(0), callback = useRef(onText), silenceCallback = useRef(onSilence),
    context = useRef<AudioContext | null>(null), stream = useRef<MediaStream | null>(null),
    processor = useRef<ScriptProcessorNode | null>(null), source = useRef<MediaStreamAudioSourceNode | null>(null),
    frames = useRef<Float32Array[]>([]), preroll = useRef<Float32Array[]>([]),
    sampleCount = useRef(0), voicedSamples = useRef(0), lastVoice = useRef(0), rate = useRef(48000),
    active = useRef(false), starting = useRef(false), transcript = useRef(""), queued = useRef(0),
    work = useRef<Promise<void>>(Promise.resolve()), silenceTimer = useRef<ReturnType<typeof setInterval> | null>(null),
    segment = useRef(0), previewing = useRef(false), previewAt = useRef(0), turnDelivered = useRef(false);
  callback.current = onText; silenceCallback.current = onSilence;
  const clearSilence = () => { if (silenceTimer.current) clearInterval(silenceTimer.current); silenceTimer.current = null; };
  const release = () => {
    active.current = false;
    clearSilence();
    if (processor.current) processor.current.onaudioprocess = null;
    processor.current?.disconnect(); source.current?.disconnect();
    stream.current?.getTracks().forEach((track) => track.stop());
    void context.current?.close().catch(() => {});
    processor.current = null; source.current = null; stream.current = null; context.current = null;
    if (live.current) { setListening(false); setLevel(0); setSilenceRemaining(null); }
  };
  const cancel = () => {
    generation.current++; clearSilence(); release(); frames.current = []; preroll.current = [];
    sampleCount.current = 0; voicedSamples.current = 0;
    segment.current++; turnDelivered.current = false;
    if (live.current) { setTranscribing(false); setPartial(false); }
  };
  useEffect(() => {
    live.current = true;
    setAvailable(!!navigator.mediaDevices?.getUserMedia && typeof Worker !== "undefined" && typeof AudioContext !== "undefined");
    return () => { live.current = false; cancel(); };
  }, []);
  const prepare = async () => {
    if (live.current) { setLoading(true); setError(""); }
    try { await prepareInterviewSpeech(); if (live.current) setReady(true); return true; }
    catch (e) { if (live.current) setError((e as Error).message); return false; }
    finally { if (live.current) setLoading(false); }
  };
  const clean = (value: string) => value.replace(/\[(?:blank_audio|silence|music)\]/gi, "").trim();
  // One replaceable preview per segment. A later final result replaces it;
  // previews never get appended to the saved answer or accumulate in a queue.
  const preview = () => {
    if (previewing.current || queued.current || voicedSamples.current / rate.current < 0.45) return;
    const audio = resampleAudio(combineAudio(frames.current), rate.current), token = generation.current, part = segment.current;
    previewing.current = true; previewAt.current = Date.now();
    work.current = work.current.catch(() => {}).then(async () => {
      if (token !== generation.current) return;
      const result = clean(await transcribeInterviewAudio(audio));
      if (!live.current || token !== generation.current || part !== segment.current || !result) return;
      setPartial(true); callback.current(joinSpeech(transcript.current, result).slice(0, 12000));
    }).catch((e) => {
      if (live.current && token === generation.current) { setError((e as Error).message); release(); }
    }).finally(() => { previewing.current = false; });
  };
  const flush = () => {
    const chunks = frames.current, voiced = voicedSamples.current, capturedRate = rate.current;
    if (!chunks.length || voiced / capturedRate < 0.25) return;
    if (queued.current >= 3) {
      release(); setError("Local transcription is catching up. Wait for the text, then record the rest of your answer."); return;
    }
    frames.current = []; sampleCount.current = 0; voicedSamples.current = 0; segment.current++;
    const audio = resampleAudio(combineAudio(chunks), capturedRate), token = generation.current;
    queued.current++; setTranscribing(true);
    work.current = work.current.catch(() => {}).then(async () => {
      if (token !== generation.current) return;
      const result = await transcribeInterviewAudio(audio);
      if (!live.current || token !== generation.current) return;
      const text = clean(result);
      if (text) {
        transcript.current = joinSpeech(transcript.current, text).slice(0, 12000);
        setPartial(false); callback.current(transcript.current);
      }
    }).catch((e) => {
      if (live.current && token === generation.current) { setError((e as Error).message); release(); }
    }).finally(() => {
      queued.current--;
      if (!live.current || token !== generation.current) return;
      setTranscribing(queued.current > 0);
    });
  };
  const stop = async () => {
    if (starting.current && !active.current) generation.current++;
    clearSilence(); flush(); release(); await work.current;
    // Drain a segment retained under backpressure before the caller saves text.
    flush(); await work.current;
  };
  const startWith = async (seed = "") => {
    if (starting.current || active.current) return;
    starting.current = true; cancel(); const token = generation.current;
    setError(""); transcript.current = seed.trim();
    try {
      if (!await prepare() || token !== generation.current || !live.current) return;
      setRequesting(true);
      const granted = await new Promise<MediaStream>((resolve, reject) => {
        let waiting = true;
        const deadline = setTimeout(() => { waiting = false; reject(new Error("MIC_PERMISSION_PENDING")); }, 20000);
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }).then((media) => {
          clearTimeout(deadline);
          if (!waiting) { media.getTracks().forEach((track) => track.stop()); return; }
          waiting = false; resolve(media);
        }, (error) => { clearTimeout(deadline); if (waiting) { waiting = false; reject(error); } });
      });
      if (!live.current || token !== generation.current) { granted.getTracks().forEach((track) => track.stop()); return; }
      stream.current = granted;
      const audio = new AudioContext(); context.current = audio; await audio.resume(); rate.current = audio.sampleRate;
      const input = audio.createMediaStreamSource(granted), capture = audio.createScriptProcessor(4096, 1, 1), mute = audio.createGain();
      source.current = input; processor.current = capture; mute.gain.value = 0;
      input.connect(capture); capture.connect(mute); mute.connect(audio.destination);
      active.current = true; setListening(true);
      lastVoice.current = 0; previewAt.current = 0; turnDelivered.current = false;
      silenceTimer.current = setInterval(() => {
        if (!active.current || !lastVoice.current) return;
        const elapsed = Date.now() - lastVoice.current;
        setSilenceRemaining(elapsed > 600 ? Math.max(0, Math.ceil((INTERVIEW_SILENCE_SUBMIT_MS - elapsed) / 1000)) : null);
        if (elapsed < INTERVIEW_SILENCE_SUBMIT_MS || turnDelivered.current || queued.current || previewing.current || frames.current.length || !transcript.current.trim()) return;
        turnDelivered.current = true;
        silenceCallback.current?.();
      }, 100);
      capture.onaudioprocess = (event) => {
        if (!active.current) return;
        const chunk = event.inputBuffer.getChannelData(0).slice(), energy = audioEnergy(chunk);
        setLevel(Math.min(1, energy * 10));
        if (energy > 0.008) {
          lastVoice.current = Date.now(); turnDelivered.current = false; voicedSamples.current += chunk.length;
          if (!frames.current.length) frames.current.push(...preroll.current);
        }
        if (frames.current.length || energy > 0.008) {
          frames.current.push(chunk); sampleCount.current += chunk.length;
          // Short final segments plus rolling previews show words during a
          // continuous answer, rather than waiting for the recording to stop.
          if (sampleCount.current / rate.current >= 8 || Date.now() - lastVoice.current > 850) flush();
          else if (sampleCount.current / rate.current >= 1.3 && Date.now() - previewAt.current >= 1300) preview();
        }
        preroll.current = [...preroll.current.slice(-2), chunk];
      };
    } catch (e) {
      release();
      const code = (e as Error).name;
      if (live.current) setError((e as Error).message === "MIC_PERMISSION_PENDING" ? "Microphone permission is still pending. Allow microphone access in your browser or preview settings, then retry. If this preview cannot grant access, open this site in a browser with microphone support." : code === "NotAllowedError" ? "Microphone access was declined. Allow this site's microphone, then try Record answer again." : code === "NotFoundError" ? "No microphone was found. Connect one or type your answer." : "The microphone could not start. Close other recording apps and retry.");
    } finally { starting.current = false; if (live.current) setRequesting(false); }
  };
  const transcribeFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) { setError("Choose a recording under 15 MB."); return; }
    cancel(); const token = generation.current; setError(""); setTranscribing(true);
    let audioContext: AudioContext | null = null;
    try {
      if (!await prepare()) return;
      audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(await file.arrayBuffer());
      if (decoded.duration > 30) throw Error("Use a recording of 30 seconds or less for this microphone check.");
      const mono = new Float32Array(decoded.length);
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const values = decoded.getChannelData(channel);
        for (let index = 0; index < mono.length; index++) mono[index] += values[index] / decoded.numberOfChannels;
      }
      if (audioEnergy(mono) < 0.003) throw Error("No audible speech was found. Check your microphone level and retry.");
      const result = await transcribeInterviewAudio(resampleAudio(mono, decoded.sampleRate));
      if (live.current && token === generation.current) callback.current(result.trim());
    } catch (e) { if (live.current && token === generation.current) setError((e as Error).message); }
    finally { void audioContext?.close(); if (live.current && token === generation.current) setTranscribing(false); }
  };
  return { available, ready, listening, loading, requesting, transcribing, partial, silenceRemaining, level, error, prepare, startWith, start: () => startWith(), stop, cancel, transcribeFile };
}
