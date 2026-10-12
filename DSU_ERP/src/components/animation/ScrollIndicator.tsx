import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { SCENES } from '@/config/animationPhases';
export function ScrollIndicator() {
  return <div className="stage-bottom"><a className="scroll-prompt" href="#story-separation" data-scene-link="1"><span className="scroll-icon"><ArrowDown size={17} strokeWidth={1.2}/></span><span>SCROLL TO EXPLORE</span></a><nav className="scene-navigation" aria-label="Architectural story chapters">{SCENES.map((scene,index)=><a key={scene.id} data-scene-link={index} href={'#story-'+scene.id} aria-label={scene.number + ' — ' + scene.label} aria-current={index===0 ? 'step' : undefined}><span className="scene-nav-number">{scene.number}</span><span className="scene-nav-title">{scene.label}</span><span className="scene-nav-line"/></a>)}</nav><a className="skip-story" href="#platform">Skip to platform <ArrowUpRight size={13}/></a></div>;
}
