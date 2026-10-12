import { ILLUSTRATION_CHAPTERS, SYSTEM_MERGE, JOURNEY_SCROLL_FACTOR, narrativeToScroll, scrollToNarrative, illustrationChapterAt, illustrationFrame, fitDrawing } from '../src/config/illustrationChapters';
import { getHeroFraming, HERO_MOTION } from '../src/config/heroFraming';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { inspectAssets } from '../src/lib/animation/assetValidation';
import { ARCHITECTURAL_LAYERS } from '../src/config/architecturalLayers';
import { PHASES, sceneAtProgress } from '../src/config/animationPhases';
import { fitReference, translatedAnchor } from '../src/lib/animation/coordinateSystem';
async function fixture() {
  const root = path.join(process.cwd(), '.qa', 'fixtures');
  await mkdir(root, { recursive: true });
  const publicRoot = await mkdtemp(path.join(root, 'assets-'));
  const directory = path.join(publicRoot, 'assets', 'college');
  await mkdir(directory, { recursive: true });
  return { publicRoot, directory };
}
test('phase boundaries form one continuous normalized timeline', () => {
  const phases = Object.values(PHASES);
  assert.equal(phases[0].start, 0);
  assert.equal(phases.at(-1)?.end, 1);
  phases.slice(1).forEach((phase,i)=>assert.equal(phase.start,phases[i].end));
  assert.equal(sceneAtProgress(-1),0); assert.equal(sceneAtProgress(.42),2); assert.equal(sceneAtProgress(3),5);
});
test('all layer motion completes inside the separation and reassembly phases',()=>{
  ARCHITECTURAL_LAYERS.forEach(layer=>{
    assert.ok(layer.explosion.start >= PHASES.separation.start);
    assert.ok(layer.explosion.start+layer.explosion.duration <= PHASES.separation.end);
    assert.ok(layer.reassembly.start >= PHASES.reassembly.start);
    assert.ok(layer.reassembly.start+layer.reassembly.duration <= PHASES.reassembly.end+1e-8);
    assert.equal(layer.exploded.x,layer.assembled.x);
  });
});
test('coordinate scaling preserves aspect ratio and matching anchors',()=>{
  assert.deepEqual(fitReference(500,800),{scale:.5,x:0,y:200});
  assert.deepEqual(translatedAnchor({x:300,y:400},{x:0,y:-200},.66),{x:300,y:268});
});
test('no files selects an explicit placeholder without fabricated architecture',async()=>{
  const {publicRoot}=await fixture(); const result=await inspectAssets(publicRoot);
  assert.equal(result.mode,'placeholder'); assert.equal(result.illustration,null); assert.deepEqual(result.layers,[]);
});
test('a flat illustration is preserved without enabling independent layers',async()=>{
  const {publicRoot,directory}=await fixture();
  await sharp({create:{width:90,height:160,channels:3,background:'#fafaf8'}}).png().toFile(path.join(directory,'exploded-reference.png'));
  const result=await inspectAssets(publicRoot);
  assert.equal(result.mode,'illustration'); assert.equal(result.width,90); assert.equal(result.height,160); assert.equal(result.illustrationKind,'exploded'); assert.deepEqual(result.layers,[]);
});
test('unreviewed manifests and invalid image files fail safely',async()=>{
  const {publicRoot,directory}=await fixture();
  await writeFile(path.join(directory,'exploded-reference.png'),'not a PNG');
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify({registrationReviewed:false}));
  const result=await inspectAssets(publicRoot); assert.equal(result.mode,'placeholder'); assert.ok(result.issues.length>=2);
});

test('new landscape artwork takes priority and rejects derivatives from the previous drawing', async () => {
  const { publicRoot, directory } = await fixture();
  await sharp({ create: { width: 941, height: 1672, channels: 3, background: '#fafaf8' } }).png().toFile(path.join(directory, 'exploded-reference.png'));
  await sharp({ create: { width: 1672, height: 941, channels: 3, background: '#fafaf8' } }).png().toFile(path.join(directory, 'grand-exploded-reference.png'));
  for (const scale of [2, 4]) {
    await sharp({ create: { width: 941 * scale, height: 1672 * scale, channels: 3, background: '#fafaf8' } }).webp().toFile(path.join(directory, `grand-exploded-reference-${scale}x.webp`));
  }
  const result = await inspectAssets(publicRoot);
  assert.equal(result.mode, 'illustration');
  assert.equal(result.illustration, '/assets/college/grand-exploded-reference.png');
  assert.equal(result.width, 1672);
  assert.equal(result.height, 941);
  assert.equal(result.enhancedIllustration, undefined);
  assert.ok(result.issues.some(issue => issue.includes('Enhanced illustration is invalid')));
});
test('reviewed, registered, transparent assets enable full mode; opaque layers disable it',async()=>{
  const {publicRoot,directory}=await fixture();
  await sharp({create:{width:1000,height:800,channels:4,background:{r:255,g:255,b:255,alpha:0}}}).composite([{input:Buffer.from('<svg width="1000" height="800"><rect x="300" y="300" width="400" height="200" fill="black"/></svg>')}]).png().toFile(path.join(directory,'assembled.png'));
  const layers=ARCHITECTURAL_LAYERS.map(layer=>({id:layer.id,file:layer.id+'.png',explodedY:layer.exploded.y,anchors:[{id:'left',x:300,y:400},{id:'right',x:700,y:400}]}));
  for(const layer of layers) await copyFile(path.join(directory,'assembled.png'),path.join(directory,layer.file));
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify({registrationReviewed:true,referenceWidth:1000,referenceHeight:800,assembled:'assembled.png',layers}));
  assert.equal((await inspectAssets(publicRoot)).mode,'layered');
  await sharp({create:{width:1000,height:800,channels:4,background:'#ffffff'}}).png().toFile(path.join(directory,'roof.png'));
  const invalid=await inspectAssets(publicRoot); assert.equal(invalid.mode,'illustration'); assert.ok(invalid.issues.some(issue=>issue.includes('transparent pixels')));
});

