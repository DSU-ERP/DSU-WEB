import { ArrowUpRight, ArrowRight } from 'lucide-react';
export function FinalCTA() {
  return <section className="final-cta section-shell" aria-labelledby="final-cta-title"><p className="eyebrow"><span className="eyebrow-square"/>[ DSU AGENTIC ERP ]</p><h2 id="final-cta-title">The intelligent campus<br/>starts <span>here.</span></h2><div className="final-cta-bottom"><p>One unified platform. An institution of possibilities.</p><div className="scene-actions"><a href="#platform" className="button button-dark">Explore the platform <ArrowUpRight size={16}/></a><a href="#demo" className="text-link">Request a demo <ArrowRight size={16}/></a></div></div></section>;
}
