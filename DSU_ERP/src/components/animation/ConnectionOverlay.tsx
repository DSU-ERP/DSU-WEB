const annotations = [
  { label: 'ADMISSIONS', x: 82, y: 245, nx: 260, ny: 298, side: 'left' },
  { label: 'ACADEMICS', x: 90, y: 445, nx: 260, ny: 435, side: 'left' },
  { label: 'EXAMINATIONS', x: 99, y: 601, nx: 300, ny: 535, side: 'left' },
  { label: 'FINANCE', x: 915, y: 232, nx: 742, ny: 294, side: 'right' },
  { label: 'HUMAN RESOURCES', x: 943, y: 431, nx: 758, ny: 427, side: 'right' },
  { label: 'CAMPUS OPERATIONS', x: 936, y: 598, nx: 708, ny: 526, side: 'right' },
  { label: 'AGENTIC AI', x: 505, y: 120, nx: 505, ny: 205, side: 'center' },
];
export function ConnectionOverlay({ compact = false }: { compact?: boolean }) {
  const notes = annotations.map(note => !compact ? note : note.side === 'left' ? { ...note, x: 190 } : note.side === 'right' ? { ...note, x: 810 } : { ...note, y: 15, ny: 80 });
  return <g className="connections" aria-hidden="true">
    <g data-ecosystem-paths fill="none" className="ecosystem-paths">
      <path data-draw-path pathLength="1" d="M260 298 L505 205 L742 294 L758 427 L708 526 L500 620 L300 535 L260 435 Z" />
      <path data-draw-path pathLength="1" d="M260 435 L505 350 L758 427 M505 205 L505 350 L500 620 M300 535 L505 450 L708 526" />
    </g>
    {notes.map((note, index) => <g key={note.label} data-annotation data-annotation-index={index} className={index === 2 || index === 4 || index === 5 ? 'annotation-secondary' : ''}>
      <path data-label-path pathLength="1" fill="none" d={note.side === 'center' ? 'M505 ' + (note.y + 20) + ' V' + note.ny : 'M' + (note.side === 'left' ? note.x : note.x - 8) + ' ' + (note.y + 13) + ' H' + (note.side === 'left' ? note.nx - 42 : note.nx + 42) + ' L' + note.nx + ' ' + note.ny} />
      <rect data-node x={note.nx - 3} y={note.ny - 3} width="6" height="6" />
      <text x={note.x} y={note.y} textAnchor={note.side === 'right' ? 'end' : note.side === 'center' ? 'middle' : 'start'}>[ {note.label} ]</text>
    </g>)}
  </g>;
}
