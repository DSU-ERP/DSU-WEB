import test from 'node:test';
import assert from 'node:assert/strict';
import {hasLiveInterviewMedia} from '../src/features/student/lib/media';

test('proctored readiness requires live video, microphone and shared-screen tracks',()=>{
  const stream=(video:MediaStreamTrackState[],audio:MediaStreamTrackState[])=>({getVideoTracks:()=>video.map(readyState=>({readyState,enabled:true,muted:false})),getAudioTracks:()=>audio.map(readyState=>({readyState,enabled:true,muted:false}))}) as unknown as MediaStream;
  const screen=stream(['live'],[]);
  assert.equal(hasLiveInterviewMedia(null),false);
  assert.equal(hasLiveInterviewMedia({camera:stream(['live'],[]),screen}),false);
  assert.equal(hasLiveInterviewMedia({camera:stream(['live'],['ended']),screen}),false);
  assert.equal(hasLiveInterviewMedia({camera:stream(['ended'],['live']),screen}),false);
  assert.equal(hasLiveInterviewMedia({camera:stream(['live'],['live']),screen:stream(['ended'],[])}),false);
  assert.equal(hasLiveInterviewMedia({camera:stream(['live'],['live']),screen}),true);
});
