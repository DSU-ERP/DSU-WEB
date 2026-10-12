import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ILLUSTRATION_CHAPTERS, DETAIL_CHAPTER_INDICES, SYSTEM_LAYERS, SYSTEM_MERGE, ROOF_PARTS, JOURNEY_SCROLL_FACTOR, narrativeToScroll, scrollToNarrative, fitDrawing, illustrationChapterAt, illustrationFrame, mergeCameraMatrix } from '@/config/illustrationChapters';
/** One master timeline for the detail tour and the final source-image convergence. */
export function createIllustrationTimeline(root: HTMLElement) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  try {
  media.add('(prefers-reduced-motion: no-preference) and (min-height: 621px)', () => {
    const stage = root.querySelector<HTMLElement>('[data-journey-stage]')!;
    const canvas = root.querySelector<SVGSVGElement>('[data-journey-canvas]')!;
    const camera = root.querySelector<SVGGElement>('[data-reference-camera]')!;
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-journey-chapter]'));
    const pieces = Array.from(root.querySelectorAll<SVGGElement>('[data-drawing-detail]'));
    const merge = root.querySelector<HTMLElement>('[data-system-merge]')!;
    const mergeCanvas = merge.querySelector<SVGSVGElement>('.merge-diagram')!;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.journey-navigation [data-chapter-link]'));
    root.classList.add('journey-enhanced');
    const sizeCanvas = () => {
      canvas.setAttribute('viewBox', '0 0 ' + stage.clientWidth + ' ' + stage.clientHeight);
      mergeCanvas.setAttribute('viewBox', '0 0 ' + mergeCanvas.clientWidth + ' ' + mergeCanvas.clientHeight);
    };
    sizeCanvas();
    const mergeMatrix = (state: 'exploded' | 'connected') => mergeCameraMatrix(state, {
      x: 8, y: 8, width: Math.max(1, mergeCanvas.clientWidth - 16), height: Math.max(1, mergeCanvas.clientHeight - 16),
    });
    const readingArea = (index: number) => {
      const panel = panels[index];
      const heading = panel.querySelector<HTMLElement>('[data-chapter-heading]')!;
      const details = panel.querySelector<HTMLElement>('[data-chapter-details]')!;
      const width = root.clientWidth;
      const height = stage.clientHeight;
      const mobile = width < 768;
      const top = heading.offsetTop + heading.offsetHeight + (mobile ? 22 : 28);
      const bottom = Math.max(top + 90, details.offsetTop - (mobile ? 22 : 24));
      const targetWidth = Math.min(width * (mobile ? .98 : .94), 1800);
      const targetX = (width - targetWidth) / 2;
      return { x: targetX, y: top, width: targetWidth, height: Math.min(bottom, height - 82) - top };
    };
    const frame = (index: number) => {
      const source = illustrationFrame(ILLUSTRATION_CHAPTERS[index].view);
      const target = readingArea(index);
      if (index === 0 || index === ILLUSTRATION_CHAPTERS.length - 1) return fitDrawing(source, target);
      // All five details retain the same magnification and horizontal center.
      const scale = Math.min(...DETAIL_CHAPTER_INDICES.map(i => fitDrawing(illustrationFrame(ILLUSTRATION_CHAPTERS[i].view), readingArea(i)).scale));
      return { scale, x: target.x + target.width / 2 - (source.x + source.width / 2) * scale,
        y: target.y + target.height / 2 - (source.y + source.height / 2) * scale };
    };
    let previous = '';
    const accessibility = (progress: number) => {
      const active = illustrationChapterAt(progress);
      const merging = progress >= SYSTEM_MERGE.visible && progress < ILLUSTRATION_CHAPTERS.at(-1)!.start;
      const state = active + ':' + merging;
      if (state === previous) return;
      previous = state;
      root.dataset.activeChapter = String(active);
      panels.forEach((panel, index) => { panel.inert = merging || index !== active; panel.setAttribute('aria-hidden', String(merging || index !== active)); });
      merge.setAttribute('aria-hidden', String(!merging));
      links.forEach((link, index) => index === active ? link.setAttribute('aria-current', 'step') : link.removeAttribute('aria-current'));
    };
    const timeline = gsap.timeline({ defaults: { ease: 'none' }, onUpdate() { accessibility(scrollToNarrative(this.progress())); }, scrollTrigger: {
      id: 'dsu-illustration', trigger: root, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * (window.innerWidth < 768 ? 6.6 : 7.2) * JOURNEY_SCROLL_FACTOR),
      pin: stage, scrub: .65, anticipatePin: 1, invalidateOnRefresh: true,
      onRefreshInit: sizeCanvas, onRefresh: sizeCanvas,
    }});
    timeline.to({ value: 0 }, { value: 1, duration: 1 }, 0);
    gsap.set(panels, { autoAlpha: 0, y: 14 });
    gsap.set(panels[0], { autoAlpha: 1, y: 0 });
    gsap.set(merge, { autoAlpha: 0 });
    const matrix = (index: number) => { const value = frame(index); return 'matrix(' + [value.scale, 0, 0, value.scale, value.x, value.y].join(',') + ')'; };
    timeline.set(camera, { attr: { transform: () => matrix(0) } }, 0);
    ILLUSTRATION_CHAPTERS.forEach((chapter, index) => {
      if (index === 0) return;
      const previousChapter = ILLUSTRATION_CHAPTERS[index - 1];
      const closing = index === ILLUSTRATION_CHAPTERS.length - 1;
      const duration = chapter.settled - previousChapter.leave;
      timeline.to(panels[index - 1], { autoAlpha: 0, y: -20, duration: closing ? .022 : .035 }, closing ? SYSTEM_MERGE.start : chapter.start - .035);
      timeline.to(panels[index], { autoAlpha: 1, y: 0, duration: .04 }, chapter.start);
      timeline.fromTo(camera,
        { attr: { transform: () => matrix(index - 1) } },
        { attr: { transform: () => matrix(index) }, duration: closing ? .015 : duration, ease: 'power2.inOut', immediateRender: false }, closing ? SYSTEM_MERGE.unified : previousChapter.leave);
      pieces.forEach(piece => {
        // Only the outgoing and incoming detail can be visible during a transition.
        // The complete exploded overview is never rendered, even between chapters.
        const visible = piece.dataset.drawingDetail === chapter.view;
        if (closing) timeline.set(piece, { opacity: visible ? 1 : 0 }, SYSTEM_MERGE.unified);
        else timeline.to(piece, { opacity: visible ? 1 : 0, duration: .065 }, previousChapter.leave + .012);
      });
    });
    // The same five masked source views converge as a 2D image composition.
    // Source proportions stay fixed; all zoom is on one shared parent camera.
    timeline.to(canvas, { opacity: 0, duration: .025 }, SYSTEM_MERGE.start);
    timeline.to(merge, { autoAlpha: 1, duration: .025 }, SYSTEM_MERGE.visible);
    const mergeCamera = merge.querySelector('[data-merge-camera]');
    timeline.set(mergeCamera, { attr: { transform: () => mergeMatrix('exploded') } }, 0);
    timeline.fromTo(mergeCamera, { attr: { transform: () => mergeMatrix('exploded') } }, { attr: { transform: () => mergeMatrix('connected') }, duration: SYSTEM_MERGE.unified - SYSTEM_MERGE.converge, ease: 'power2.inOut', immediateRender: false }, SYSTEM_MERGE.converge);
    SYSTEM_LAYERS.forEach(layer => {
      const imageLayer = merge.querySelector('[data-merge-layer="' + layer.id + '"]');
      gsap.set(imageLayer, { attr: { transform: 'translate(0 0)' } });
      timeline.fromTo(imageLayer, { attr: { transform: 'translate(0 0)' } }, { attr: { transform: `translate(0 ${layer.assembledY})` }, duration: SYSTEM_MERGE.unified - SYSTEM_MERGE.converge - layer.delay, ease: 'power2.inOut', immediateRender: false }, SYSTEM_MERGE.converge + layer.delay);
    });
    ROOF_PARTS.forEach(part => {
      const element = merge.querySelector(`[data-merge-roof-part="${part.id}"]`);
      gsap.set(element, { attr: { transform: 'translate(0 0)' } });
      timeline.fromTo(element, { attr: { transform: 'translate(0 0)' } }, { attr: { transform: `translate(${part.x} ${part.y})` }, duration: .022, ease: 'power2.inOut', immediateRender: false }, SYSTEM_MERGE.unified - .022);
    });
    timeline.to(merge.querySelector('[data-merge-legend]'), { opacity: 0, duration: .028 }, SYSTEM_MERGE.converge + .022);
    const result = merge.querySelector('[data-merge-result]');
    gsap.set(result, { autoAlpha: 0 });
    timeline.to(result, { autoAlpha: 1, duration: .018 }, SYSTEM_MERGE.unified);
    timeline.to(merge, { autoAlpha: 0, duration: SYSTEM_MERGE.end - SYSTEM_MERGE.hold }, SYSTEM_MERGE.hold);
    timeline.to(canvas, { opacity: 1, duration: .035 }, ILLUSTRATION_CHAPTERS.at(-1)!.start);
    timeline.to(root.querySelector('.journey-masthead'), { autoAlpha: 0, duration: .04 }, .035);
    timeline.fromTo(root.querySelector('[data-journey-progress]'), { scaleX: 0 }, { scaleX: 1, duration: 1, transformOrigin: 'left' }, 0);
    // Retime the existing master, rather than adding a competing scroll timeline.
    // Earlier chapters keep their scroll distances; the merge receives 100% more.
    timeline.getChildren(false, true, false).forEach(tween => {
      const start = tween.startTime();
      const end = start + tween.duration();
      tween.duration(narrativeToScroll(end) - narrativeToScroll(start));
      tween.startTime(narrativeToScroll(start));
    });
    const destination = (index: number) => {
      const chapter = ILLUSTRATION_CHAPTERS[index];
      return narrativeToScroll(index === 0 ? 0 : Math.min(.99, chapter.settled + .02));
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('[data-chapter-link]');
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = Number(link.dataset.chapterLink);
      const trigger = timeline.scrollTrigger;
      if (!trigger || !ILLUSTRATION_CHAPTERS[index]) return;
      event.preventDefault();
      const progress = destination(index);
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'smooth' });
      history.replaceState(null, '', link.getAttribute('href')!);
    };
    const followHash = () => {
      // Preserve old links without restoring the removed combined overview.
      const hash = location.hash === '#exploded-view' ? '#first-layer' : location.hash;
      const index = ILLUSTRATION_CHAPTERS.findIndex(chapter => '#' + chapter.id === hash);
      const trigger = timeline.scrollTrigger;
      if (index < 0 || !trigger) return;
      const progress = destination(index);
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'instant' });
      timeline.progress(progress, false);
      ScrollTrigger.update(); accessibility(scrollToNarrative(progress));
    };
    let resizeTimer: ReturnType<typeof setTimeout>;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const resize = () => {
      if (window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 100) return;
      lastWidth = window.innerWidth; lastHeight = window.innerHeight;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 180);
    };
    window.addEventListener('resize', resize);
    root.addEventListener('click', navigate);
    window.addEventListener('hashchange', followHash);
    accessibility(0);
    const refreshFrame = requestAnimationFrame(() => { ScrollTrigger.refresh(); followHash(); });
    let disposed = false;
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true; cancelAnimationFrame(refreshFrame); clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
      root.removeEventListener('click', navigate); window.removeEventListener('hashchange', followHash);
      root.classList.remove('journey-enhanced'); delete root.dataset.activeChapter;
      merge.removeAttribute('aria-hidden');
      mergeCanvas.setAttribute('viewBox', '0 0 1000 1000');
      panels.forEach(panel => { panel.inert = false; panel.removeAttribute('aria-hidden'); });
    };
  }, root);
  } catch (error) {
    media.revert();
    root.classList.remove('journey-enhanced');
    root.querySelectorAll<HTMLElement>('[data-journey-chapter]').forEach(panel => { panel.inert = false; panel.removeAttribute('aria-hidden'); });
    throw error;
  }
  return () => media.revert();
}
