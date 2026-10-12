export const PHASES = {
  introduction: { start: 0, end: 0.16 },
  separation: { start: 0.16, end: 0.42 },
  intelligence: { start: 0.42, end: 0.63 },
  connections: { start: 0.63, end: 0.77 },
  reassembly: { start: 0.77, end: 0.92 },
  reveal: { start: 0.92, end: 1 },
} as const;
export const MOTION = { scrollScreens: 6, mobileScrollScreens: 4.8, scrub: 0.65, textFade: 0.023, mobileSeparation: 0.66 } as const;
export const SCENES = [
  { id: 'institution', number: '01', label: 'The institution', start: 0, eyebrow: '[ INTRODUCING DSU AGENTIC ERP ]', lines: ['ONE CAMPUS.', 'INFINITE POSSIBILITIES.'], description: 'An intelligent operating system for the modern university.' },
  { id: 'separation', number: '02', label: 'The architecture', start: 0.16, eyebrow: '[ A CLOSER LOOK ]', lines: ['BENEATH EVERY', 'CAMPUS, A', 'CONNECTED SYSTEM.'], description: 'Discover the intelligence behind every institutional operation.' },
  { id: 'intelligence', number: '03', label: 'The intelligence', start: 0.42, eyebrow: '[ THE INTELLIGENCE INSIDE ]', lines: ['EVERY FUNCTION.', 'ONE INTELLIGENCE.'], description: 'Connecting the academic, administrative, and operational life of the university.' },
  { id: 'ecosystem', number: '04', label: 'The ecosystem', start: 0.63, eyebrow: '[ DESIGNED TO WORK TOGETHER ]', lines: ['TWELVE', 'INTELLIGENT AGENTS.', 'ONE CONNECTED', 'CAMPUS.'], description: 'Independent capabilities. Unified institutional intelligence.' },
  { id: 'reassembly', number: '05', label: 'The convergence', start: 0.77, eyebrow: '[ THE POWER OF CONNECTION ]', lines: ['MANY SYSTEMS.', 'ONE UNIVERSITY.'], description: 'The power of every operation, united.' },
  { id: 'reveal', number: '06', label: 'A new beginning', start: 0.92, eyebrow: '[ ONE UNIFIED PLATFORM ]', lines: ['DSU', 'AGENTIC ERP'], description: 'One unified platform for the people, processes, and possibilities of higher education.' },
] as const;
export function sceneAtProgress(progress: number) {
  const value = Math.max(0, Math.min(1, progress));
  return Math.max(0, SCENES.findLastIndex(scene => value >= scene.start));
}
