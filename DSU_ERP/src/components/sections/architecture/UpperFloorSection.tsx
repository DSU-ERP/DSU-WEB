import type { DrawingSource } from '@/config/illustrationChapters';
import { DetailSection } from './DetailSection';
/** Edit the first exposed part here. Add your own JSX inside DetailSection. */
export function UpperFloorSection({ src }: { src: DrawingSource }) {
  return <DetailSection id="first-layer" number="02" label="The upper interior" title={<>Where possibility begins.</>} description="A closer look at the first exposed level of the institution." view="upper" src={src}>
    <div><h3>THE ACADEMIC JOURNEY</h3><p>From a first application to the next discovery.</p></div>
    <p className="detail-functions">Admissions <span>/</span> Academics <span>/</span> Examinations</p>
  </DetailSection>;
}
