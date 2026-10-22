"use client";
import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import type { SecurityIssue } from "../lib/interview-security";
export function InterviewSecurityPause({ issues, warnings, busy, error, onRestore, onDevices, onEnd }: {
  issues: SecurityIssue[]; warnings: number; busy: boolean; error: string;
  onRestore: () => void; onDevices: () => void; onEnd: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  return <dialog ref={dialog} className="im-security-dialog" aria-labelledby="im-security-title" onCancel={e => e.preventDefault()}>
    <ShieldCheck size={26} /><p className="im-security-eyebrow">INTERVIEW PAUSED</p><h2 id="im-security-title">Restore your secure workspace.</h2>
    <p>Your answer draft is kept. The original interview timer continues.</p>
    <ul>{issues.map(issue => <li key={issue.kind}>{issue.message}</li>)}</ul>
    <p className="im-security-count">{warnings}/3 recorded warnings · the third warning ends the interview.</p>
    {error && <p role="alert">{error}</p>}
    <div><button type="button" disabled={busy} onClick={onRestore}>{busy ? "Checking…" : "Restore & continue"}</button><button type="button" disabled={busy} onClick={onDevices}>Recheck devices & display</button><button type="button" disabled={busy} onClick={onEnd}>End interview & view report</button></div>
  </dialog>;
}
