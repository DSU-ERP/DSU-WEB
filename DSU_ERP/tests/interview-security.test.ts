import test from 'node:test';
import assert from 'node:assert/strict';
import { interviewSecurityIssues, restrictedInterviewKey, type SecuritySnapshot } from '../src/features/student/lib/interview-security';
const ready: SecuritySnapshot = { fullscreen:true,visible:true,focused:true,mediaReady:true,entireScreen:true,displayChecked:true,displayCount:1,extended:false,width:1536,height:864,pixelRatio:1.25,captureWidth:1920,captureHeight:1080,pictureInPicture:false };
test('interview security fails closed for missing permissions and display checks',()=>{
  assert.deepEqual(interviewSecurityIssues(ready),[]);
  for(const [key,kind] of [['fullscreen','fullscreen-exit'],['visible','tab-hidden'],['focused','focus-lost'],['mediaReady','media-stopped'],['entireScreen','screen-stopped'],['displayChecked','display-check']] as const)
    assert.ok(interviewSecurityIssues({...ready,[key]:false}).some(i=>i.kind===kind));
  assert.ok(interviewSecurityIssues({...ready,displayCount:2}).some(i=>i.kind==='extended-display'));
  assert.ok(interviewSecurityIssues({...ready,extended:true}).some(i=>i.kind==='extended-display'));
});
test('screen coverage detects reduced windows while preserving zoom and small full displays',()=>{
  assert.deepEqual(interviewSecurityIssues({...ready,width:1228.8,height:691.2,pixelRatio:1.5625}),[],'browser zoom uses physical coverage');
  assert.ok(interviewSecurityIssues({...ready,width:768}).some(i=>i.kind==='restricted-window'));
  assert.deepEqual(interviewSecurityIssues({...ready,width:800,height:600,pixelRatio:1,captureWidth:800,captureHeight:600}),[]);
  assert.ok(interviewSecurityIssues({...ready,pictureInPicture:true}).some(i=>i.kind==='picture-in-picture'));
});
test('restricted shortcuts preserve typing, answer submission and accessible escape',()=>{
  const event={key:'',ctrlKey:false,metaKey:false,altKey:false,shiftKey:false};
  for(const key of ['c','v','x'])assert.equal(restrictedInterviewKey({...event,key,ctrlKey:true}),'clipboard');
  for(const key of ['t','n','w','r','l','Tab'])assert.equal(restrictedInterviewKey({...event,key,metaKey:true}),'navigation-attempt');
  assert.equal(restrictedInterviewKey({...event,key:'Enter',ctrlKey:true}),null);
  assert.equal(restrictedInterviewKey({...event,key:'Enter',shiftKey:true}),null);
  assert.equal(restrictedInterviewKey({...event,key:'Escape'}),null);
});
