export const DESIGN = { background: '#FAFAF8', secondary: '#F3F3F0', text: '#151515', muted: '#737373', guide: '#D7D7D4', accent: '#F5CF1D' } as const;
export const CAPABILITIES = [
  { name: 'Admissions', detail: 'The beginning of every student journey.', category: 'STUDENT LIFECYCLE' },
  { name: 'Academics', detail: 'Learning, teaching, and academic progress.', category: 'ACADEMIC WORKFLOWS' },
  { name: 'Examinations', detail: 'Assessment as part of the bigger picture.', category: 'ACADEMIC WORKFLOWS' },
  { name: 'Finance', detail: 'Financial operations in institutional context.', category: 'INSTITUTIONAL OPERATIONS' },
  { name: 'Human resources', detail: 'The people behind the institution.', category: 'FACULTY & STAFF' },
  { name: 'Campus operations', detail: 'The services that keep a campus moving.', category: 'CAMPUS SERVICES' },
] as const;
