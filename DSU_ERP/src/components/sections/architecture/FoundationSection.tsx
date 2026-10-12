import type { DrawingSource } from '@/config/illustrationChapters';
import { DetailSection } from './DetailSection';
/** Edit the foundation section here. The original structural base stays intact. */
export function FoundationSection({ src }: { src: DrawingSource }) {
  return <DetailSection id="foundation-layer" number="04" label="The foundation" title={<>Built on shared intelligence.</>} description="The structural base that supports every part of the institution." view="foundation" src={src}>
    <div><h3>ONE CONNECTED ECOSYSTEM</h3><p>A common foundation for institutional possibility.</p></div>
    <p className="detail-functions">Agentic intelligence <span>/</span> Connected information</p>
  </DetailSection>;
}
