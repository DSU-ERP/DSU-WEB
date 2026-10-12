import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOTION, PHASES, SCENES, sceneAtProgress } from '@/config/animationPhases';
import type { AssetInventory } from '@/config/architecturalLayers';
import { HERO_MOTION, getHeroFraming } from '@/config/heroFraming';
export function createScrollTimeline(root: HTMLElement, assets: AssetInventory) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  let initialHashHandled = false;
  try {
  media.add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)', motion: '(prefers-reduced-motion: no-preference) and (min-height: 621px)' }, context => {
    if (!context.conditions?.motion) return;
    const mobile = !!context.conditions.mobile;
    const copies = Array.from(root.querySelectorAll<HTMLElement>('[data-scene-copy]'));
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.scene-navigation [data-scene-link]'));
    const select = gsap.utils.selector(root);
    root.classList.add('is-enhanced');
    let previousScene = -1;
    const synchronizeAccessibility = (progress: number) => {
      const index = sceneAtProgress(progress);
      if (index === previousScene && root.dataset.activeScene === String(index)) return;
      previousScene = index;
      root.dataset.activeScene = String(index);
      copies.forEach((copy, i) => { copy.inert = i !== index; copy.setAttribute('aria-hidden', String(i !== index)); });
      links.forEach((link,i) => { if (i === index) link.setAttribute('aria-current','step'); else link.removeAttribute('aria-current'); });
    };
    const timeline = gsap.timeline({ defaults: { ease: 'none' }, onUpdate() { synchronizeAccessibility(this.progress()); }, scrollTrigger: {
      id: 'dsu-architecture', trigger: root, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * (mobile ? MOTION.mobileScrollScreens : MOTION.scrollScreens)),
      pin: root.querySelector<HTMLElement>('[data-scroll-stage]')!, scrub: MOTION.scrub, anticipatePin: 1, invalidateOnRefresh: true,
    }});
    // A one-second master is a normalized 0..1 coordinate system, not wall-clock animation.
    timeline.to({ progress: 0 }, { progress: 1, duration: 1 }, 0);
    gsap.set(copies, { autoAlpha: 0, y: 14 });
    gsap.set(copies[0], { autoAlpha: 1, y: 0 });
    copies.forEach((copy,index)=>{
      const start = SCENES[index].start;
      if (index > 0) timeline.to(copy, { autoAlpha: 1, y: 0, duration: MOTION.textFade }, start);
      if (index < copies.length - 1) timeline.to(copy, { autoAlpha: 0, y: index === 0 ? -65 : -18, duration: index === 0 ? .10 : MOTION.textFade }, index === 0 ? .02 : SCENES[index+1].start - MOTION.textFade);
    });
    const artwork = root.querySelector<HTMLElement>('[data-architecture-artwork]')!;
    const framing = () => {
      const captionBottom = Math.max(...copies.slice(1, 5).map(copy => copy.offsetTop + copy.offsetHeight + 20));
      return getHeroFraming(window.innerHeight, artwork.offsetHeight, mobile, assets.mode === 'illustration', captionBottom);
    };
    gsap.set(artwork, { xPercent: -50, transformOrigin: '50% 0%' });
    // The whole drawing grows into a full-width architectural close-up, then travels
    // through its original composition. Every pixel stays registered to its source.
    timeline.fromTo(artwork,
      { scale: () => framing().opening.scale, y: () => framing().opening.y },
      { scale: () => framing().expanded.scale, y: () => framing().expanded.y, duration: HERO_MOTION.expansionEnd - HERO_MOTION.expansionStart, ease: 'power2.inOut' },
      HERO_MOTION.expansionStart);
    timeline.to(artwork, { y: () => framing().middle.y, duration: HERO_MOTION.middle - HERO_MOTION.expansionEnd }, HERO_MOTION.expansionEnd);
    timeline.to(artwork, { y: () => framing().foundation.y, duration: HERO_MOTION.foundation - HERO_MOTION.middle }, HERO_MOTION.middle);
    timeline.to(artwork, { scale: () => framing().closing.scale, y: () => framing().closing.y, duration: HERO_MOTION.returnEnd - HERO_MOTION.returnStart, ease: 'power2.inOut' }, HERO_MOTION.returnStart);
    timeline.to(select('.stage-masthead, .architecture-figure figcaption, .diagram-note'), { autoAlpha: 0, duration: .07 }, .04);
    timeline.to(select('.architecture-figure figcaption'), { autoAlpha: 1, duration: .035 }, .965);
    timeline.fromTo(select('[data-scroll-progress]'), { scaleX: 0 }, { scaleX: 1, duration: 1, transformOrigin: 'left center' }, 0);
    if (assets.mode === 'layered') {
      const motionScale = mobile ? MOTION.mobileSeparation : 1;
      assets.layers.forEach(layer=>{
        const targets = select('[data-architecture-layer="'+layer.id+'"], [data-registration-layer="'+layer.id+'"]');
        gsap.set(targets, { x: layer.assembled.x, y: layer.assembled.y, scale: layer.scale, svgOrigin: layer.transformOrigin });
        timeline.to(targets, { x: layer.exploded.x * motionScale, y: layer.exploded.y * motionScale, duration: layer.explosion.duration, ease: 'power2.inOut' }, layer.explosion.start);
        timeline.to(targets, { x: layer.assembled.x, y: layer.assembled.y, duration: layer.reassembly.duration, ease: 'power2.inOut' }, layer.reassembly.start);
      });
      // Each endpoint uses exactly the timing and displacement of its corresponding layer.
      root.querySelectorAll<SVGLineElement>('[data-guide-upper]').forEach(line=>{
        const upper = assets.layers.find(layer=>layer.id === line.dataset.guideUpper)!;
        const lower = assets.layers.find(layer=>layer.id === line.dataset.guideLower)!;
        [upper,lower].forEach((layer,index)=>{
          const anchor = layer.anchors.find(point=>point.id === line.dataset.anchor)!;
          const attr = index === 0 ? 'y1' : 'y2';
          timeline.to(line, { attr: { [attr]: anchor.y + layer.exploded.y * motionScale }, duration: layer.explosion.duration, ease: 'power2.inOut' }, layer.explosion.start);
          timeline.to(line, { attr: { [attr]: anchor.y + layer.assembled.y }, duration: layer.reassembly.duration, ease: 'power2.inOut' }, layer.reassembly.start);
        });
      });
      timeline.fromTo(select('[data-technical-guides]'), { opacity: 0 }, { opacity: 1, duration: .08 }, .21);
      timeline.to(select('[data-technical-guides]'), { opacity: 0, duration: .06 }, .84);
    }
    const annotations = select('[data-annotation]');
    gsap.set(annotations, { autoAlpha: 0, y: 6 });
    gsap.set(select('[data-label-path], [data-draw-path]'), { strokeDasharray: 1, strokeDashoffset: 1 });
    annotations.forEach((annotation: Element,index: number)=>{
      const at = PHASES.intelligence.start + index * .018;
      timeline.to(annotation, { autoAlpha: 1, y: 0, duration: .025 }, at);
      timeline.to(annotation.querySelector('[data-label-path]'), { strokeDashoffset: 0, duration: .035 }, at);
      timeline.fromTo(annotation.querySelector('[data-node]'), { opacity: .45 }, { opacity: 1, duration: .02, repeat: 1, yoyo: true }, at + .025);
    });
    timeline.fromTo(select('[data-ecosystem-paths]'), { opacity: 0 }, { opacity: .65, duration: .025 }, PHASES.connections.start);
    timeline.to(select('[data-draw-path]'), { strokeDashoffset: 0, duration: .105, stagger: .01 }, PHASES.connections.start);
    timeline.to(select('[data-annotation], [data-ecosystem-paths]'), { autoAlpha: 0, duration: .025 }, PHASES.reassembly.start);
    const navigate = (event: MouseEvent) => {
      const target = (event.target as Element).closest<HTMLAnchorElement>('[data-scene-link]');
      if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = Number(target.dataset.sceneLink);
      const trigger = timeline.scrollTrigger;
      if (!trigger || !SCENES[index]) return;
      event.preventDefault();
      const progress = index === 0 ? 0 : SCENES[index].start + .035;
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'smooth' });
      history.replaceState(null, '', target.getAttribute('href')!);
    };
    const followHash = () => {
      const index = SCENES.findIndex(scene => '#story-' + scene.id === window.location.hash);
      const trigger = timeline.scrollTrigger;
      if (index < 0 || !trigger) return;
      const progress = index === 0 ? 0 : SCENES[index].start + .035;
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'instant' });
      timeline.progress(progress, false);
      ScrollTrigger.update();
      synchronizeAccessibility(progress);
    };
    root.addEventListener('click', navigate);
    window.addEventListener('hashchange', followHash);
    synchronizeAccessibility(timeline.progress());
    const refresh = () => ScrollTrigger.refresh();
    const frame = requestAnimationFrame(() => {
      refresh();
      if (!initialHashHandled) {
        initialHashHandled = true;
        followHash();
      }
    });
    let disposed = false;
    document.fonts.ready.then(()=>{ if (!disposed) refresh(); });
    return () => {
      disposed = true; cancelAnimationFrame(frame);
      root.removeEventListener('click', navigate);
      window.removeEventListener('hashchange', followHash);
      root.classList.remove('is-enhanced');
      copies.forEach(copy=>{copy.inert=false;copy.removeAttribute('aria-hidden');});
    };
  }, root);
  } catch (error) {
    media.revert();
    root.classList.remove('is-enhanced');
    root.querySelectorAll<HTMLElement>('[data-scene-copy]').forEach(copy => { copy.inert = false; copy.removeAttribute('aria-hidden'); });
    throw error;
  }
  return () => media.revert();
}