test('the architectural hero expands substantially before the intelligence scene',()=>{
  const desktop = getHeroFraming(900,1974,false,true);
  const mobile = getHeroFraming(844,534,true,true);
  assert.ok(desktop.expanded.scale / desktop.opening.scale > 1.8);
  assert.ok(mobile.expanded.scale / mobile.opening.scale > 1.3);
  assert.ok(HERO_MOTION.expansionStart < .03);
  assert.ok(HERO_MOTION.expansionEnd < PHASES.intelligence.start);
});
test('the portrait camera travels down the drawing without reversing on short artwork',()=>{
  for(const [height,artwork,mobile] of [[900,1974,false],[844,534,true],[740,438,true]] as const){
    const frame=getHeroFraming(height,artwork,mobile,true);
    assert.ok(frame.middle.y <= frame.expanded.y);
    assert.ok(frame.foundation.y <= frame.middle.y);
    assert.ok(frame.foundation.y + artwork * frame.foundation.scale <= height * .9);
    assert.ok(frame.closing.scale < frame.expanded.scale);
  }
});

test('every architectural chapter has a settled reading interval before the next transition', () => {
  ILLUSTRATION_CHAPTERS.forEach((chapter, index) => {
    assert.ok(chapter.start <= chapter.settled);
    assert.ok(chapter.settled < chapter.leave);
    if (index > 0) assert.ok(ILLUSTRATION_CHAPTERS[index - 1].leave < chapter.start);
    assert.equal(illustrationChapterAt(chapter.settled), index);
  });
  assert.equal(illustrationChapterAt(-1), 0);
  assert.equal(illustrationChapterAt(1), 6);
  assert.deepEqual(ILLUSTRATION_CHAPTERS.map(chapter => chapter.view), ['exterior', 'facade', 'upper', 'lower', 'foundation', 'roof', 'exterior']);
});
test('merge scroll duration doubles while surrounding chapters keep their pacing', () => {
  const distance = (from: number, to: number) => (narrativeToScroll(to) - narrativeToScroll(from)) * JOURNEY_SCROLL_FACTOR;
  const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9);
  close(distance(0, SYSTEM_MERGE.start), SYSTEM_MERGE.start);
  close(distance(SYSTEM_MERGE.converge, SYSTEM_MERGE.unified), 2 * (SYSTEM_MERGE.unified - SYSTEM_MERGE.converge));
  close(distance(SYSTEM_MERGE.start, SYSTEM_MERGE.end), 2 * (SYSTEM_MERGE.end - SYSTEM_MERGE.start));
  close(distance(SYSTEM_MERGE.end, 1), 1 - SYSTEM_MERGE.end);
  for (const progress of [0, .23, .71, ...Object.values(SYSTEM_MERGE), .97, 1]) {
    close(scrollToNarrative(narrativeToScroll(progress)), progress);
  }
  close(narrativeToScroll(1), 1);
});

test('every source frame fits its responsive reading area without distortion or clipping', () => {
  for (const target of [{x:43,y:240,width:1354,height:460},{x:10,y:235,width:370,height:310},{x:10,y:255,width:300,height:250}]) {
    for (const chapter of ILLUSTRATION_CHAPTERS) {
      const source = illustrationFrame(chapter.view);
      const camera = fitDrawing(source, target);
      const left = camera.x + source.x * camera.scale;
      const top = camera.y + source.y * camera.scale;
      assert.ok(left >= target.x - 1e-6 && top >= target.y - 1e-6);
      assert.ok(left + source.width * camera.scale <= target.x + target.width + 1e-6);
      assert.ok(top + source.height * camera.scale <= target.y + target.height + 1e-6);
    }
  }
});
