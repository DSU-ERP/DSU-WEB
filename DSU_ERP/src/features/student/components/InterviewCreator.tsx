"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Pencil, BriefcaseBusiness, FileText, MessageSquare, Mic, Video, ShieldCheck, LoaderCircle } from "lucide-react";
import { studentFetch } from "../lib/client";
import type { InterviewConfig } from "../lib/interview-types";
import { DocumentUpload } from "./DocumentUpload";
import { ErrorNote } from "./UI";

const presets = [
  ["Technical", "Prepare me for a graduate software engineering role. Focus on my projects, debugging, technical reasoning and testing."],
  ["Behavioural", "Help me practise behavioural interview questions about teamwork, ownership, setbacks and learning from experience."],
  ["Screening call", "Prepare me for an initial graduate recruiter screening call, focusing on my introduction, motivation and role fit."],
  ["Case study", "Help me practise an entry-level business case interview. Focus on clear assumptions, problem solving and communicating a recommendation."],
];
export function InterviewCreator() {
  const router = useRouter();
  const [source, setSource] = useState<"ai" | "manual">("ai"), [goal, setGoal] = useState(""), [jd, setJd] = useState(""), [resume, setResume] = useState(""), [manual, setManual] = useState("");
  const [config, setConfig] = useState<InterviewConfig>({ durationMinutes: 20, language: "en-IN", tone: "friendly", depth: "moderate", questionCount: 6, preferredMode: "mock", channels: { text: true, voice: true, video: true } });
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [generationStage, setGenerationStage] = useState(0);
  const inFlight = useRef(false);
  const questions = manual.split("\n").map((value) => value.trim()).filter(Boolean);
  const channels = config.channels!;
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setGenerationStage((value) => Math.min(2, value + 1)), 5000); return () => clearInterval(timer); }, [busy]);
  const validate = () => {
    if (goal.trim().length < 10) return "Describe your interview goal in at least 10 characters.";
    if (source === "manual" && (questions.length < 3 || questions.length > 15 || questions.some((q) => q.length < 5 || q.length > 2000))) return "Add 3–15 questions, each between 5 and 2,000 characters.";
    if (!Number.isInteger(config.durationMinutes) || config.durationMinutes < 5 || config.durationMinutes > 60) return "Choose a duration between 5 and 60 minutes.";
    if (!Number.isInteger(config.questionCount) || config.questionCount < 3 || config.questionCount > 15) return "Choose 3–15 planned questions.";
    return "";
  };
  const generate = async () => {
    if (inFlight.current) return;
    const invalid = validate(); if (invalid) { setError(invalid); return; }
    inFlight.current = true; setBusy(true); setError(""); setGenerationStage(0);
    try {
      const created = await studentFetch<{ id: string }>("interviews", { method: "POST", body: { source, goal, jd, resume, config: { ...config, questionCount: source === "manual" ? questions.length : config.questionCount }, manualQuestions: source === "manual" ? questions : [] } });
      router.push(`/student/interview/${created.id}`);
    } catch (e) { setError((e as Error).message); inFlight.current = false; setBusy(false); }
  };
  const experience = (proctored: boolean) => setConfig((value) => ({ ...value, preferredMode: proctored ? "proctored" : "mock", channels: { text: !proctored, voice: true, video: true } }));
  return (
    <div className="iw-creator">
      <header className="iw-page-heading"><div><p className="iw-eyebrow">YOUR NEXT CONVERSATION STARTS HERE</p><h1>Create an interview</h1><p>Your goal, documents and preferences. Everything on one page.</p></div><Link className="iw-text-link" href="/student/interview?view=library">Interview library<ArrowRight size={15} /></Link></header>
      <div className="iw-create-columns">
        <form className="iw-create-form iw-single-setup" onSubmit={(e) => { e.preventDefault(); void generate(); }}>
          <fieldset className="iw-setup-fields" disabled={busy}>
          <section className="iw-setup-section" aria-labelledby="iw-goal-heading">
            <h2 id="iw-goal-heading">What would you like to practise?</h2><p>Academic subjects, projects, skills or placement preparation.</p>
            <div className="iw-source-tabs" role="group" aria-label="Interview source"><button type="button" aria-pressed={source === "ai"} onClick={() => setSource("ai")}><Sparkles size={16} />AI generator</button><button type="button" aria-pressed={source === "manual"} onClick={() => setSource("manual")}><Pencil size={16} />Manual questions</button></div>
            <label className="iw-field">Your interview goal<textarea value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={3000} rows={5} placeholder="e.g. Prepare me for a graduate analyst role, using examples from my internship and projects." required minLength={10} /></label>
            {source === "ai" ? <>
              <div className="iw-presets" aria-label="Interview goal ideas">{presets.map(([label, text]) => <button type="button" key={label} onClick={() => setGoal(text)}>{label}</button>)}</div>
              <details className="iw-document"><summary><BriefcaseBusiness size={17} /><span>Job description<small>Optional · tailor questions to the role</small></span><span>{jd.trim() ? "Added" : "Add"}</span></summary><DocumentUpload kind="jd" label="Upload the company JD" onReady={(doc) => setJd(doc.content)} /><label className="iw-field">Company JD and role context<textarea value={jd} onChange={(e) => setJd(e.target.value)} maxLength={20000} rows={5} placeholder="Or paste the job description here." /></label></details>
              <details className="iw-document"><summary><FileText size={17} /><span>Your resume<small>Optional · bring real experience into the conversation</small></span><span>{resume.trim() ? "Added" : "Add"}</span></summary><DocumentUpload kind="resume" label="Upload your resume" onReady={(doc) => setResume(doc.content)} /><label className="iw-field">Your resume evidence<textarea value={resume} onChange={(e) => setResume(e.target.value)} maxLength={60000} rows={5} placeholder="Or paste your resume text here." /></label></details>
            </> : <label className="iw-field">Questions · one per line, between 3 and 15<textarea value={manual} onChange={(e) => setManual(e.target.value)} rows={8} maxLength={30015} placeholder={"Tell me about yourself.\nDescribe a problem you solved.\nWhy are you interested in this role?"} /><small>{questions.length} questions added</small></label>}
          </section>
          <section className="iw-setup-section" aria-labelledby="iw-preferences-heading">
            <h2 id="iw-preferences-heading">Make it work for you.</h2><p>Choose the pace and how you want to take part.</p>
            <div className="iw-fields-grid">
              <label className="iw-field">Duration in minutes<input type="number" min={5} max={60} value={config.durationMinutes} onChange={(e) => setConfig({ ...config, durationMinutes: Number(e.target.value) })} required /></label>
              <label className="iw-field">Language<select value={config.language} onChange={(e) => setConfig({ ...config, language: e.target.value })}><option value="en-IN">English (India)</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option></select></label>
              <label className="iw-field">Interviewer tone<select value={config.tone} onChange={(e) => setConfig({ ...config, tone: e.target.value })}><option value="friendly">Friendly & constructive</option><option value="confident">Confident & direct</option><option value="strict">Strict & focused</option></select></label>
              <label className="iw-field">Follow-up depth<select value={config.depth} onChange={(e) => setConfig({ ...config, depth: e.target.value })}><option value="moderate">Moderate · up to 2</option><option value="deep">Deep · up to 4</option></select></label>
              {source === "ai" && <label className="iw-field">Planned questions<input type="number" min={3} max={15} value={config.questionCount} onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })} required /></label>}
            </div>
            <fieldset className="iw-mode-picker"><legend>Practice experience</legend>{[{ value: "mock", title: "Coached practice", note: "Required security checks, feedback and a practice retry." }, { value: "proctored", title: "Proctored AI", note: "Spoken answers, browser integrity checks, and feedback at the end." }].map((item) => <label key={item.value} data-selected={config.preferredMode === item.value}><input type="radio" name="experience" checked={config.preferredMode === item.value} onChange={() => experience(item.value === "proctored")} /><span><strong>{item.title}</strong><small>{item.note}</small></span></label>)}</fieldset>
            <fieldset className="iw-channels"><legend>Communication channels</legend>{[
              { key: "text" as const, title: "Text", note: config.preferredMode === "proctored" ? "Hidden during proctored sessions" : "Always available as a fallback in coached practice", Icon: MessageSquare },
              { key: "voice" as const, title: "Voice", note: "Offline transcription and four local speaking styles", Icon: Mic },
              { key: "video" as const, title: "Camera", note: "Required for security · no video recording or upload", Icon: Video },
            ].map(({ key, title, note, Icon }) => <label key={key}><Icon size={19} /><span><strong>{title}</strong><small>{note}</small></span><input type="checkbox" role="switch" aria-label={`${title} channel`} checked={key === "video" || channels[key]} disabled={key === "text" || key === "video" || config.preferredMode === "proctored"} onChange={(e) => setConfig({ ...config, channels: { ...channels, [key]: e.target.checked } })} /></label>)}</fieldset>
            {<div className="iw-secure-note"><ShieldCheck size={19} /><div><strong>Security required in both interview modes</strong><p>Camera, microphone, entire-screen sharing and fullscreen. One display and full-screen coverage are required. Tab changes, lost focus, clipboard actions and stopped sharing pause the interview. Three distinct warnings end the session. Coached practice includes feedback; proctored scores and coaching appear after completion.</p><small>You’ll review and grant permissions before starting. Browser checks do not verify identity or prove misconduct.</small></div></div>}
          </section>
          </fieldset>
          <ErrorNote message={error} />
          {busy && <div className="iw-generating" role="status" aria-live="polite"><LoaderCircle className="iw-spinner" size={20} /><div><strong>{source === "manual" ? "Saving your interview plan…" : ["Reading your goal and supplied context…", "Building your tailored interview plan…", "Waiting for your complete plan…"][generationStage]}</strong><p>This can take a moment. Your draft stays here if anything fails.</p></div></div>}
          <div className="iw-create-actions"><span className="iw-form-note">Next: instructions and agreement. Your timer starts when you begin the interview.</span><button type="submit" className="st-button" disabled={busy}>{busy ? "Preparing your interview…" : "Continue to instructions"}{!busy && <ArrowRight size={15} />}</button></div>
        </form>
        <aside className="iw-setup-summary"><span className="iw-companion-icon"><Sparkles size={24} strokeWidth={1.5} /></span><p className="iw-eyebrow">A CONVERSATION, BUILT FOR YOU</p><h2>Your interview at a glance.</h2><p>{goal.trim() || "Tell us what you’re learning or preparing for. We’ll build a focused practice conversation."}</p><dl>{[["Duration", `${config.durationMinutes} minutes`], ["Questions", source === "manual" ? questions.length : config.questionCount], ["Experience", config.preferredMode === "proctored" ? "Proctored AI" : "Coached practice"], ["Documents", [jd.trim() && "JD", resume.trim() && "Resume"].filter(Boolean).join(" + ") || "Optional"]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="iw-conversation-note"><Mic size={19} /><div><strong>Just speak. We’ll take turns.</strong><p>Live captions appear as you speak. A five-second pause sends your answer, then Maya continues the conversation.</p></div></div><small>Education and placement preparation only. Audio is transcribed on your device. Your results are practice guidance.</small></aside>
      </div>
    </div>
  );
}
