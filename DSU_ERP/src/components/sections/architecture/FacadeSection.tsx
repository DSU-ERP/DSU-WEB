import type { DrawingSource } from '@/config/illustrationChapters';
import { DetailSection } from './DetailSection';
/** The facade remains separately editable from the interior layers. */
export function FacadeSection({ src }: { src: DrawingSource }) {
  return <DetailSection id="facade-layer" number="01" label="The university facade" title={<>An institution of possibilities.</>} description="The familiar entrances, columns, and symmetrical wings of the university." view="facade" src={src}>
    <div><h3>ONE INSTITUTION</h3><p>A shared identity for every person, process, and possibility.</p></div>
    <p className="detail-functions">People <span>/</span> Purpose <span>/</span> Possibility</p>
  </DetailSection>;
}
