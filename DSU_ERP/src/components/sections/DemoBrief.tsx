'use client';
import { useState, type FormEvent } from 'react';
import { ArrowDownToLine, Check } from 'lucide-react';
import { CAPABILITIES } from '@/config/designTokens';
export function DemoBrief() {
  const [downloaded,setDownloaded] = useState(false);
  function prepareBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const interests = form.getAll('interest');
    const text = ['DSU AGENTIC ERP — DEMO REQUEST BRIEF', '', 'Institution: ' + form.get('institution'), 'Name: ' + form.get('name'), 'Work email: ' + form.get('email'), '', 'Areas of interest:', ...(interests.length ? interests.map(item=>'• '+item) : ['• Full platform overview']), '', 'What we would like to explore:', String(form.get('message') || 'A connected approach to university operations.'), '', 'Prepared locally. Share this brief with your DSU contact to arrange a conversation.'].join('\n');
    const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href=url; link.download='dsu-demo-brief.txt'; link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000); setDownloaded(true);
  }
  return <section id="demo" className="demo-section section-shell" aria-labelledby="demo-title"><div><p className="eyebrow">[ START A CONVERSATION ]</p><h2 id="demo-title">Your campus.<br/>Your possibilities.</h2><p className="demo-intro">Prepare a demo brief around the needs of your institution.</p><p className="demo-explanation">Download your brief and share it with your DSU contact to arrange a conversation. Your information stays in your browser; nothing is submitted.</p></div><form onSubmit={prepareBrief} className="demo-form"><div className="form-two"><label>Your name<input name="name" autoComplete="name" required maxLength={120} placeholder="Full name"/></label><label>Work email<input name="email" type="email" autoComplete="email" required maxLength={180} placeholder="you@university.edu"/></label></div><label>Institution<input name="institution" autoComplete="organization" required maxLength={180} placeholder="University or institution"/></label><fieldset><legend>What would you like to explore?</legend><div className="interest-options">{CAPABILITIES.map(item=><label key={item.name}><input type="checkbox" name="interest" value={item.name}/><span>{item.name}</span></label>)}</div></fieldset><label>Anything else? <span className="optional">(optional)</span><textarea name="message" rows={2} maxLength={2000} placeholder="Tell us what a connected campus means to you."/></label><button className="button button-dark" type="submit">Download demo brief <ArrowDownToLine size={16}/></button><p className="form-feedback" role="status">{downloaded && <><Check size={15}/> Your brief is ready. Share it with your DSU contact.</>}</p></form></section>;
}
