import type { DrawingSource } from '@/config/illustrationChapters';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { IllustrationView } from '@/components/animation/IllustrationView';
export function ConnectedCampusSection({ src }: { src: DrawingSource }) {
  return <section id="connected-campus" className="journey-chapter connected-chapter" data-journey-chapter aria-labelledby="connected-title" tabIndex={-1}>
    <header className="chapter-heading" data-chapter-heading><p className="eyebrow"><span className="eyebrow-square"/>[ DSU AGENTIC ERP ]</p><h2 id="connected-title">Many systems.<br/>One university.</h2><p className="campus-subtitle">THE INTELLIGENT CAMPUS STARTS HERE.</p></header>
    <figure className="chapter-static-art"><IllustrationView src={src}/><figcaption>ONE CONNECTED INSTITUTION</figcaption></figure>
    <div className="connected-bottom" data-chapter-details><p>Twelve intelligent agents.<br/>One connected campus.</p><div className="scene-actions"><a className="button button-dark" href="#platform">Explore the platform <ArrowUpRight size={15}/></a><a className="text-link" href="#demo">Request a demo <ArrowRight size={15}/></a></div></div>
  </section>;
}
