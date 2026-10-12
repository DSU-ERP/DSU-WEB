import type { DrawingSource } from '@/config/illustrationChapters';
import { DetailSection } from './DetailSection';
/** Edit the second exposed part here, independently of the first section. */
export function LowerFloorSection({ src }: { src: DrawingSource }) {
  return <DetailSection id="second-layer" number="03" label="The lower interior" title={<>Every operation, connected.</>} description="Continue through the drawing to its second exposed level." view="lower" src={src}>
    <div><h3>THE LIFE OF THE INSTITUTION</h3><p>People, resources, and processes moving together.</p></div>
    <p className="detail-functions">Finance <span>/</span> Human resources <span>/</span> Campus operations</p>
  </DetailSection>;
}
