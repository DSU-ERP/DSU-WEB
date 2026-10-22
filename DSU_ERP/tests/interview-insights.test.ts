import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyNetwork,
  compareFeedback,
  createHealthMonitor,
  isScoredFeedback,
  qualityRank,
  questionLabels,
  scoredDimensions,
  sharingActive,
  tracksHealthy,
} from '../src/features/student/lib/interview-insights';

test('screen sharing fails only when the share ends, not when Chrome mutes it', () => {
  const live = { readyState: 'live', enabled: true, muted: false };
  assert.equal(sharingActive([{ ...live, muted: true }]), true, 'static or minimised content mutes the track');
  assert.equal(sharingActive([live]), true);
  assert.equal(sharingActive([{ ...live, readyState: 'ended' }]), false);
  assert.equal(sharingActive([]), false);
  assert.equal(sharingActive(undefined), false);
  // Camera and microphone still require an unmuted track.
  assert.equal(tracksHealthy([{ ...live, muted: true }]), false);
});

test('follow-ups share their parent question number in labels', () => {
  assert.deepEqual(
    questionLabels([{ parent: null }, { parent: 0 }, {}, { parent: null }, { parent: 3 }]),
    [
      { number: 1, followUp: false },
      { number: 1, followUp: true },
      { number: 2, followUp: false },
      { number: 3, followUp: false },
      { number: 3, followUp: true },
    ],
  );
  assert.deepEqual(questionLabels(undefined), []);
  // A malformed parent pointing forward is treated as a main question.
  assert.deepEqual(questionLabels([{ parent: 1 }, {}]).map((item) => item.number), [1, 2]);
});
import { joinSpeech, readyToSubmit, splitTranscript } from '../src/features/student/lib/speech-text';
import { chooseVoice } from '../src/shared/speech/voice';

const scores = (value: number, extra: Record<string, number> = {}) => ({
  overall: value, communication: value, confidence: value, accuracy: value,
  relevance: value, clarity: value, ...extra,
});

test('network probes are classified from measured throughput only', () => {
  assert.equal(classifyNetwork(null, false).state, 'offline');
  assert.equal(classifyNetwork({ bytes: 65536, ms: 1000 }, false).state, 'offline');
  assert.equal(classifyNetwork(null, true).state, 'checking');
  assert.equal(classifyNetwork({ bytes: 0, ms: 10 }, true).state, 'checking');
  const fast = classifyNetwork({ bytes: 65536, ms: 100 }, true);
  assert.deepEqual(fast, { state: 'good', label: '5.2 Mbps', mbps: 5.2, ms: 100 });
  const slow = classifyNetwork({ bytes: 65536, ms: 1000 }, true);
  assert.equal(slow.state, 'weak');
  assert.equal('mbps' in slow && slow.mbps, 0.5);
  assert.match(slow.label, /^Weak network/);
});

test('retry comparison covers dimensions scored in both answers and the quality change', () => {
  const original = { scores: scores(5), quality: 'Basic' };
  const retry = { scores: { ...scores(7), depth: 6 }, quality: 'Strong' };
  const result = compareFeedback(original, retry);
  assert.ok(result);
  assert.equal(result.quality.direction, 'up');
  assert.equal(result.dimensions.find(item => item.key === 'overall')?.change, 2);
  assert.equal(result.dimensions.some(item => item.key === 'depth'), false, 'depth was not scored originally');
  assert.equal(compareFeedback({ scores: scores(7), quality: 'Good' }, { scores: scores(6), quality: 'Good' })?.quality.direction, 'same');
  assert.equal(compareFeedback({ scores: scores(8), quality: 'Excellent' }, { scores: scores(6), quality: 'Good' })?.quality.direction, 'down');
  assert.equal(compareFeedback(original, { scores: scores(2), quality: 'Poor', turn: { kind: 'off-topic', scored: false, reason: '' } }), null);
  assert.equal(compareFeedback(null, retry), null);
});

test('scored feedback helpers keep legacy answers and order dimensions', () => {
  assert.equal(isScoredFeedback({ scores: scores(5) }), true);
  assert.equal(isScoredFeedback({ scores: scores(5), turn: { kind: 'clarification', scored: false, reason: '' } }), false);
  assert.equal(isScoredFeedback({}), false);
  assert.deepEqual(scoredDimensions({ scores: { overall: 6, communication: 7, confidence: 5, accuracy: 4 } }).map(item => item.key), ['overall', 'accuracy', 'communication', 'confidence']);
  assert.equal(qualityRank('Placement-ready'), 4);
  assert.equal(qualityRank('Excellent'), 4);
  assert.equal(qualityRank('Unknown'), null);
});

test('media health needs two consecutive failures and reports once per episode', () => {
  const live = { readyState: 'live', enabled: true, muted: false };
  assert.equal(tracksHealthy([live]), true);
  assert.equal(tracksHealthy([{ ...live, muted: true }]), false);
  assert.equal(tracksHealthy([{ ...live, enabled: false }]), false);
  assert.equal(tracksHealthy([{ ...live, readyState: 'ended' }]), false);
  assert.equal(tracksHealthy([]), false);
  assert.equal(tracksHealthy(undefined), false);
  const monitor = createHealthMonitor(2);
  assert.equal(monitor('mic', false), false);
  assert.equal(monitor('mic', false), true);
  assert.equal(monitor('mic', false), false, 'the same episode is not reported again');
  assert.equal(monitor('camera', false), false, 'sources are tracked separately');
  assert.equal(monitor('mic', true), false);
  assert.equal(monitor('mic', false), false);
  assert.equal(monitor('mic', false), true, 'a new episode after recovery is reported');
});

test('continuous speech combines settled and interim text', () => {
  const result = (transcript: string, isFinal: boolean) => Object.assign([{ transcript }], { isFinal });
  const { final, interim } = splitTranscript([result('I led the ', true), result('project', true), result(' and we', false)]);
  assert.equal(final, 'I led the project');
  assert.equal(interim, 'and we');
  assert.equal(joinSpeech('Earlier words', final, interim), 'Earlier words I led the project and we');
  assert.equal(joinSpeech('', '  ', ''), '');
  assert.equal(readyToSubmit('Too short'), false);
  assert.equal(readyToSubmit('I led the project'), true);
});

test('voice choice prefers the requested accent, then natural voices', () => {
  const voices = [
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Microsoft Ravi - English (India)', lang: 'en-IN' },
    { name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN' },
    { name: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', lang: 'en-GB' },
    { name: 'Daniel', lang: 'en_GB' },
  ];
  assert.equal(chooseVoice(voices, 'en-IN')?.name, 'Microsoft Neerja Online (Natural) - English (India)');
  assert.equal(chooseVoice(voices, 'en-GB')?.name, 'Microsoft Sonia Online (Natural) - English (United Kingdom)');
  assert.equal(chooseVoice(voices.slice(0, 1), 'en-GB')?.name, 'Google US English', 'falls back within the language');
  assert.equal(chooseVoice(voices, 'hi-IN'), null);
  assert.equal(chooseVoice([], 'en-IN'), null);
});
