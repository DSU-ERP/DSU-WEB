import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { SCENES } from '@/config/animationPhases';
export function SceneTypography() {
  return <div className="scene-typography">{SCENES.map((scene,index)=>{
    const Heading = index === 0 ? 'h1' : 'h2';
    return <article className={'scene-copy scene-copy-' + index} data-scene-copy={index} id={'story-' + scene.id} key={scene.id} tabIndex={-1}>
      <p className="eyebrow"><span className="eyebrow-square"/>{scene.eyebrow}</p>
      <Heading>{scene.lines.map((line,lineIndex)=><span key={line} className={index===0 && lineIndex>0 ? 'intro-secondary' : ''}>{line}{index !== 0 && ' '}</span>)}</Heading>
      {index===5 && <p className="reveal-subheading">THE INTELLIGENT CAMPUS STARTS HERE.</p>}
      <p className="scene-description">{scene.description}</p>
      {index===0 && <div className="intro-rule"><span>BUILT AROUND THE INSTITUTION.</span><span>CONNECTED BY INTELLIGENCE.</span></div>}
      {index===3 && <div className="ecosystem-notes"><div><h3>[ AGENTIC INTELLIGENCE ]</h3><p>Intelligent coordination across institutional operations.</p></div><div><h3>[ CONNECTED ECOSYSTEM ]</h3><p>Information, people, and processes working together.</p></div></div>}
      {index===5 && <div className="scene-actions"><a className="button button-dark" href="#platform">Explore the platform <ArrowUpRight size={16}/></a><a className="text-link" href="#demo">Request a demo <ArrowRight size={16}/></a></div>}
      <span className="static-scene-number" aria-hidden="true">{scene.number} / 06</span>
    </article>;
  })}</div>;
}
